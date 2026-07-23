import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Shield, Sparkles } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { loadAuthToken, type AuthSession } from '../lib/auth'

interface AdminAccountsProps {
  session: AuthSession
  onBack: () => void
}

type AccountRow = {
  id: string
  phone: string
  email: string
  name: string
  role: string
  plan: string
  createdAt?: number
  lastLoginAt?: number
}

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_AUTH_URL || '').trim().replace(/\/$/, '')
  return `${base}${path}`
}

function fmtDate(ms?: number) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleString('es-DO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export function AdminAccounts({ session, onBack }: AdminAccountsProps) {
  const [rows, setRows] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyPhone, setBusyPhone] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = loadAuthToken()
      const res = await fetch(apiUrl('/api/admin/accounts'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = (await res.json()) as { ok?: boolean; accounts?: AccountRow[]; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudieron cargar las cuentas')
        return
      }
      setRows(data.accounts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setPlan(phone: string, plan: 'pro' | 'free') {
    setBusyPhone(phone)
    setError('')
    try {
      const token = loadAuthToken()
      const res = await fetch(apiUrl('/api/admin/accounts/plan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone, plan }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo actualizar el plan')
        return
      }
      await load()
    } finally {
      setBusyPhone('')
    }
  }

  return (
    <Screen>
      <FadeIn className="admin-panel">
        <header className="screen-header row">
          <div>
            <h1>
              <Shield size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Cuentas
            </h1>
            <p className="muted small">
              Master {session.phone || session.email}. Solo cuentas reales que iniciaron sesión.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Cerrar
          </button>
        </header>

        <div className="admin-toolbar">
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          <span className="muted small">{rows.length} cuenta{rows.length === 1 ? '' : 's'}</span>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {rows.length === 0 && !loading ? (
          <p className="muted">Aún no hay cuentas. Cuando un cliente active con su número, aparecerá aquí.</p>
        ) : (
          <ul className="admin-list">
            {rows.map((a) => (
              <li key={a.id || a.phone || a.email} className="admin-row">
                <div className="admin-row-main">
                  <strong>{a.name || a.phone || a.email || 'Sin nombre'}</strong>
                  <span className="muted small">
                    {a.role === 'master' ? 'Master' : 'Cliente'}
                    {a.phone ? ` · +${a.phone}` : ''}
                    {a.email ? ` · ${a.email}` : ''}
                  </span>
                  <span className="muted small">Último acceso: {fmtDate(a.lastLoginAt)}</span>
                </div>
                <div className="admin-row-actions">
                  <span className={`admin-plan ${a.plan === 'pro' ? 'on' : ''}`}>
                    <Sparkles size={14} />
                    {a.plan === 'pro' ? 'Pro' : 'Free'}
                  </span>
                  {a.role !== 'master' && a.phone ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busyPhone === a.phone}
                      onClick={() => void setPlan(a.phone, a.plan === 'pro' ? 'free' : 'pro')}
                    >
                      {a.plan === 'pro' ? 'Quitar Pro' : 'Dar Pro'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
    </Screen>
  )
}
