const {
  ok,
  err,
  corsHeaders,
  normalizeEmail,
  normalizePhone,
  isMasterEmail,
  generateCode,
  encryptPayload,
  sendEmailSmtp,
  otpEmailHtml,
  sendWhatsAppCloud,
} = require('./_authShared')

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') return err('method_not_allowed', 405)

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return err('bad_json')
  }

  const channel = String(body.channel || '').toLowerCase() === 'whatsapp' ? 'whatsapp' : 'email'
  const showDev = process.env.AUTH_DEV_SHOW_CODE === '1'
  const code = generateCode()
  const exp = Date.now() + 5 * 60 * 1000

  if (channel === 'email') {
    const email = normalizeEmail(body.email)
    if (!email) return err('email_requerido')
    if (!isMasterEmail(email)) return err('Email no autorizado para master', 403)

    const challenge = encryptPayload({
      channel: 'email',
      sub: email,
      role: 'master',
      code,
      exp,
    })

    try {
      await sendEmailSmtp({
        to: email,
        subject: 'Cuanto — código de acceso',
        html: otpEmailHtml(code),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (showDev || msg.includes('smtp_not_configured') || msg.includes('nodemailer_missing')) {
        return ok({
          ok: true,
          channel: 'email',
          challenge,
          message: `SMTP no listo — modo desarrollo. Código: ${code}`,
          devCode: code,
        })
      }
      return err(`No se pudo enviar el correo (${msg})`, 503)
    }

    return ok({
      ok: true,
      channel: 'email',
      challenge,
      message: `Código enviado a ${email}`,
      ...(showDev ? { devCode: code } : {}),
    })
  }

  // WhatsApp tenant / client
  const phone = normalizePhone(body.phone)
  if (phone.length < 10) return err('Teléfono inválido')

  const name = String(body.name || '').trim().slice(0, 60)
  const challenge = encryptPayload({
    channel: 'whatsapp',
    sub: phone,
    role: 'tenant',
    name,
    code,
    exp,
  })

  const text = `🔐 *Cuanto*\nTu código de acceso es: *${code}*\n\nExpira en 5 minutos.`

  try {
    await sendWhatsAppCloud({ toPhone: phone, text })
    // Copia al master por correo
    const master = process.env.MASTER_EMAILS?.split(',')[0]?.trim() || 'info@renace.tech'
    try {
      await sendEmailSmtp({
        to: master,
        subject: `Cuanto OTP WhatsApp · ${phone}`,
        html: otpEmailHtml(code) + `<p>Tel: ${phone} · ${name || '—'}</p>`,
      })
    } catch {
      /* optional */
    }
    return ok({
      ok: true,
      channel: 'whatsapp',
      challenge,
      message: 'Código enviado por WhatsApp',
      ...(showDev ? { devCode: code } : {}),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Fallback: avisar master por correo + deep link de confirmación
    const master = process.env.MASTER_EMAILS?.split(',')[0]?.trim() || 'info@renace.tech'
    let mailed = false
    try {
      await sendEmailSmtp({
        to: master,
        subject: `Cuanto — OTP para ${phone}`,
        html: `<p>Cliente <b>${name || phone}</b> pide acceso.</p>${otpEmailHtml(code)}<p>Reenviá este código por WhatsApp al cliente.</p>`,
      })
      mailed = true
    } catch {
      /* ignore */
    }

    const business = (process.env.VITE_WHATSAPP_BUSINESS || process.env.WHATSAPP_BUSINESS || '').replace(
      /\D/g,
      '',
    )
    const confirmUrl = business
      ? `https://wa.me/${business}?text=${encodeURIComponent(`Hola, soy ${name || phone}. Quiero mi código OTP de Cuanto.`)}`
      : ''

    if (showDev || mailed) {
      return ok({
        ok: true,
        channel: 'whatsapp',
        challenge,
        message: mailed
          ? 'WhatsApp API no configurada. El master recibió el código por correo para reenviártelo.'
          : `Modo desarrollo. Código: ${code}`,
        confirmUrl,
        warning: msg,
        ...(showDev || !mailed ? { devCode: code } : {}),
      })
    }

    return err(`WhatsApp no disponible (${msg}). Configurá WHATSAPP_TOKEN o SMTP.`, 503)
  }
}
