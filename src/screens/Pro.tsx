import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Cloud, Download, MessageCircle, Sparkles, Users } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import { updateAuthSession, type AuthSession } from '../lib/auth'
import { whatsappChatUrl } from '../lib/whatsapp'

const PRO_PRICE = '$1.99 USD / mes'
const DEFAULT_PRO_CODE = 'CUANTO-PRO'

interface ProProps {
  onBack: () => void
  auth?: AuthSession | null
  onAuthChange?: (session: AuthSession) => void
}

function businessPhone(auth?: AuthSession | null) {
  const fromAuth = (auth?.whatsappBusiness || '').replace(/\D/g, '')
  if (fromAuth) return fromAuth
  return (import.meta.env.VITE_WHATSAPP_BUSINESS || '').replace(/\D/g, '')
}

function expectedProCode() {
  return (import.meta.env.VITE_PRO_CODE || DEFAULT_PRO_CODE).trim().toUpperCase()
}

export function Pro({ onBack, auth, onAuthChange }: ProProps) {
  const { settings, memberCode, isPro, activatePro } = useStore()
  const [code, setCode] = useState('')
  const [tenantPhone, setTenantPhone] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [grantMsg, setGrantMsg] = useState('')

  const isMaster = auth?.role === 'master'

  const payUrl = useMemo(() => {
    const phone = businessPhone(auth)
    if (!phone) return ''
    const msg = [
      `Hola, quiero activar *Cuanto Pro* (${PRO_PRICE}).`,
      `Nombre: ${settings.userName || auth?.name || '—'}`,
      `Espacio: ${settings.orgName || '—'}`,
      `Tel: ${auth?.phone || settings.phoneWhatsapp || '—'}`,
      `Código miembro: ${memberCode}`,
    ].join('\n')
    return whatsappChatUrl(phone, msg)
  }, [auth, memberCode, settings.orgName, settings.phoneWhatsapp, settings.userName])

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
    void updateAuthSession('set_own_plan', { plan: 'pro' }).then((res) => {
      if (res.session) onAuthChange?.(res.session)
    })
    setError('')
    setOk(true)
  }

  async function grantPro(e: FormEvent) {
    e.preventDefault()
    setGrantMsg('')
    setError('')
    const res = await updateAuthSession('set_plan', {
      phone: tenantPhone,
      plan: 'pro',
    })
    if (!res.ok) {
      setError(res.error || 'No se pudo generar el grant')
      return
    }
    // En modo local, activamos referencia; el cliente aplica al loguearse o con código Pro
    setGrantMsg(
      `Pro autorizado para ${tenantPhone.replace(/\D/g, '')}. Pedile que entre con su WhatsApp y active con el código Pro, o reenviá CUANTO-PRO.`,
    )
  }

  return (
    <Screen>
      <header className="screen-header row">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Volver
        </button>
        <h1>Cuanto Pro</h1>
        <p className="muted small">
          {isMaster ? 'Gestioná suscripciones Pro de clientes.' : 'Subí de nivel sin complicaciones.'}
        </p>
      </header>

      <FadeIn className="pro-hero">
        <span className="pro-badge">
          <Sparkles size={14} />
          {isPro ? 'Activo' : PRO_PRICE}
        </span>
        <h2>
          {isMaster
            ? 'Panel Pro · Master'
            : isPro
              ? 'Tu plan Pro está activo'
              : 'Más control por casi nada'}
        </h2>
        <p className="muted">
          {isMaster
            ? 'Los clientes pagan por WhatsApp, confirman OTP con su número y vos autorizás Pro.'
            : isPro
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

      {isMaster ? (
        <FadeIn delay={0.04} className="pro-actions">
          <form className="pro-code-form" onSubmit={grantPro}>
            <label className="field">
              <span className="field-label">Autorizar Pro a un teléfono cliente</span>
              <input
                type="tel"
                placeholder="1809XXXXXXX"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                required
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            {grantMsg ? <p className="pro-ok">{grantMsg}</p> : null}
            <button type="submit" className="btn-primary btn-block">
              Autorizar Pro
            </button>
          </form>
        </FadeIn>
      ) : null}

      {!isPro && !isMaster ? (
        <FadeIn delay={0.05} className="pro-actions">
          {payUrl ? (
            <a className="btn-primary btn-block" href={payUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Pagar por WhatsApp
            </a>
          ) : (
            <p className="form-error">Falta WhatsApp Business (master debe configurarlo)</p>
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

      {isPro && !isMaster ? (
        <p className="pro-ok" style={{ marginTop: 12 }}>
          <Check size={16} /> Plan Pro activo en esta sesión
        </p>
      ) : null}

      <p className="legal-foot muted small">
        Al activar aceptás los <Link to="/terminos">términos</Link> y la{' '}
        <Link to="/privacidad">privacidad</Link>.
      </p>
    </Screen>
  )
}
