export type TransactionType = 'expense' | 'income'
export type Period = 'day' | 'week' | 'month' | 'year'
export type OrgRole = 'owner' | 'admin' | 'member'
export type InviteKind = 'client_join' | 'admin_join' | 'checkin'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: TransactionType
  isDefault?: boolean
}

export interface Transaction {
  id: string
  amount: number
  categoryId: string
  type: TransactionType
  date: string
  note: string
  createdAt: string
}

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
  country: string
  locale: string
  countryCode: string
}

export interface Invite {
  id: string
  token: string
  kind: InviteKind
  role: OrgRole
  label: string
  createdAt: string
  useCount: number
  maxUses: number
}

export interface ScanEvent {
  id: string
  payload: string
  source: 'qr' | 'whatsapp' | 'manual'
  label: string
  createdAt: string
}

export interface MemberCode {
  code: string
  profileName: string
}

export interface MoneyGoals {
  /** Meta de ingresos del mes (0 = sin meta) */
  incomeMonth: number
  /** Tope de gastos del día */
  expenseDay: number
  /** Tope de gastos del mes */
  expenseMonth: number
  /** Meta de ahorro */
  savingsTarget: number
  /** Lo ya ahorrado */
  savingsCurrent: number
  /** Nombre del plan (ej. Fondo emergencia) */
  savingsName: string
}

export type PlanTier = 'free' | 'pro'
export type AppTheme = 'bosque' | 'oceano' | 'arena' | 'noche'

export interface AppSettings {
  currency: string
  countryCode: string
  onboardingDone: boolean
  orgName: string
  userName: string
  phoneWhatsapp: string
  role: OrgRole
  /** free | pro — Pro se activa tras pago WhatsApp + código */
  plan: PlanTier
  proActivatedAt?: string
  /** Apariencia visual */
  theme: AppTheme
}

export interface AppState {
  settings: AppSettings
  categories: Category[]
  transactions: Transaction[]
  invites: Invite[]
  scans: ScanEvent[]
  memberCode: string
  goals: MoneyGoals
}
