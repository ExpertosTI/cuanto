export type AuthRole = 'master' | 'tenant'

export interface AuthSession {
  role: AuthRole
  email?: string
  phone?: string
  name?: string
  plan: 'free' | 'pro'
  whatsappBusiness?: string
  /** Master ya vinculó Evolution (QR escaneado) */
  evoReady?: boolean
  exp: number
}

const AUTH_KEY = 'cuanto-auth-v1'
const TOKEN_KEY = 'cuanto-auth-token'

/** Same-origin on VPS (Traefik /api → cuanto-api). Optional absolute VITE_AUTH_URL. */
function authBase() {
  return (import.meta.env.VITE_AUTH_URL || '').trim().replace(/\/$/, '')
}

function endpoint(path: string) {
  const base = authBase()
  if (path.startsWith('/api/')) return `${base}${path}`
  return `${base}/api/${path.replace(/^\//, '')}`
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
  return true
}

async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(endpoint(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as RequestOtpResult & {
    token?: string
    session?: AuthSession
  }
  return { res, data }
}

export async function requestEmailOtp(email: string) {
  try {
    const { res, data } = await postJson('/api/auth/request-otp', {
      channel: 'email',
      email,
    })
    if (res.ok && data.ok) return data as RequestOtpResult
    return {
      ok: false,
      error: data.error || `OTP email falló (${res.status}). Revisá SMTP en cuanto-api.`,
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : 'No hay API de auth. Desplegá cuanto-api con SMTP (sin códigos inventados).',
    }
  }
}

export async function requestWhatsAppOtp(
  phone: string,
  name = '',
  opts: { asMaster?: boolean } = {},
) {
  try {
    const { res, data } = await postJson('/api/auth/request-otp', {
      channel: 'whatsapp',
      phone,
      name,
      ...(opts.asMaster ? { asMaster: true } : {}),
    })
    if (res.ok && data.ok) return data as RequestOtpResult
    return {
      ok: false,
      error:
        data.error ||
        `OTP WhatsApp falló (${res.status}). Conectá Evolution (QR) o revisá EVOLUTION_API_*.`,
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : 'No hay API. El OTP lo genera el servidor y lo envía Evolution — no hay modo local con datos inventados.',
    }
  }
}

export async function verifyOtp(challenge: string, code: string) {
  try {
    const { res, data } = await postJson('/api/auth/verify-otp', { challenge, code })
    if (!res.ok || !data.ok || !data.token || !data.session) {
      return { ok: false, error: data.error || 'No se pudo verificar' }
    }
    saveAuth(data.token, data.session)
    return { ok: true, token: data.token, session: data.session }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error de red al verificar OTP',
    }
  }
}

export async function updateAuthSession(action: string, body: Record<string, unknown> = {}) {
  const token = loadAuthToken()
  if (!token) return { ok: false, error: 'Sin sesión' }

  try {
    const res = await fetch(endpoint('/api/auth/session'), {
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
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error de red',
    }
  }
}

export interface RequestOtpResult {
  ok: boolean
  error?: string
  channel?: 'email' | 'whatsapp'
  challenge?: string
  message?: string
  confirmUrl?: string
  /** Solo si AUTH_DEV_SHOW_CODE=1 en el servidor (código real generado, no inventado fijo) */
  devCode?: string
  warning?: string
}
