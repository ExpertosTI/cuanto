/**
 * Cliente InsForge del stack Renace (PostgREST-compatible).
 * Endpoint: https://insforge.renace.tech
 */

export const RENACE_ANON_KEY =
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24ifQ.YTrshWNWGSWsmc6DUhitFQSXDICh9BTIiz4CK0GX0Cw'

const ENDPOINT = (
  import.meta.env.VITE_INSFORGE_URL || 'https://insforge.renace.tech'
).replace(/\/$/, '')

const ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || RENACE_ANON_KEY

export type InsforgeResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; detail?: string }

export const isInsForgeConfigured = Boolean(ENDPOINT && ANON_KEY)

function tablePath(table: string) {
  if (/\/rest\/v1$/i.test(ENDPOINT)) return `/${table}`
  return `/api/database/records/${table}`
}

function buildUrl(table: string, qs = '') {
  const q = qs && !qs.startsWith('?') ? `?${qs}` : qs
  return `${ENDPOINT}${tablePath(table)}${q}`
}

function headers(prefer = 'return=representation'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Prefer: prefer,
    Accept: 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  }
}

async function insforgeFetch(url: string, init?: RequestInit, timeoutMs = 15_000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

/** Comprueba conectividad real contra InsForge Renace */
export async function probeInsForge() {
  if (!isInsForgeConfigured) {
    return { enabled: false, connected: false, endpoint: ENDPOINT, error: 'not_configured' as const }
  }
  try {
    const res = await insforgeFetch(buildUrl('cuanto_spaces', 'limit=1'), {
      method: 'GET',
      headers: headers('return=minimal'),
    })
    // 404 = tabla aún no creada, pero el API responde
    const connected = res.ok || res.status === 404 || res.status === 406 || res.status === 401
    return {
      enabled: true,
      connected: res.ok || res.status === 404 || res.status === 406,
      endpoint: ENDPOINT,
      status: res.status,
      error: connected ? undefined : (`http_${res.status}` as const),
    }
  } catch (err) {
    return {
      enabled: true,
      connected: false,
      endpoint: ENDPOINT,
      error: err instanceof Error ? err.message : 'network',
    }
  }
}

export async function insforgeQuery<T = Record<string, unknown>>(
  table: string,
  qs = '',
): Promise<InsforgeResult<T[]>> {
  if (!isInsForgeConfigured) return { ok: false, error: 'not_configured' }
  try {
    const res = await insforgeFetch(buildUrl(table, qs), {
      method: 'GET',
      headers: headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 300) }
    }
    const data = (await res.json()) as T[]
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function insforgeUpsert(
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
  onConflict = 'id',
): Promise<InsforgeResult> {
  if (!isInsForgeConfigured) return { ok: false, error: 'not_configured' }
  try {
    const res = await insforgeFetch(buildUrl(table, `on_conflict=${encodeURIComponent(onConflict)}`), {
      method: 'POST',
      headers: {
        ...headers(),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(Array.isArray(row) ? row : [row]),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 300) }
    }
    const data = await res.json().catch(() => undefined)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function insforgeInsert(
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
): Promise<InsforgeResult> {
  if (!isInsForgeConfigured) return { ok: false, error: 'not_configured' }
  try {
    const res = await insforgeFetch(buildUrl(table), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(Array.isArray(row) ? row : [row]),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 300) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function insforgeDelete(table: string, filter: string): Promise<InsforgeResult> {
  if (!isInsForgeConfigured) return { ok: false, error: 'not_configured' }
  try {
    const res = await insforgeFetch(buildUrl(table, filter), {
      method: 'DELETE',
      headers: headers('return=minimal'),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 300) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

/** @deprecated usar probeInsForge / insforgeQuery */
export const insforge = null
