/**
 * Evolution API — WhatsApp (mismo patrón Renace: PrestaPro / RNV)
 * Preferir URL interna en el VPS: http://evolution_api:8080
 * Público: https://evoapi.renace.tech (puede fallar por Cloudflare desde contenedor)
 */

function env(name, fallback = '') {
  const raw = process.env[name] ?? fallback
  return String(raw).trim().replace(/^["']|["']$/g, '')
}

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function normalizePhoneDigits(raw) {
  const d = digitsOnly(raw)
  if (!d) return ''
  if (d.length === 10) return `1${d}`
  if (d.length === 11 && d.startsWith('1')) return d
  return d
}

function whatsappConfigured() {
  return Boolean(env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'))
}

function evolutionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: env('EVOLUTION_API_KEY'),
  }
}

function evolutionBase() {
  return env('EVOLUTION_API_URL').replace(/\/$/, '')
}

function evolutionInstance() {
  return env('EVOLUTION_INSTANCE') || 'cuanto'
}

function expectedOwner() {
  return normalizePhoneDigits(env('WHATSAPP_BUSINESS') || env('VITE_WHATSAPP_BUSINESS') || '18494577463')
}

function sanitizeEvolutionDetail(text, status) {
  const raw = String(text || '').trim()
  const lower = raw.toLowerCase()
  if (
    lower.includes('cloudflare') ||
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    lower.includes('bad gateway')
  ) {
    return status === 502 || status === 503 || status === 520
      ? 'Evolution no respondió (gateway). En el VPS usá URL interna: http://evolution_api:8080'
      : 'Evolution devolvió HTML de proxy. Revisá EVOLUTION_API_URL.'
  }
  if (!raw) return status ? `HTTP ${status}` : 'Sin detalle'
  try {
    const j = JSON.parse(raw)
    const msg =
      j?.response?.message ||
      j?.message ||
      j?.error ||
      (Array.isArray(j?.response?.message) ? j.response.message.join(', ') : null)
    if (msg) return String(Array.isArray(msg) ? msg.join(', ') : msg).slice(0, 200)
  } catch {
    /* not JSON */
  }
  return raw.replace(/\s+/g, ' ').slice(0, 200)
}

function normalizeState(payload) {
  const raw =
    payload?.instance?.state ||
    payload?.state ||
    payload?.status ||
    payload?.connectionStatus ||
    ''
  const s = String(raw).toLowerCase()
  if (s.includes('open') || s === 'connected') return 'open'
  if (s.includes('connect') || s === 'qr' || s === 'pairing') return 'connecting'
  if (s.includes('close') || s === 'disconnected') return 'close'
  return s || 'unknown'
}

function extractQrBase64(payload) {
  const candidates = [
    payload?.base64,
    payload?.qrcode?.base64,
    payload?.qr?.base64,
    payload?.qrcode?.code,
    typeof payload?.qrcode === 'string' ? payload.qrcode : null,
  ].filter(Boolean)

  const raw = candidates[0]
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('data:image')) return raw
  if (raw.length > 100 && !raw.includes(' ')) {
    return `data:image/png;base64,${raw.replace(/^base64,/, '')}`
  }
  return null
}

const EVOLUTION_FETCH_MS = 20000

async function evolutionFetch(path, options = {}) {
  const url = `${evolutionBase()}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EVOLUTION_FETCH_MS)
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: evolutionHeaders(),
      body: options.body,
      signal: controller.signal,
    })
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = {}
    }
    return { res, text, data }
  } finally {
    clearTimeout(timer)
  }
}

function isAbortError(err) {
  return err?.name === 'AbortError' || /aborted|abort/i.test(String(err?.message || ''))
}

async function getConnectionState() {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'not_configured', state: 'unconfigured' }
  }
  const instance = evolutionInstance()
  try {
    const { res, text, data } = await evolutionFetch(
      `/instance/connectionState/${encodeURIComponent(instance)}`,
    )
    if (!res.ok) {
      return {
        ok: false,
        error: `http_${res.status}`,
        state: 'unknown',
        instance,
        detail: sanitizeEvolutionDetail(text, res.status),
      }
    }
    return {
      ok: true,
      state: normalizeState(data),
      instance,
      connected: normalizeState(data) === 'open',
      data,
    }
  } catch (err) {
    return {
      ok: false,
      error: isAbortError(err) ? 'timeout' : 'network_error',
      state: 'unknown',
      instance,
      detail: isAbortError(err)
        ? 'Timeout consultando Evolution. Preferí URL interna en el VPS.'
        : sanitizeEvolutionDetail(err.message || 'network_error'),
    }
  }
}

async function getConnectQr() {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      error: 'not_configured',
      message: 'Faltan EVOLUTION_API_URL, EVOLUTION_API_KEY o EVOLUTION_INSTANCE en el servidor.',
      expectedOwner: expectedOwner(),
    }
  }

  const instance = evolutionInstance()
  const expected = expectedOwner()
  const status = await getConnectionState()

  if (status.ok && status.connected) {
    return {
      ok: true,
      instance,
      state: 'open',
      connected: true,
      ownerOk: true,
      expectedOwner: expected,
      qrBase64: null,
      message: 'WhatsApp ya está conectado en Evolution. No hace falta escanear.',
    }
  }

  try {
    const { res, text, data } = await evolutionFetch(
      `/instance/connect/${encodeURIComponent(instance)}`,
    )
    if (!res.ok) {
      return {
        ok: false,
        error: `http_${res.status}`,
        instance,
        expectedOwner: expected,
        detail: sanitizeEvolutionDetail(text, res.status),
        message: sanitizeEvolutionDetail(text, res.status),
      }
    }

    const qrBase64 = extractQrBase64(data)
    const pairingCode =
      data?.pairingCode || data?.qrcode?.pairingCode || data?.code || null

    return {
      ok: true,
      instance,
      state: normalizeState(data) || 'connecting',
      connected: false,
      ownerOk: false,
      expectedOwner: expected,
      qrBase64,
      pairingCode,
      message: qrBase64
        ? `Escaneá con WhatsApp (+${expected}): Ajustes → Dispositivos vinculados → Vincular dispositivo`
        : 'Evolution no devolvió QR. Reintentá o revisá la instancia en evoapi.',
    }
  } catch (err) {
    return {
      ok: false,
      error: isAbortError(err) ? 'timeout' : 'network_error',
      instance,
      expectedOwner: expected,
      message: isAbortError(err)
        ? 'Timeout pidiendo QR. Usá EVOLUTION_API_URL interna (ej. http://evolution_api:8080).'
        : sanitizeEvolutionDetail(err.message || 'network_error'),
    }
  }
}

async function logoutInstance() {
  if (!whatsappConfigured()) return { ok: false, error: 'not_configured' }
  const instance = evolutionInstance()
  try {
    let { res, text } = await evolutionFetch(`/instance/logout/${encodeURIComponent(instance)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      ;({ res, text } = await evolutionFetch(`/instance/logout/${encodeURIComponent(instance)}`, {
        method: 'POST',
        body: '{}',
      }))
    }
    if (!res.ok) {
      return { ok: false, error: sanitizeEvolutionDetail(text, res.status) }
    }
    return { ok: true, message: 'Sesión WhatsApp desconectada. Pedí un QR nuevo.' }
  } catch (err) {
    return { ok: false, error: err.message || 'logout_failed' }
  }
}

async function sendText(to, text) {
  if (!whatsappConfigured()) return { ok: false, error: 'not_configured' }
  const phone = normalizePhoneDigits(to)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  const instance = evolutionInstance()

  const res = await fetch(
    `${evolutionBase()}/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({ number: phone, text }),
    },
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `http_${res.status}`, detail: sanitizeEvolutionDetail(detail, res.status) }
  }
  return { ok: true }
}

module.exports = {
  whatsappConfigured,
  normalizePhoneDigits,
  getConnectionState,
  getConnectQr,
  logoutInstance,
  sendText,
  expectedOwner,
  evolutionInstance,
}
