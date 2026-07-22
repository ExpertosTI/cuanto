import { useMemo, useState } from 'react'
import { MapPin, Sparkles } from 'lucide-react'
import { CURRENCIES, detectCountry } from '../lib/country'
import { useStore } from '../store'
import { FadeIn, Screen } from '../components/Motion'

export function Onboarding() {
  const { completeOnboarding } = useStore()
  const detected = useMemo(() => detectCountry(), [])
  const [userName, setUserName] = useState('')
  const [orgName, setOrgName] = useState('Mis finanzas')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState(detected.currencyCode)

  const selected = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0]

  function handleStart() {
    if (!userName.trim()) return
    completeOnboarding({
      userName: userName.trim(),
      orgName: orgName.trim() || 'Mis finanzas',
      currency: selected.code,
      countryCode: selected.countryCode,
      phoneWhatsapp: phone.trim(),
    })
  }

  return (
    <Screen className="onboarding">
      <div className="onboarding-bg" aria-hidden />
      <div className="onboarding-content">
        <FadeIn>
          <p className="brand-mark">Cuanto</p>
          <h1>Tu dinero claro, al estilo dominicano</h1>
          <p className="onboarding-sub">
            Detectamos automáticamente tu país y moneda. Ajusta lo que quieras.
          </p>
        </FadeIn>

        <FadeIn delay={0.08} className="detect-chip">
          <MapPin size={16} />
          <span>
            {selected.country} · {selected.code}
            {detected.source === 'timezone' ? ' · detectado' : ''}
          </span>
        </FadeIn>

        <FadeIn delay={0.12} className="onboarding-form">
          <label className="field">
            <span className="field-label">Tu nombre</span>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Tu nombre"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Nombre de tu espacio</span>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nombre del espacio"
            />
          </label>

          <label className="field">
            <span className="field-label">WhatsApp (opcional)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp"
              inputMode="tel"
            />
          </label>

          <span className="field-label">Moneda</span>
          <div className="currency-grid">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`currency-card ${currency === c.code ? 'selected' : ''}`}
                onClick={() => setCurrency(c.code)}
              >
                <span className="currency-code">{c.code}</span>
                <span className="currency-country">{c.country}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary btn-block"
            disabled={!userName.trim()}
            onClick={handleStart}
          >
            <Sparkles size={18} />
            Empezar
          </button>
        </FadeIn>
      </div>
    </Screen>
  )
}
