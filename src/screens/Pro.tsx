import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Cloud, Download, MessageCircle, Sparkles, Users } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import { whatsappChatUrl } from '../lib/whatsapp'

const PRO_PRICE = '$1.99 USD / mes'
const DEFAULT_PRO_CODE = 'CUANTO-PRO'

interface ProProps {
  onBack: () => void
}

function businessPhone() {
  return (import.meta.env.VITE_WHATSAPP_BUSINESS || '').replace(/\D/g, '')
}

function expectedProCode() {
  return (import.meta.env.VITE_PRO_CODE || DEFAULT_PRO_CODE).trim().toUpperCase()
}

export function Pro({ onBack }: ProProps) {
  const { settings, memberCode, isPro, activatePro } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const payUrl = useMemo(() => {
    const phone = businessPhone()
    if (!phone) return ''
    const msg = [
      `Hola, quiero activar *Cuanto Pro* (${PRO_PRICE}).`,
      `Nombre: ${settings.userName || '—'}`,
      `Espacio: ${settings.orgName || '—'}`,
      `Código miembro: ${memberCode}`,
    ].join('\n')
    return whatsappChatUrl(phone, msg)
  }, [memberCode, settings.orgName, settings.userName])

  function handleActivate(e: FormEvent) {
    e.preventDefault()
    const typed = code.trim().toUpperCase()
    if (!typed) {
      setError('Ingresá el código que te enviamos')
      return
    }
    if (typed !== expectedProCode()) {
      setError('Código inválido. Pedilo por WhatsApp tras pagar.')
      return
    }
    activatePro()
    setError('')
    setOk(true)
  }

  return (
    <Screen>
      <header className="screen-header row">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Volver
        </button>
        <h1>Cuanto Pro</h1>
        <p className="muted small">Subí de nivel sin complicaciones.</p>
      </header>

      <FadeIn className="pro-hero">
        <span className="pro-badge">
          <Sparkles size={14} />
          {isPro ? 'Activo' : PRO_PRICE}
        </span>
        <h2>{isPro ? 'Tu plan Pro está activo' : 'Más control por casi nada'}</h2>
        <p className="muted">
          {isPro
            ? 'Gracias por apoyar Cuanto. Ya tenés exportar, equipo ampliado y respaldo.'
            : 'Pagás por WhatsApp, te damos un código y listo. Sin tarjeta en la app.'}
        </p>
      </FadeIn>

      <ul className="pro-perks">
        <li>
          <Cloud size={18} />
          <div>
            <strong>Respaldo en la nube</strong>
            <span>Sincronizá entre dispositivos cuando InsForge esté disponible.</span>
          </div>
        </li>
        <li>
          <Users size={18} />
          <div>
            <strong>Equipo ampliado</strong>
            <span>Invitaciones admin y coordinación para tu espacio.</span>
          </div>
        </li>
        <li>
          <Download size={18} />
          <div>
            <strong>Exportar CSV</strong>
            <span>Llevá tu historial a Excel o Google Sheets.</span>
          </div>
        </li>
      </ul>

      {!isPro ? (
        <FadeIn delay={0.05} className="pro-actions">
          {payUrl ? (
            <a className="btn-primary btn-block" href={payUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Pagar por WhatsApp
            </a>
          ) : (
            <p className="form-error">Falta configurar VITE_WHATSAPP_BUSINESS</p>
          )}

          <form className="pro-code-form" onSubmit={handleActivate}>
            <label className="field">
              <span className="field-label">Ya pagué — código de activación</span>
              <input
                type="text"
                autoCapitalize="characters"
                placeholder="CUANTO-PRO"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            {ok ? (
              <p className="pro-ok">
                <Check size={16} /> Pro activado
              </p>
            ) : null}
            <button type="submit" className="btn-secondary btn-block">
              Activar Pro
            </button>
          </form>
        </FadeIn>
      ) : null}

      <p className="legal-foot muted small">
        Al activar aceptás los <Link to="/terminos">términos</Link> y la{' '}
        <Link to="/privacidad">privacidad</Link>.
      </p>
    </Screen>
  )
}
