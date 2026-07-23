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
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
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

  const isMasterEmail = mode === 'master_email'

  return (
    <Screen className="auth-screen">
      <FadeIn className="auth-card">
        <div className="auth-brand">
          <Shield size={28} />
          <h1>Cuanto</h1>
        </div>

        {mode === 'choose' ? (
          <div className="auth-choose">
            <button
              type="button"
              className="btn-primary btn-block"
              onClick={() => setMode('master_phone')}
            >
              <MessageCircle size={18} />
              Master
            </button>
            <button type="button" className="btn-secondary btn-block" onClick={() => setMode('tenant')}>
              <MessageCircle size={18} />
              Cliente
            </button>
            <button type="button" className="link-btn" onClick={() => setMode('master_email')}>
              <Mail size={14} />
              Correo
            </button>
          </div>
        ) : null}

        {mode !== 'choose' && step === 'identity' ? (
          <form className="auth-form" onSubmit={requestOtp}>
            <button type="button" className="link-btn" onClick={() => setMode('choose')}>
              ← Volver
            </button>
            {isMasterEmail ? (
              <label className="field">
                <span className="field-label">Correo</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </label>
            ) : (
              <>
                <label className="field">
                  <span className="field-label">Nombre</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
                <label className="field">
                  <span className="field-label">WhatsApp</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
              </>
            )}
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar OTP'}
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
              ← Volver
            </button>
            <label className="field">
              <span className="field-label">Código</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-primary btn-block" disabled={loading || code.length < 6}>
              {loading ? '…' : 'Entrar'}
            </button>
          </form>
        ) : null}
      </FadeIn>
    </Screen>
  )
}
