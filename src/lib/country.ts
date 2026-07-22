import type { CurrencyOption } from '../types'

export const CURRENCIES: CurrencyOption[] = [
  { code: 'DOP', symbol: 'RD$', name: 'Peso dominicano', country: 'República Dominicana', locale: 'es-DO', countryCode: 'DO' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano', country: 'México', locale: 'es-MX', countryCode: 'MX' },
  { code: 'COP', symbol: '$', name: 'Peso colombiano', country: 'Colombia', locale: 'es-CO', countryCode: 'CO' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino', country: 'Argentina', locale: 'es-AR', countryCode: 'AR' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno', country: 'Chile', locale: 'es-CL', countryCode: 'CL' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano', country: 'Perú', locale: 'es-PE', countryCode: 'PE' },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño', country: 'Brasil', locale: 'pt-BR', countryCode: 'BR' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal', country: 'Guatemala', locale: 'es-GT', countryCode: 'GT' },
  { code: 'CRC', symbol: '₡', name: 'Colón costarricense', country: 'Costa Rica', locale: 'es-CR', countryCode: 'CR' },
  { code: 'USD', symbol: 'US$', name: 'Dólar', country: 'Internacional', locale: 'en-US', countryCode: 'US' },
]

/** Timezone → ISO country (LATAM focus, DO first) */
const TZ_COUNTRY: Record<string, string> = {
  'America/Santo_Domingo': 'DO',
  'America/Mexico_City': 'MX',
  'America/Monterrey': 'MX',
  'America/Cancun': 'MX',
  'America/Bogota': 'CO',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  'America/Sao_Paulo': 'BR',
  'America/Guatemala': 'GT',
  'America/Costa_Rica': 'CR',
  'America/New_York': 'US',
  'America/Puerto_Rico': 'PR',
}

const LOCALE_COUNTRY: Record<string, string> = {
  'es-DO': 'DO',
  'es-MX': 'MX',
  'es-CO': 'CO',
  'es-AR': 'AR',
  'es-CL': 'CL',
  'es-PE': 'PE',
  'pt-BR': 'BR',
  'es-GT': 'GT',
  'es-CR': 'CR',
}

export interface DetectedLocale {
  countryCode: string
  currencyCode: string
  currency: CurrencyOption
  source: 'timezone' | 'locale' | 'default'
}

export function detectCountry(): DetectedLocale {
  const fallback = CURRENCIES[0]

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const fromTz = TZ_COUNTRY[tz]
    if (fromTz) {
      const currency = CURRENCIES.find((c) => c.countryCode === fromTz) ?? fallback
      return {
        countryCode: fromTz,
        currencyCode: currency.code,
        currency,
        source: 'timezone',
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const lang = navigator.language || 'es-DO'
    const fromLocale = LOCALE_COUNTRY[lang] || LOCALE_COUNTRY[lang.replace('_', '-')]
    if (fromLocale) {
      const currency = CURRENCIES.find((c) => c.countryCode === fromLocale) ?? fallback
      return {
        countryCode: fromLocale,
        currencyCode: currency.code,
        currency,
        source: 'locale',
      }
    }
    if (lang.toLowerCase().startsWith('es')) {
      return {
        countryCode: 'DO',
        currencyCode: 'DOP',
        currency: fallback,
        source: 'default',
      }
    }
  } catch {
    /* ignore */
  }

  return {
    countryCode: 'DO',
    currencyCode: 'DOP',
    currency: fallback,
    source: 'default',
  }
}

export function currencyByCode(code: string): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}
