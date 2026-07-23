import { useState, type FormEvent } from 'react'
import { Mail, MessageCircle, Shield } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import {
  requestEmailOtp,
  requestWhatsAppOtp,
  verifyOtp,
  type AuthSession,
} from '../lib/auth'

interface AuthLoginProps {
  onAuthenticated: (session: AuthSession) => void
}

type Mode = 'choose' | 'master_phone' | 'master_email' | 'tenant'
type Step = 'identity' | 'otp'

export function AuthLogin({ onAuthenticated }: AuthLoginProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [step, setStep] = useState<Step>('identity')
  const [email, setEmail] = useState('info@renace.tech')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [hint, setHint] = useState('')
  const [confirmUrl, setConfirmUrl] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (mode === 'master_email') {
        res = await requestEmailOtp(email)
      } else if (mode === 'master_phone') {
        res = await requestWhatsAppOtp(phone, name, { asMaster: true })
      } else {
        res = await requestWhatsAppOtp(phone, name)
      }
      if (!res.ok || !res.challenge) {
        setError(res.error || 'No se pudo enviar el código')
        return
      }
      setChallenge(res.challenge)
      setHint(res.message || '')
      setConfirmUrl(res.confirmUrl || '')
      setDevCode(res.devCode || '')
      setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  async function confirmOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await verifyOtp(challenge, code)
      if (!res.ok || !res.session) {
        setError(res.error || 'Código inválido')
        return
      }
      onAuthenticated(res.session)
    } finally {
      setLoading(false)
    }
  }

  const isMasterPhone = mode === 'master_phone'
  const isMasterEmail = mode === 'master_email'

  return (
    <Screen className="auth-screen">
      <FadeIn className="auth-card">
        <div className="auth-brand">
          <Shield size={28} />
          <h1>Cuanto</h1>
          <p className="muted">Acceso seguro · Pro y equipos</p>
        </div>

        {mode === 'choose' ? (
          <div className="auth-choose">
            <button
              type="button"
              className="btn-primary btn-block"
              onClick={() => setMode('master_phone')}
            >
              <MessageCircle size={18} />
              Master · mi WhatsApp (configurar)
            </button>
            <button type="button" className="btn-secondary btn-block" onClick={() => setMode('tenant')}>
              <MessageCircle size={18} />
              Cliente · activar con mi número
            </button>
            <button type="button" className="link-btn" onClick={() => setMode('master_email')}>
              <Mail size={14} />
              Master · OTP por correo
            </button>
            <p className="muted small auth-note">
              La primera vez el master entra con su teléfono, escanea el QR de Evolution y luego los
              clientes pueden activar.
            </p>
          </div>
        ) : null}

        {mode !== 'choose' && step === 'identity' ? (
          <form className="auth-form" onSubmit={requestOtp}>
            <button type="button" className="link-btn" onClick={() => setMode('choose')}>
              ← Volver
            </button>
            {isMasterEmail ? (
              <label className="field">
                <span className="field-label">Correo master</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
            ) : (
              <>
                <label className="field">
                  <span className="field-label">{isMasterPhone ? 'Tu nombre (master)' : 'Tu nombre'}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
                </label>
                <label className="field">
                  <span className="field-label">WhatsApp (con código país)</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1809XXXXXXX"
                    required
                  />
                </label>
                {isMasterPhone ? (
                  <p className="muted small">
                    Si Evolution aún no está conectado, el código llega al correo master (SMTP). Luego
                    escaneás el QR.
                  </p>
                ) : null}
              </>
            )}
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código OTP'}
            </button>
          </form>
        ) : null}

        {mode !== 'choose' && step === 'otp' ? (
          <form className="auth-form" onSubmit={confirmOtp}>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setStep('identity')
                setCode('')
              }}
            >
              ← Cambiar {isMasterEmail ? 'correo' : 'número'}
            </button>
            <p className="muted small">{hint}</p>
            {devCode ? (
              <p className="auth-dev">
                Código (dev): <strong>{devCode}</strong>
              </p>
            ) : null}
            {confirmUrl ? (
              <a className="btn-secondary btn-block" href={confirmUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={16} />
                Abrir WhatsApp
              </a>
            ) : null}
            <label className="field">
              <span className="field-label">Código de 6 dígitos</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-primary btn-block" disabled={loading || code.length < 6}>
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        ) : null}
      </FadeIn>
    </Screen>
  )
}
