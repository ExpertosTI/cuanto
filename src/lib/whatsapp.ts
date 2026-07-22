export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Dominican default: if user types 809… without country code, prefix 1 */
export function toWhatsAppNumber(phone: string, countryCode = 'DO'): string {
  let digits = normalizePhone(phone)
  if (countryCode === 'DO') {
    if (digits.length === 10) digits = `1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) {
      /* ok */
    }
  }
  return digits
}

export function whatsappChatUrl(phone: string, message: string): string {
  const n = toWhatsAppNumber(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}

export function inviteJoinUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cuanto.app'
  return `${origin}/unirse/${token}`
}

export function inviteWhatsAppMessage(orgName: string, joinUrl: string): string {
  return `Hola 👋 me invitan a *${orgName}* en Cuanto.\nÚnete aquí: ${joinUrl}`
}

export function memberQrPayload(orgId: string, code: string): string {
  return `cuanto://member/${orgId}/${code}`
}

export function parseQrPayload(raw: string): {
  type: 'invite' | 'member' | 'url' | 'unknown'
  token?: string
  orgId?: string
  code?: string
  url?: string
} {
  const value = raw.trim()

  if (value.startsWith('cuanto://member/')) {
    const parts = value.replace('cuanto://member/', '').split('/')
    return { type: 'member', orgId: parts[0], code: parts[1] }
  }

  try {
    const url = new URL(value)
    const match = url.pathname.match(/\/unirse\/([^/]+)/)
    if (match) return { type: 'invite', token: match[1], url: value }
    return { type: 'url', url: value }
  } catch {
    if (/^[a-zA-Z0-9_-]{6,}$/.test(value)) {
      return { type: 'invite', token: value }
    }
    return { type: 'unknown' }
  }
}

export function randomToken(len = 10): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
