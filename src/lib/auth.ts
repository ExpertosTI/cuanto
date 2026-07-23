export type AuthRole = 'master' | 'tenant'

export interface AuthSession {
  role: AuthRole
  email?: string
  phone?: string
  name?: string
  plan: 'free' | 'pro'
  whatsappBusiness?: string
  exp: number
}

const AUTH_KEY = 'cuanto-auth-v1'
const TOKEN_KEY = 'cuanto-auth-token'

function authBase() {
  const configured = (import.meta.env.VITE_AUTH_URL || '').trim().replace(/\/$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) {
    return ''
  }
  return ''
}

function endpoint(path: string) {
  const base = authBase()
  if (base) return `${base}${path}`
  // Same-origin Netlify redirects
  if (path.startsWith('/api/')) return path
  return `/.netlify/functions/${path.replace(/^\//, '')}`
}

export function loadAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AuthSession
    if (!s?.exp || Date.now() > s.exp) {
      clearAuth()
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveAuth(token: string, session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_KEY)
}

export function isAuthConfigured() {
  // Local/dev fallback always available via functions or local OTP
  return true
}

/** Dev/local OTP when Netlify auth is unreachable */
function localChallenge(payload: Record<string, unknown>) {
  const json = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  return `local.${json}`
}

function parseLocalChallenge(challenge: string) {
  if (!challenge.startsWith('local.')) return null
  try {
    return JSON.parse(decodeURIComponent(escape(atob(challenge.slice(6))))) as {
      channel: string
      sub: string
      role: AuthRole
      code: string
      exp: number
      name?: string
    }
  } catch {
    return null
  }
}

export async function requestEmailOtp(email: string) {
  const path = endpoint('/api/auth/request-otp')
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'email', email }),
    })
    if (res.ok) return (await res.json()) as RequestOtpResult
  } catch {
    /* fall through to local */
  }

  const master = (import.meta.env.VITE_MASTER_EMAIL || 'info@renace.tech').toLowerCase()
  if (email.trim().toLowerCase() !== master) {
    return { ok: false, error: 'Email no autorizado para master' }
  }
  const code = '249731'
  const challenge = localChallenge({
    channel: 'email',
    sub: master,
    role: 'master',
    code,
    exp: Date.now() + 5 * 60 * 1000,
  })
  return {
    ok: true,
    channel: 'email' as const,
    challenge,
    message: `Modo local: código enviado a ${master} (usa ${code} si no hay SMTP)`,
    devCode: code,
  }
}

export async function requestWhatsAppOtp(phone: string, name = '') {
  const path = endpoint('/api/auth/request-otp')
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'whatsapp', phone, name }),
    })
    if (res.ok) return (await res.json()) as RequestOtpResult
  } catch {
    /* local */
  }

  const code = String(100000 + Math.floor(Math.random() * 900000))
  const digits = phone.replace(/\D/g, '')
  const challenge = localChallenge({
    channel: 'whatsapp',
    sub: digits,
    role: 'tenant',
    name,
    code,
    exp: Date.now() + 5 * 60 * 1000,
  })
  const business = (import.meta.env.VITE_WHATSAPP_BUSINESS || '').replace(/\D/g, '')
  const confirmUrl = business
    ? `https://wa.me/${business}?text=${encodeURIComponent(`Hola, soy ${name || digits}. Mi código local Cuanto es ${code}`)}`
    : ''
  return {
    ok: true,
    channel: 'whatsapp' as const,
    challenge,
    message: 'Modo local: confirmá por WhatsApp o usá el código mostrado.',
    confirmUrl,
    devCode: code,
  }
}

export async function verifyOtp(challenge: string, code: string) {
  const local = parseLocalChallenge(challenge)
  if (local) {
    if (Date.now() > local.exp) return { ok: false, error: 'Código expirado' }
    if (local.code !== code.trim()) return { ok: false, error: 'Código inválido' }
    const session: AuthSession = {
      role: local.role,
      email: local.role === 'master' ? local.sub : undefined,
      phone: local.role === 'tenant' ? local.sub : undefined,
      name: local.name || '',
      plan: local.role === 'master' ? 'pro' : 'free',
      whatsappBusiness: '',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }
    const token = `local-session.${btoa(unescape(encodeURIComponent(JSON.stringify(session))))}`
    saveAuth(token, session)
    return { ok: true, token, session }
  }

  const path = endpoint('/api/auth/verify-otp')
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge, code }),
  })
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    token?: string
    session?: AuthSession
  }
  if (!res.ok || !data.ok || !data.token || !data.session) {
    return { ok: false, error: data.error || 'No se pudo verificar' }
  }
  saveAuth(data.token, data.session)
  return { ok: true, token: data.token, session: data.session }
}

export async function updateAuthSession(action: string, body: Record<string, unknown> = {}) {
  const token = loadAuthToken()
  if (!token) return { ok: false, error: 'Sin sesión' }

  if (token.startsWith('local-session.')) {
    const session = loadAuthSession()
    if (!session) return { ok: false, error: 'Sin sesión' }
    if (action === 'set_whatsapp') {
      const phone = String(body.phone || '').replace(/\D/g, '')
      const next = { ...session, whatsappBusiness: phone }
      saveAuth(token, next)
      return { ok: true, session: next }
    }
    if (action === 'set_own_plan') {
      const plan = body.plan === 'pro' ? 'pro' : 'free'
      const next = { ...session, plan: plan as 'free' | 'pro' }
      saveAuth(token, next)
      return { ok: true, session: next }
    }
    return { ok: true, session }
  }

  const path = endpoint('/api/auth/session')
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  })
  const data = (await res.json()) as {
    ok?: boolean
    error?: string
    token?: string
    session?: AuthSession
    grant?: string
  }
  if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Error' }
  if (data.token && data.session) saveAuth(data.token, data.session)
  return data
}

export interface RequestOtpResult {
  ok: boolean
  error?: string
  channel?: 'email' | 'whatsapp'
  challenge?: string
  message?: string
  confirmUrl?: string
  devCode?: string
  warning?: string
}
