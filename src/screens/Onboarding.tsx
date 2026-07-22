import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  MapPin,
  MessageCircle,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'
import { CURRENCIES, detectCountry } from '../lib/country'
import { useStore } from '../store'
import { FadeIn } from '../components/Motion'
import { isInsForgeConfigured, probeInsForge } from '../lib/insforge'

function flagEmoji(countryCode: string) {
  if (countryCode === 'US') return '🌎'
  return [...countryCode.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

export function Onboarding() {
  const { completeOnboarding } = useStore()
  const detected = useMemo(() => detectCountry(), [])
  const [userName, setUserName] = useState('')
  const [orgName, setOrgName] = useState('Mis finanzas')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState(detected.currencyCode)
  const [cloudOk, setCloudOk] = useState<boolean | null>(isInsForgeConfigured ? null : false)

  useEffect(() => {
    let alive = true
    if (!isInsForgeConfigured) return
    void probeInsForge().then((r) => {
      if (alive) setCloudOk(r.connected)
    })
    return () => {
      alive = false
    }
  }, [])

  const selected = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0]
  const canStart = Boolean(userName.trim())
  const cloudLabel =
    cloudOk === true ? 'Nube conectada' : cloudOk === false ? 'Sin nube' : 'Conectando…'
  const cloudShort = cloudOk === true ? 'Nube' : cloudOk === false ? 'Local' : '…'

  function handleStart() {
    if (!canStart) return
    completeOnboarding({
      userName: userName.trim(),
      orgName: orgName.trim() || 'Mis finanzas',
      currency: selected.code,
      countryCode: selected.countryCode,
      phoneWhatsapp: phone.trim(),
    })
  }

  return (
    <div className="onboard">
      <div className="onboard-scene" aria-hidden>
        <div className="onboard-glow onboard-glow-a" />
        <div className="onboard-glow onboard-glow-b" />
        <div className="onboard-grid" />
      </div>

      <div className="onboard-layout">
        <FadeIn className="onboard-hero">
          <p className="onboard-brand">Cuanto</p>
          <h1>Tu dinero, claro y a la mano</h1>
          <p className="onboard-lead">
            Controlá ingresos y gastos con categorías propias, equipo y QR.
          </p>

          <div className="onboard-pills">
            <span className="onboard-pill">
              <MapPin size={15} strokeWidth={2.2} />
              <span className="pill-short">{selected.code} · detectado</span>
              <span className="pill-long">
                {selected.country} · {selected.code}
                {detected.source === 'timezone' ? ' · detectado' : ''}
              </span>
            </span>
            <span className={`onboard-pill ${cloudOk ? 'ok' : 'warn'}`}>
              <Wallet size={15} strokeWidth={2.2} />
              <span className="pill-short">{cloudShort}</span>
              <span className="pill-long">{cloudLabel}</span>
            </span>
          </div>

          <ul className="onboard-features">
            <li>
              <span className="onboard-feature-icon">
                <Sparkles size={16} />
              </span>
              Resumen visual por período
            </li>
            <li>
              <span className="onboard-feature-icon">
                <Building2 size={16} />
              </span>
              Categorías renombrables
            </li>
            <li>
              <span className="onboard-feature-icon">
                <MessageCircle size={16} />
              </span>
              Equipo con WhatsApp y QR
            </li>
          </ul>
        </FadeIn>

        <FadeIn delay={0.08} className="onboard-sheet">
          <div className="onboard-sheet-head">
            <h2>Crear tu espacio</h2>
            <p>Solo lo esencial para empezar.</p>
          </div>

          <div className="onboard-form">
            <label className="field-icon">
              <span className="field-icon-badge">
                <UserRound size={18} />
              </span>
              <span className="field-icon-body">
                <span className="field-label">Tu nombre</span>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Cómo te llamamos"
                  autoFocus
                  autoComplete="name"
                />
              </span>
            </label>

            <label className="field-icon">
              <span className="field-icon-badge">
                <Building2 size={18} />
              </span>
              <span className="field-icon-body">
                <span className="field-label">Espacio</span>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Casa, negocio o equipo"
                  autoComplete="organization"
                />
              </span>
            </label>

            <label className="field-icon">
              <span className="field-icon-badge">
                <MessageCircle size={18} />
              </span>
              <span className="field-icon-body">
                <span className="field-label">WhatsApp</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Opcional"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </span>
            </label>

            <div className="onboard-currency-block">
              <div className="section-head">
                <span className="field-label">Moneda</span>
                <span className="muted small">{selected.symbol}</span>
              </div>
              <div className="currency-rail" role="listbox" aria-label="Moneda">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    aria-selected={currency === c.code}
                    className={`currency-chip ${currency === c.code ? 'selected' : ''}`}
                    onClick={() => setCurrency(c.code)}
                  >
                    <span className="currency-flag" aria-hidden>
                      {flagEmoji(c.countryCode)}
                    </span>
                    <span className="currency-meta">
                      <strong>{c.code}</strong>
                      <small>{c.country}</small>
                    </span>
                    {currency === c.code ? (
                      <Check size={16} className="currency-check" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary btn-block onboard-cta"
              disabled={!canStart}
              onClick={handleStart}
            >
              <Sparkles size={18} />
              Empezar
            </button>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
