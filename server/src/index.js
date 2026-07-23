/**
 * Cuanto API — auth OTP (SMTP + Evolution) + agent on VPS.
 * Routes: /api/auth/*, /api/whatsapp/*, /api/agent, /healthz
 */
const express = require('express')
const cors = require('cors')
const {
  normalizeEmail,
  normalizePhone,
  isMasterEmail,
  generateCode,
  encryptPayload,
  decryptPayload,
  signSession,
  verifySession,
  sendEmailSmtp,
  otpEmailHtml,
} = require('./authShared')
const evolution = require('./evolution')
const accounts = require('./accounts')

const app = express()
const PORT = Number(process.env.PORT || 3000)

function masterNotifyEmail() {
  return (
    process.env.MASTER_EMAILS?.split(',')
      .map((e) => e.trim())
      .filter(Boolean)[0] || ''
  )
}

app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.get('/healthz', (_req, res) => {
  res.type('text').send('ok\n')
})

app.get('/api/healthz', async (_req, res) => {
  const evoOk = evolution.whatsappConfigured()
  let resolved = null
  if (evoOk) {
    resolved = await evolution.resolveInstance().catch(() => null)
  }
  res.json({
    ok: true,
    service: 'cuanto-api',
    smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    evolution: evoOk,
    instance: resolved?.instance || evolution.evolutionInstance() || null,
    owner: resolved?.owner || null,
  })
})

function requireMaster(req, res) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const session = verifySession(token)
  if (!session) {
    res.status(401).json({ ok: false, error: 'Sesión inválida' })
    return null
  }
  if (session.role !== 'master') {
    res.status(403).json({ ok: false, error: 'Solo master' })
    return null
  }
  return session
}

app.get('/api/whatsapp/status', async (req, res) => {
  if (!requireMaster(req, res)) return
  const status = await evolution.getConnectionState()
  return res.json({
    ok: status.ok,
    ...status,
  })
})

app.get('/api/whatsapp/qr', async (req, res) => {
  if (!requireMaster(req, res)) return
  const qr = await evolution.getConnectQr()
  const status = qr.ok ? 200 : qr.error === 'not_configured' ? 503 : 502
  return res.status(status).json(qr)
})

app.post('/api/whatsapp/logout', async (req, res) => {
  if (!requireMaster(req, res)) return
  const out = await evolution.logoutInstance()
  return res.status(out.ok ? 200 : 502).json(out)
})

app.get('/api/whatsapp/instances', async (req, res) => {
  if (!requireMaster(req, res)) return
  const listed = await evolution.fetchInstances()
  return res.status(listed.ok ? 200 : 502).json(listed)
})

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const body = req.body || {}
    const channel = String(body.channel || '').toLowerCase() === 'whatsapp' ? 'whatsapp' : 'email'
    const showDev = process.env.AUTH_DEV_SHOW_CODE === '1'
    const code = generateCode()
    const exp = Date.now() + 5 * 60 * 1000

    if (channel === 'email') {
      const email = normalizeEmail(body.email)
      if (!email) return res.status(400).json({ ok: false, error: 'email_requerido' })
      if (!isMasterEmail(email)) {
        return res.status(403).json({ ok: false, error: 'Email no autorizado para master' })
      }

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
        if (showDev) {
          return res.json({
            ok: true,
            channel: 'email',
            challenge,
            message: `SMTP falló — código de depuración (AUTH_DEV_SHOW_CODE): ${code}`,
            warning: msg,
            devCode: code,
          })
        }
        return res.status(503).json({
          ok: false,
          error: `No se pudo enviar el correo (${msg}). Configurá SMTP_* en el servidor.`,
        })
      }

      return res.json({
        ok: true,
        channel: 'email',
        challenge,
        message: `Código enviado a ${email}`,
        ...(showDev ? { devCode: code } : {}),
      })
    }

    const phone = normalizePhone(body.phone)
    if (phone.length < 10) return res.status(400).json({ ok: false, error: 'Teléfono inválido' })

    const name = String(body.name || '').trim().slice(0, 60)
    const wantMaster = Boolean(body.asMaster) || String(body.role || '').toLowerCase() === 'master'
    const masterMail = masterNotifyEmail()

    if (wantMaster) {
      if (!accounts.canClaimMaster(phone)) {
        return res.status(403).json({
          ok: false,
          error:
            'Este número no es master. Solo el primer teléfono o los de MASTER_PHONES pueden configurar Evolution.',
        })
      }

      const challenge = encryptPayload({
        channel: 'whatsapp',
        sub: phone,
        role: 'master',
        phone,
        name,
        code,
        exp,
      })

      const text = `🔐 *Cuanto Master*\nTu código es: *${code}*\n\nExpira en 5 minutos.`
      const evoState = await evolution.getConnectionState().catch(() => ({ connected: false }))
      let sentWa = { ok: false, error: 'not_connected' }
      if (evoState.connected) {
        sentWa = await evolution.sendText(phone, text)
      }

      let mailed = false
      if (masterMail) {
        try {
          await sendEmailSmtp({
            to: masterMail,
            subject: `Cuanto Master OTP · ${phone}`,
            html:
              otpEmailHtml(code) +
              `<p>Master por teléfono <b>+${phone}</b>${name ? ` · ${name}` : ''}.</p>` +
              (sentWa.ok
                ? '<p>También se envió por WhatsApp (Evolution).</p>'
                : '<p>Evolution aún no conectado — usá este código y escaneá el QR.</p>'),
          })
          mailed = true
        } catch {
          /* ignore */
        }
      }

      if (sentWa.ok || mailed || showDev) {
        return res.json({
          ok: true,
          channel: 'whatsapp',
          challenge,
          message: sentWa.ok
            ? 'Código master enviado por WhatsApp'
            : mailed
              ? `Código enviado a ${masterMail}. Entrá y escaneá el QR de Evolution.`
              : `Bootstrap master. Código: ${code}`,
          ...(showDev || (!sentWa.ok && !mailed) ? { devCode: code } : {}),
          warning: sentWa.ok ? undefined : sentWa.error || evoState.error,
        })
      }

      return res.status(503).json({
        ok: false,
        error:
          'No se pudo enviar OTP master. Configurá SMTP_* (correo master) para el primer acceso, o conectá Evolution.',
      })
    }

    // Tenant: requiere Evolution conectado (o SMTP fallback al master para reenvío)
    const challenge = encryptPayload({
      channel: 'whatsapp',
      sub: phone,
      role: 'tenant',
      name,
      code,
      exp,
    })

    const text = `🔐 *Cuanto*\nTu código de acceso es: *${code}*\n\nExpira en 5 minutos.`
    const business = await evolution.connectedOwner()
    const confirmUrl = business
      ? `https://wa.me/${business}?text=${encodeURIComponent(`Hola, soy ${name || phone}. Solicito acceso a Cuanto.`)}`
      : ''

    const sent = await evolution.sendText(phone, text)
    if (sent.ok) {
      if (masterMail) {
        try {
          await sendEmailSmtp({
            to: masterMail,
            subject: `Cuanto OTP WhatsApp · ${phone}`,
            html: otpEmailHtml(code) + `<p>Tel: ${phone} · ${name || '—'}</p>`,
          })
        } catch {
          /* optional */
        }
      }
      return res.json({
        ok: true,
        channel: 'whatsapp',
        challenge,
        message: 'Código enviado por WhatsApp (Evolution)',
        ...(showDev ? { devCode: code } : {}),
      })
    }

    let mailed = false
    if (masterMail) {
      try {
        await sendEmailSmtp({
          to: masterMail,
          subject: `Cuanto — OTP para ${phone}`,
          html: `<p>Cliente <b>${name || phone}</b> pide acceso.</p>${otpEmailHtml(code)}<p>Evolution: ${sent.error || 'offline'}.</p>`,
        })
        mailed = true
      } catch {
        /* ignore */
      }
    }

    if (showDev || mailed) {
      return res.json({
        ok: true,
        channel: 'whatsapp',
        challenge,
        message: mailed
          ? 'Evolution no envió el mensaje. El master recibió el código por correo.'
          : `SMTP/Evolution incompletos. Código de depuración: ${code}`,
        confirmUrl: confirmUrl || undefined,
        warning: sent.error || sent.detail,
        ...(showDev || !mailed ? { devCode: code } : {}),
      })
    }

    return res.status(503).json({
      ok: false,
      error: `WhatsApp/Evolution no disponible (${sent.error || 'error'}). El master debe escanear el QR primero.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ ok: false, error: msg })
  }
})

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const challenge = String(req.body?.challenge || '')
    const code = String(req.body?.code || '').trim()
    if (!challenge || !code) {
      return res.status(400).json({ ok: false, error: 'challenge_y_codigo_requeridos' })
    }

    let payload
    try {
      payload = decryptPayload(challenge)
    } catch {
      return res.status(401).json({ ok: false, error: 'Challenge inválido' })
    }

    if (!payload?.exp || Date.now() > payload.exp) {
      return res.status(401).json({ ok: false, error: 'Código expirado' })
    }
    if (String(payload.code) !== code) {
      return res.status(401).json({ ok: false, error: 'Código inválido' })
    }

    const role = payload.role === 'master' ? 'master' : 'tenant'
    const owner = (await evolution.connectedOwner().catch(() => '')) || ''
    const phone =
      normalizePhone(payload.phone || (role === 'tenant' || payload.channel === 'whatsapp' ? payload.sub : '')) ||
      ''
    const email =
      role === 'master' && payload.channel === 'email'
        ? normalizeEmail(payload.sub)
        : masterNotifyEmail()

    const existing = phone ? accounts.findByPhone(phone) : null
    const plan =
      role === 'master' ? 'pro' : existing?.plan === 'pro' ? 'pro' : 'free'

    const acc = accounts.upsertAccount({
      phone: phone || undefined,
      email: email || undefined,
      name: payload.name || '',
      role,
      plan,
    })

    const session = {
      role,
      sub: phone || payload.sub,
      email: email || acc.email || undefined,
      phone: phone || undefined,
      name: payload.name || acc.name || '',
      plan,
      whatsappBusiness: owner,
      evoReady: role === 'master' ? Boolean(owner) : false,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      iat: Date.now(),
    }

    const token = signSession(session)
    return res.json({ ok: true, token, session: publicSession(session) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ ok: false, error: msg })
  }
})

app.post('/api/auth/session', async (req, res) => {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const session = verifySession(token)
    if (!session) return res.status(401).json({ ok: false, error: 'Sesión inválida' })

    const action = String(req.body?.action || '')

    if (action === 'set_whatsapp' || action === 'mark_evo_ready') {
      if (session.role !== 'master') return res.status(403).json({ ok: false, error: 'Solo master' })
      const owner =
        normalizePhone(req.body?.phone) ||
        (await evolution.connectedOwner().catch(() => '')) ||
        session.whatsappBusiness ||
        ''
      const next = {
        ...session,
        phone: session.phone || owner,
        whatsappBusiness: owner,
        evoReady: true,
      }
      if (next.phone) {
        accounts.upsertAccount({
          phone: next.phone,
          email: next.email,
          name: next.name,
          role: 'master',
          plan: 'pro',
        })
      }
      const newToken = signSession(next)
      return res.json({ ok: true, token: newToken, session: publicSession(next) })
    }

    if (action === 'set_plan') {
      if (session.role !== 'master') return res.status(403).json({ ok: false, error: 'Solo master' })
      const phone = normalizePhone(req.body?.phone)
      const plan = req.body?.plan === 'pro' ? 'pro' : 'free'
      if (!phone) return res.status(400).json({ ok: false, error: 'Teléfono requerido' })
      const acc = accounts.setPlan(phone, plan)
      const grant = signSession({
        type: 'pro_grant',
        phone,
        plan,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        iat: Date.now(),
      })
      return res.json({ ok: true, grant, phone, plan, account: accounts.publicAccount(acc) })
    }

    if (action === 'apply_grant') {
      const grantToken = String(req.body?.grant || '')
      const grant = verifySession(grantToken)
      if (!grant || grant.type !== 'pro_grant') {
        return res.status(401).json({ ok: false, error: 'Grant inválido' })
      }
      if (session.role !== 'tenant') return res.status(403).json({ ok: false, error: 'Solo tenant' })
      if (normalizePhone(session.phone) !== normalizePhone(grant.phone)) {
        return res.status(403).json({ ok: false, error: 'El grant no corresponde a este número' })
      }
      const plan = grant.plan === 'pro' ? 'pro' : 'free'
      accounts.setPlan(normalizePhone(session.phone), plan)
      const next = { ...session, plan }
      const newToken = signSession(next)
      return res.json({ ok: true, token: newToken, session: publicSession(next) })
    }

    if (action === 'set_own_plan') {
      const plan = req.body?.plan === 'pro' ? 'pro' : 'free'
      if (session.phone) accounts.setPlan(normalizePhone(session.phone), plan)
      const next = { ...session, plan }
      const newToken = signSession(next)
      return res.json({ ok: true, token: newToken, session: publicSession(next) })
    }

    if (action === 'me') {
      return res.json({ ok: true, session: publicSession(session) })
    }

    return res.status(400).json({ ok: false, error: 'action_desconocida' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ ok: false, error: msg })
  }
})

app.get('/api/admin/accounts', (req, res) => {
  if (!requireMaster(req, res)) return
  const list = accounts.listAccounts().map(accounts.publicAccount)
  return res.json({ ok: true, accounts: list, total: list.length })
})

app.post('/api/admin/accounts/plan', (req, res) => {
  if (!requireMaster(req, res)) return
  const phone = normalizePhone(req.body?.phone)
  const plan = req.body?.plan === 'pro' ? 'pro' : 'free'
  if (!phone) return res.status(400).json({ ok: false, error: 'Teléfono requerido' })
  const acc = accounts.setPlan(phone, plan)
  return res.json({ ok: true, account: accounts.publicAccount(acc) })
})

const CUANTO_KNOWLEDGE = `
Eres Cuanto Guide, el asistente oficial de Cuanto (Renace Tech).
Ayudás a controlar ingresos, gastos, metas y ahorro. Español claro. Máx 3 párrafos.
`.trim()

app.post('/api/agent', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim()
    if (!message) return res.status(400).json({ error: 'empty_message' })

    const key = (process.env.GEMINI_API_KEY || '').trim()
    const context = req.body?.context ? JSON.stringify(req.body.context) : '{}'
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : []

    if (!key) {
      return res.json({
        reply: 'Falta GEMINI_API_KEY en el servidor. Usá la guía local por ahora.',
        ai: false,
      })
    }

    const contents = [
      ...history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content) }],
        })),
      { role: 'user', parts: [{ text: message }] },
    ]

    for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `${CUANTO_KNOWLEDGE}\n\n## Contexto\n${context}` }],
            },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          }),
        })
        if (!gRes.ok) continue
        const data = await gRes.json()
        const reply =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim() || ''
        if (reply) return res.json({ reply, ai: true, model })
      } catch {
        /* try next */
      }
    }

    return res.json({ reply: 'No pude consultar Gemini. Reintentá en un momento.', ai: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
})

function publicSession(s) {
  return {
    role: s.role,
    email: s.email,
    phone: s.phone,
    name: s.name,
    plan: s.plan,
    whatsappBusiness: s.whatsappBusiness || '',
    evoReady: Boolean(s.evoReady || s.whatsappBusiness),
    exp: s.exp,
  }
}

app.listen(PORT, () => {
  console.log(`cuanto-api listening on :${PORT}`)
})
