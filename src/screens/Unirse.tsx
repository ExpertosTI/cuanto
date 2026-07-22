import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Screen } from '../components/Motion'
import { useStore } from '../store'

export function Unirse() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { redeemInvite, settings } = useStore()
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  function handleJoin() {
    if (!userName.trim()) {
      setError('Escribe tu nombre')
      return
    }
    const ok = redeemInvite(token, {
      userName: userName.trim(),
      phoneWhatsapp: phone.trim(),
    })
    if (!ok) {
      setError('Este enlace no es válido o ya expiró')
      return
    }
    navigate('/')
  }

  return (
    <Screen className="onboarding join">
      <div className="onboarding-bg" aria-hidden />
      <div className="onboarding-content">
        <p className="brand-mark">Cuanto</p>
        <h1>Únete al equipo</h1>
        <p className="onboarding-sub">
          Te invitaron a {settings.orgName || 'un espacio Cuanto'}. Completa tus datos para
          registrarte.
        </p>

        <div className="onboarding-form">
          <label className="field">
            <span className="field-label">Tu nombre</span>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nombre completo"
            />
          </label>
          <label className="field">
            <span className="field-label">WhatsApp</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp"
              inputMode="tel"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="button" className="btn-primary btn-block" onClick={handleJoin}>
            <MessageCircle size={18} />
            Registrarme
          </button>
        </div>
      </div>
    </Screen>
  )
}
