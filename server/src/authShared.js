/**
 * Shared auth helpers for Cuanto Netlify functions.
 * OTP challenge is encrypted (stateless) so it works across warm/cold starts.
 */
const crypto = require('crypto')

const MASTER_EMAILS = (process.env.MASTER_EMAILS || 'info@renace.tech')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function secret() {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || 'cuanto-dev-secret-change-me'
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json',
  }
}

function ok(body, status = 200) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(body) }
}

function err(message, status = 400) {
  return ok({ ok: false, error: message }, status)
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function isMasterEmail(email) {
  return MASTER_EMAILS.includes(normalizeEmail(email))
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999))
}

function encryptPayload(obj) {
  const key = crypto.createHash('sha256').update(secret()).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const json = Buffer.from(JSON.stringify(obj), 'utf8')
  const enc = Buffer.concat([cipher.update(json), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

function decryptPayload(token) {
  const raw = Buffer.from(token, 'base64url')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const key = crypto.createHash('sha256').update(secret()).digest()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const json = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  return JSON.parse(json)
}

function signSession(session) {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifySession(token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expect = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expect)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!session?.exp || Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
}

async function sendEmailSmtp({ to, subject, html }) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || 'Cuanto <info@renace.tech>'

  if (!host || !user || !pass) {
    throw new Error('smtp_not_configured')
  }

  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({ from, to, subject, html })
}

function otpEmailHtml(code) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
    <h2 style="color:#1f5a3e;margin:0 0 8px">Cuanto</h2>
    <p style="color:#5f7268;font-size:14px">Código de verificación</p>
    <div style="background:#f0f4f1;border-radius:12px;padding:28px;text-align:center">
      <p style="margin:0 0 12px;color:#1c2b23">Tu código es:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1f5a3e">${code}</div>
      <p style="margin:12px 0 0;font-size:12px;color:#9aa">Expira en 5 minutos</p>
    </div>
  </div>`
}

module.exports = {
  MASTER_EMAILS,
  corsHeaders,
  ok,
  err,
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
  secret,
}
