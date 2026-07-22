import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDefaultCategories } from './data/categories'
import { createSeedTransactions } from './data/seed'
import { detectCountry } from './lib/country'
import { inviteJoinUrl, randomToken } from './lib/whatsapp'
import type {
  AppSettings,
  AppState,
  Category,
  Invite,
  InviteKind,
  OrgRole,
  ScanEvent,
  Transaction,
} from './types'
import { uid } from './utils'

const STORAGE_KEY = 'cuanto-do-v2'

function defaultSettings(): AppSettings {
  const detected = detectCountry()
  return {
    currency: detected.currencyCode,
    countryCode: detected.countryCode,
    onboardingDone: false,
    orgName: 'Mi espacio',
    userName: '',
    phoneWhatsapp: '',
    role: 'owner',
  }
}

function freshState(): AppState {
  const categories = createDefaultCategories()
  return {
    settings: defaultSettings(),
    categories,
    transactions: createSeedTransactions(categories),
    invites: [],
    scans: [],
    memberCode: randomToken(8),
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as AppState
    const categories = parsed.categories?.length ? parsed.categories : createDefaultCategories()
    const transactions = parsed.transactions?.length
      ? parsed.transactions
      : createSeedTransactions(categories)
    return {
      settings: { ...defaultSettings(), ...parsed.settings },
      categories,
      transactions,
      invites: parsed.invites ?? [],
      scans: parsed.scans ?? [],
      memberCode: parsed.memberCode || randomToken(8),
    }
  } catch {
    return freshState()
  }
}

interface StoreContextValue {
  settings: AppSettings
  categories: Category[]
  transactions: Transaction[]
  invites: Invite[]
  scans: ScanEvent[]
  memberCode: string
  balance: number
  isAdmin: boolean
  completeOnboarding: (input: {
    userName: string
    orgName: string
    currency: string
    countryCode: string
    phoneWhatsapp: string
  }) => void
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt'>) => void
  deleteTransaction: (id: string) => void
  addCategory: (input: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) => void
  deleteCategory: (id: string) => void
  getCategory: (id: string) => Category | undefined
  createInvite: (input: { kind: InviteKind; role: OrgRole; label: string }) => Invite
  revokeInvite: (id: string) => void
  redeemInvite: (token: string, profile: { userName: string; phoneWhatsapp: string }) => boolean
  logScan: (input: { payload: string; source: ScanEvent['source']; label: string }) => void
  getInviteUrl: (token: string) => string
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const balance = useMemo(
    () =>
      state.transactions.reduce(
        (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
        0,
      ),
    [state.transactions],
  )

  const isAdmin = state.settings.role === 'owner' || state.settings.role === 'admin'

  const completeOnboarding = useCallback(
    (input: {
      userName: string
      orgName: string
      currency: string
      countryCode: string
      phoneWhatsapp: string
    }) => {
      setState((s) => ({
        ...s,
        settings: {
          ...s.settings,
          ...input,
          onboardingDone: true,
          role: 'owner',
        },
      }))
    },
    [],
  )

  const value: StoreContextValue = {
    settings: state.settings,
    categories: state.categories,
    transactions: state.transactions,
    invites: state.invites,
    scans: state.scans,
    memberCode: state.memberCode,
    balance,
    isAdmin,
    completeOnboarding,
    addTransaction: (input) => {
      const tx: Transaction = {
        ...input,
        id: uid('tx'),
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({ ...s, transactions: [tx, ...s.transactions] }))
    },
    deleteTransaction: (id) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.filter((t) => t.id !== id),
      }))
    },
    addCategory: (input) => {
      const cat: Category = { ...input, id: uid('cat') }
      setState((s) => ({ ...s, categories: [...s.categories, cat] }))
    },
    updateCategory: (id, patch) => {
      setState((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    deleteCategory: (id) => {
      setState((s) => ({
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
      }))
    },
    getCategory: (id) => state.categories.find((c) => c.id === id),
    createInvite: ({ kind, role, label }) => {
      const invite: Invite = {
        id: uid('inv'),
        token: randomToken(12),
        kind,
        role,
        label,
        createdAt: new Date().toISOString(),
        useCount: 0,
        maxUses: kind === 'checkin' ? 999 : 25,
      }
      setState((s) => ({ ...s, invites: [invite, ...s.invites] }))
      return invite
    },
    revokeInvite: (id) => {
      setState((s) => ({ ...s, invites: s.invites.filter((i) => i.id !== id) }))
    },
    redeemInvite: (token, profile) => {
      if (!token || token.length < 6) return false
      let accepted = false
      setState((s) => {
        const invite = s.invites.find((i) => i.token === token)
        if (invite && invite.useCount >= invite.maxUses) return s
        accepted = true
        const role = invite?.role ?? 'member'
        return {
          ...s,
          invites: invite
            ? s.invites.map((i) =>
                i.token === token ? { ...i, useCount: i.useCount + 1 } : i,
              )
            : s.invites,
          settings: {
            ...s.settings,
            onboardingDone: true,
            userName: profile.userName,
            phoneWhatsapp: profile.phoneWhatsapp,
            role,
            orgName: s.settings.orgName || 'Espacio compartido',
          },
          scans: [
            {
              id: uid('scan'),
              payload: token,
              source: 'whatsapp',
              label: `Registro: ${profile.userName}`,
              createdAt: new Date().toISOString(),
            },
            ...s.scans,
          ],
        }
      })
      return accepted
    },
    logScan: ({ payload, source, label }) => {
      setState((s) => ({
        ...s,
        scans: [
          {
            id: uid('scan'),
            payload,
            source,
            label,
            createdAt: new Date().toISOString(),
          },
          ...s.scans,
        ],
      }))
    },
    getInviteUrl: (token) => inviteJoinUrl(token),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
