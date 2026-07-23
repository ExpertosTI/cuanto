const {
  ok,
  err,
  corsHeaders,
  normalizeEmail,
  normalizePhone,
  decryptPayload,
  signSession,
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

  const challenge = String(body.challenge || '')
  const code = String(body.code || '').trim()
  if (!challenge || !code) return err('challenge_y_codigo_requeridos')

  let payload
  try {
    payload = decryptPayload(challenge)
  } catch {
    return err('Challenge inválido', 401)
  }

  if (!payload?.exp || Date.now() > payload.exp) return err('Código expirado', 401)
  if (String(payload.code) !== code) return err('Código inválido', 401)

  const role = payload.role === 'master' ? 'master' : 'tenant'
  const session = {
    role,
    sub: payload.sub,
    email: role === 'master' ? normalizeEmail(payload.sub) : undefined,
    phone: role === 'tenant' ? normalizePhone(payload.sub) : undefined,
    name: payload.name || '',
    plan: role === 'master' ? 'pro' : 'free',
    whatsappBusiness: '',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    iat: Date.now(),
  }

  const token = signSession(session)
  return ok({
    ok: true,
    token,
    session: {
      role: session.role,
      email: session.email,
      phone: session.phone,
      name: session.name,
      plan: session.plan,
      whatsappBusiness: session.whatsappBusiness,
      exp: session.exp,
    },
  })
}
