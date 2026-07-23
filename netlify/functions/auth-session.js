const { ok, err, corsHeaders, verifySession, signSession, normalizePhone } = require('./_authShared')

/** Actualiza sesión: WhatsApp business (master) o plan Pro (master activa tenant) */
exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') return err('method_not_allowed', 405)

  const auth = event.headers.authorization || event.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const session = verifySession(token)
  if (!session) return err('Sesión inválida', 401)

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return err('bad_json')
  }

  const action = String(body.action || '')

  if (action === 'set_whatsapp') {
    if (session.role !== 'master') return err('Solo master', 403)
    const phone = normalizePhone(body.phone)
    if (phone.length < 10) return err('Teléfono WhatsApp inválido')
    const next = { ...session, whatsappBusiness: phone }
    const newToken = signSession(next)
    return ok({
      ok: true,
      token: newToken,
      session: publicSession(next),
    })
  }

  if (action === 'set_plan') {
    if (session.role !== 'master') return err('Solo master', 403)
    const phone = normalizePhone(body.phone)
    const plan = body.plan === 'pro' ? 'pro' : 'free'
    // Devuelve un “grant” firmado que el cliente tenant puede canjear, o el master lo aplica localmente
    const grant = signSession({
      type: 'pro_grant',
      phone,
      plan,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      iat: Date.now(),
    })
    return ok({ ok: true, grant, phone, plan })
  }

  if (action === 'apply_grant') {
    const grantToken = String(body.grant || '')
    const grant = verifySession(grantToken)
    if (!grant || grant.type !== 'pro_grant') return err('Grant inválido', 401)
    if (session.role !== 'tenant') return err('Solo tenant', 403)
    if (normalizePhone(session.phone) !== normalizePhone(grant.phone)) {
      return err('El grant no corresponde a este número', 403)
    }
    const next = { ...session, plan: grant.plan === 'pro' ? 'pro' : 'free' }
    const newToken = signSession(next)
    return ok({ ok: true, token: newToken, session: publicSession(next) })
  }

  if (action === 'me') {
    return ok({ ok: true, session: publicSession(session) })
  }

  return err('action_desconocida')
}

function publicSession(s) {
  return {
    role: s.role,
    email: s.email,
    phone: s.phone,
    name: s.name,
    plan: s.plan,
    whatsappBusiness: s.whatsappBusiness || '',
    exp: s.exp,
  }
}
