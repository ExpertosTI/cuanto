/**
 * Evolution API — descubre instancia y número real (sin hardcode).
 * Patrón Renace (PrestaPro / Catagce): URL + API key; instancia vía fetchInstances.
 */

function env(name, fallback = '') {
  const raw = process.env[name] ?? fallback
  return String(raw).trim().replace(/^["']|["']$/g, '')
}

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function normalizePhoneDigits(raw) {
  let d = digitsOnly(raw)
  if (!d) return ''
  // ownerJid a veces trae :device → 1809xxxx:xx@s.whatsapp.net
  if (d.includes(':')) d = d.split(':')[0]
  if (d.length === 10) return `1${d}`
  if (d.length === 11 && d.startsWith('1')) return d
  return d
}

function whatsappConfigured() {
  return Boolean(env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY'))
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
      ? 'Evolution no respondió (gateway). En el VPS usá la URL interna del contenedor Evolution, no el dominio público.'
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
    if (msg) return String(Array.isArray(msg) ? msg.join(', ') : msg).slice(0, 220)
  } catch {
    /* not JSON */
  }
  return raw.replace(/\s+/g, ' ').slice(0, 220)
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

function extractInstanceName(item) {
  if (!item || typeof item !== 'object') return ''
  const nested = item.instance && typeof item.instance === 'object' ? item.instance : item
  return String(
    nested.instanceName ||
      nested.name ||
      item.instanceName ||
      item.name ||
      (typeof item.instance === 'string' ? item.instance : '') ||
      '',
  ).trim()
}

function extractOwnerFromItem(item) {
  if (!item || typeof item !== 'object') return ''
  const nested = item.instance && typeof item.instance === 'object' ? item.instance : item
  const raw =
    nested.ownerJid ||
    nested.owner ||
    nested.wuid ||
    nested.number ||
    nested.phone ||
    item.ownerJid ||
    item.owner ||
    ''
  return normalizePhoneDigits(String(raw).split('@')[0])
}

function extractStateFromItem(item) {
  if (!item || typeof item !== 'object') return 'unknown'
  const nested = item.instance && typeof item.instance === 'object' ? item.instance : item
  return normalizeState({
    state: nested.state || item.state,
    connectionStatus: nested.connectionStatus || item.connectionStatus,
    status: nested.status || item.status,
  })
}

function parseInstancesPayload(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.instance)) return data.instance
  if (data?.instance && typeof data.instance === 'object') return [data.instance]
  if (data && typeof data === 'object') return [data]
  return []
}

const EVOLUTION_FETCH_MS = 20000
/** Cache corta de instancia resuelta (nombre + teléfono) */
let cached = { at: 0, instance: '', owner: '', state: '' }

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

/** Lista instancias reales en evoapi */
async function fetchInstances() {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'not_configured', instances: [] }
  }
  try {
    const { res, text, data } = await evolutionFetch('/instance/fetchInstances')
    if (!res.ok) {
      return {
        ok: false,
        error: `http_${res.status}`,
        detail: sanitizeEvolutionDetail(text, res.status),
        instances: [],
      }
    }
    const list = parseInstancesPayload(data)
      .map((item) => {
        const name = extractInstanceName(item)
        if (!name) return null
        return {
          name,
          state: extractStateFromItem(item),
          owner: extractOwnerFromItem(item),
          raw: item,
        }
      })
      .filter(Boolean)
    return { ok: true, instances: list }
  } catch (err) {
    return {
      ok: false,
      error: isAbortError(err) ? 'timeout' : 'network_error',
      detail: isAbortError(err)
        ? 'Timeout listando instancias Evolution. Preferí URL interna en el VPS.'
        : sanitizeEvolutionDetail(err.message || 'network_error'),
      instances: [],
    }
  }
}

/**
 * Elige instancia sin inventar nombres:
 * 1) EVOLUTION_INSTANCE si existe en evoapi
 * 2) primera con state open
 * 3) primera listada
 */
async function resolveInstance(force = false) {
  if (!force && cached.instance && Date.now() - cached.at < 30_000) {
    return {
      ok: true,
      instance: cached.instance,
      owner: cached.owner,
      state: cached.state,
      fromCache: true,
    }
  }

  const listed = await fetchInstances()
  if (!listed.ok) {
    return {
      ok: false,
      error: listed.error,
      detail: listed.detail,
      instance: '',
      owner: '',
      state: 'unknown',
    }
  }

  const preferred = env('EVOLUTION_INSTANCE')
  let chosen = null
  if (preferred) {
    chosen = listed.instances.find((i) => i.name === preferred) || null
    if (!chosen) {
      // Nombre pedido aún no existe → se usará al pedir QR/connect
      chosen = { name: preferred, state: 'unknown', owner: '' }
    }
  }
  if (!chosen) {
    chosen =
      listed.instances.find((i) => i.state === 'open') ||
      listed.instances[0] ||
      null
  }

  if (!chosen) {
    return {
      ok: false,
      error: 'no_instances',
      detail:
        'No hay instancias en Evolution. Creá una en evoapi o definí EVOLUTION_INSTANCE con el nombre exacto.',
      instance: '',
      owner: '',
      state: 'unknown',
      instances: listed.instances,
    }
  }

  cached = {
    at: Date.now(),
    instance: chosen.name,
    owner: chosen.owner || '',
    state: chosen.state || 'unknown',
  }

  return {
    ok: true,
    instance: chosen.name,
    owner: chosen.owner || '',
    state: chosen.state || 'unknown',
    instances: listed.instances,
  }
}

async function getConnectionState() {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'not_configured', state: 'unconfigured', configured: false }
  }

  const resolved = await resolveInstance()
  if (!resolved.ok || !resolved.instance) {
    return {
      ok: false,
      error: resolved.error || 'no_instances',
      state: 'unconfigured',
      detail: resolved.detail,
      configured: true,
      instances: resolved.instances || [],
    }
  }

  const instance = resolved.instance
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
        owner: resolved.owner || '',
        detail: sanitizeEvolutionDetail(text, res.status),
        configured: true,
      }
    }
    const state = normalizeState(data)
    const owner = resolved.owner || (await refreshOwner(instance)) || ''
    cached = { at: Date.now(), instance, owner, state }
    return {
      ok: true,
      state,
      instance,
      owner,
      connected: state === 'open',
      configured: true,
      data,
    }
  } catch (err) {
    return {
      ok: false,
      error: isAbortError(err) ? 'timeout' : 'network_error',
      state: 'unknown',
      instance,
      owner: resolved.owner || '',
      configured: true,
      detail: isAbortError(err)
        ? 'Timeout consultando Evolution.'
        : sanitizeEvolutionDetail(err.message || 'network_error'),
    }
  }
}

async function refreshOwner(instance) {
  const listed = await fetchInstances()
  if (!listed.ok) return ''
  const hit = listed.instances.find((i) => i.name === instance)
  return hit?.owner || ''
}

/** Genera / refresca QR de la instancia descubierta (como PrestaPro). */
async function getConnectQr() {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      error: 'not_configured',
      message: 'Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en el servidor.',
    }
  }

  const resolved = await resolveInstance(true)
  if (!resolved.ok || !resolved.instance) {
    return {
      ok: false,
      error: resolved.error || 'no_instances',
      message: resolved.detail || 'No se encontró instancia en Evolution.',
      instances: resolved.instances || [],
    }
  }

  const instance = resolved.instance
  const status = await getConnectionState()

  if (status.ok && status.connected) {
    const owner = status.owner || (await refreshOwner(instance)) || ''
    return {
      ok: true,
      instance,
      state: 'open',
      connected: true,
      ownerNumber: owner,
      qrBase64: null,
      message: owner
        ? `WhatsApp conectado (+${owner}). Listo para enviar OTP.`
        : 'WhatsApp conectado. Listo para enviar OTP.',
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
        detail: sanitizeEvolutionDetail(text, res.status),
        message: sanitizeEvolutionDetail(text, res.status),
      }
    }

    const qrBase64 = extractQrBase64(data)
    const pairingCode =
      data?.pairingCode || data?.qrcode?.pairingCode || data?.code || null
    const owner = (await refreshOwner(instance)) || resolved.owner || ''

    return {
      ok: true,
      instance,
      state: normalizeState(data) || 'connecting',
      connected: false,
      ownerNumber: owner,
      qrBase64,
      pairingCode,
      message: qrBase64
        ? `Escaneá con WhatsApp → Ajustes → Dispositivos vinculados (instancia ${instance}).`
        : 'Evolution no devolvió QR. Esperá unos segundos y actualizá.',
    }
  } catch (err) {
    return {
      ok: false,
      error: isAbortError(err) ? 'timeout' : 'network_error',
      instance,
      message: isAbortError(err)
        ? 'Timeout pidiendo QR. Usá EVOLUTION_API_URL interna en el VPS.'
        : sanitizeEvolutionDetail(err.message || 'network_error'),
    }
  }
}

async function logoutInstance() {
  if (!whatsappConfigured()) return { ok: false, error: 'not_configured' }
  const resolved = await resolveInstance(true)
  if (!resolved.instance) return { ok: false, error: resolved.error || 'no_instances' }
  const instance = resolved.instance
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
    cached = { at: 0, instance: '', owner: '', state: '' }
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

  const resolved = await resolveInstance()
  if (!resolved.ok || !resolved.instance) {
    return { ok: false, error: resolved.error || 'no_instances', detail: resolved.detail }
  }

  const instance = resolved.instance
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
    return {
      ok: false,
      error: `http_${res.status}`,
      detail: sanitizeEvolutionDetail(detail, res.status),
    }
  }
  return { ok: true, instance }
}

/** Número conectado descubierto (vacío si aún no hay QR escaneado). */
async function connectedOwner() {
  const st = await getConnectionState()
  if (st.owner) return st.owner
  if (st.instance) return (await refreshOwner(st.instance)) || ''
  return ''
}

function evolutionInstanceName() {
  return cached.instance || env('EVOLUTION_INSTANCE') || ''
}

module.exports = {
  whatsappConfigured,
  normalizePhoneDigits,
  fetchInstances,
  resolveInstance,
  getConnectionState,
  getConnectQr,
  logoutInstance,
  sendText,
  connectedOwner,
  evolutionInstance: evolutionInstanceName,
}
