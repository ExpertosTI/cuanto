import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, QrCode, RefreshCw, Unplug } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { loadAuthToken, updateAuthSession, type AuthSession } from '../lib/auth'

interface AuthWhatsAppConfigProps {
  session: AuthSession
  onDone: (session: AuthSession) => void
  onLogout: () => void
}

type QrPayload = {
  ok?: boolean
  qrBase64?: string | null
  connected?: boolean
  message?: string
  expectedOwner?: string
  instance?: string
  error?: string
  detail?: string
}

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_AUTH_URL || '').trim().replace(/\/$/, '')
  return `${base}${path}`
}

export function AuthWhatsAppConfig({ session, onDone, onLogout }: AuthWhatsAppConfigProps) {
  const [qr, setQr] = useState<QrPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadQr = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = loadAuthToken()
      const res = await fetch(apiUrl('/api/whatsapp/qr'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = (await res.json()) as QrPayload
      if (!res.ok && !data.qrBase64 && !data.connected) {
        setError(data.message || data.detail || data.error || 'No se pudo obtener el QR')
      }
      setQr(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQr()
  }, [loadQr])

  useEffect(() => {
    if (qr?.connected) return
    if (!qr?.qrBase64 && !qr?.ok) return
    const t = window.setInterval(() => void loadQr(), 4000)
    return () => window.clearInterval(t)
  }, [qr?.connected, qr?.qrBase64, qr?.ok, loadQr])

  async function continueReady() {
    setBusy(true)
    setError('')
    try {
      const res = await updateAuthSession('mark_evo_ready', {})
      if (!res.ok || !res.session) {
        // fallback local
        const next = {
          ...session,
          whatsappBusiness: qr?.expectedOwner || session.whatsappBusiness || '',
          evoReady: true,
        } as AuthSession
        onDone(next)
        return
      }
      onDone(res.session)
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      const token = loadAuthToken()
      await fetch(apiUrl('/api/whatsapp/logout'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      await loadQr()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen className="auth-screen">
      <FadeIn className="auth-card">
        <header className="screen-header row">
          <h1>Conectar WhatsApp</h1>
          <p className="muted small">
            Master {session.email}. Escaneá el QR de Evolution (evoapi) con la línea de Renace.
          </p>
        </header>

        <div className="evo-panel">
          <div className="evo-status">
            <QrCode size={18} />
            <span>
              {qr?.connected
                ? 'Conectado'
                : loading
                  ? 'Cargando QR…'
                  : qr?.instance
                    ? `Instancia · ${qr.instance}`
                    : 'Evolution'}
            </span>
          </div>

          {qr?.expectedOwner ? (
            <p className="muted small">Línea esperada: +{qr.expectedOwner}</p>
          ) : null}

          {qr?.qrBase64 && !qr.connected ? (
            <img className="evo-qr" src={qr.qrBase64} alt="QR WhatsApp Evolution" />
          ) : null}

          {qr?.connected ? (
            <p className="pro-ok">WhatsApp listo en Evolution. Los clientes recibirán OTP por WA.</p>
          ) : null}

          {qr?.message ? <p className="muted small">{qr.message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="evo-actions">
            <button type="button" className="btn-secondary" onClick={() => void loadQr()} disabled={loading || busy}>
              <RefreshCw size={16} />
              Actualizar QR
            </button>
            {qr?.connected ? (
              <button type="button" className="btn-secondary" onClick={() => void disconnect()} disabled={busy}>
                <Unplug size={16} />
                Desconectar
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-primary btn-block"
            onClick={() => void continueReady()}
            disabled={busy || (!qr?.connected && !qr?.qrBase64 && Boolean(error))}
          >
            <MessageCircle size={18} />
            {qr?.connected ? 'Continuar' : 'Ya escaneé · Continuar'}
          </button>

          <button type="button" className="link-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </FadeIn>
    </Screen>
  )
}
