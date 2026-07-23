import { useState, type FormEvent } from 'react'
import { MessageCircle } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { updateAuthSession, type AuthSession } from '../lib/auth'

interface AuthWhatsAppConfigProps {
  session: AuthSession
  onDone: (session: AuthSession) => void
  onLogout: () => void
}

export function AuthWhatsAppConfig({ session, onDone, onLogout }: AuthWhatsAppConfigProps) {
  const [phone, setPhone] = useState(session.whatsappBusiness || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await updateAuthSession('set_whatsapp', { phone })
      if (!res.ok || !res.session) {
        setError(res.error || 'No se pudo guardar')
        return
      }
      onDone(res.session)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="auth-screen">
      <FadeIn className="auth-card">
        <header className="screen-header row">
          <h1>Configurar WhatsApp</h1>
          <p className="muted small">
            Master {session.email}. Este número confirma OTP de clientes y mensajes Pro.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSave}>
          <label className="field">
            <span className="field-label">WhatsApp Business (con código país)</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="17174156171"
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            <MessageCircle size={18} />
            {loading ? 'Guardando…' : 'Guardar y continuar'}
          </button>
          <button type="button" className="link-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
        </form>
      </FadeIn>
    </Screen>
  )
}
