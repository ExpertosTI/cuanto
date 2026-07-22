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
import { detectCountry } from './lib/country'
import {
  insforgeDelete,
  insforgeInsert,
  insforgeQuery,
  insforgeUpsert,
  isInsForgeConfigured,
  probeInsForge,
} from './lib/insforge'
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

/** v3: sin datos demo; limpia localStorage antiguo con seed */
const STORAGE_KEY = 'cuanto-v3'

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
  return {
    settings: defaultSettings(),
    categories: createDefaultCategories(),
    transactions: [],
    invites: [],
    scans: [],
    memberCode: randomToken(8),
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.removeItem('cuanto-do-v2')
      return freshState()
    }
    const parsed = JSON.parse(raw) as AppState
    return {
      settings: { ...defaultSettings(), ...parsed.settings },
      categories: parsed.categories?.length ? parsed.categories : createDefaultCategories(),
      transactions: parsed.transactions ?? [],
      invites: parsed.invites ?? [],
      scans: parsed.scans ?? [],
      memberCode: parsed.memberCode || randomToken(8),
    }
  } catch {
    return freshState()
  }
}

function spaceIdFrom(state: AppState) {
  return `space_${state.memberCode}`
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
  cloudConnected: boolean | null
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
  const [cloudConnected, setCloudConnected] = useState<boolean | null>(
    isInsForgeConfigured ? null : false,
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    let cancelled = false
    async function syncFromCloud() {
      if (!isInsForgeConfigured) {
        setCloudConnected(false)
        return
      }
      const probe = await probeInsForge()
      if (cancelled) return
      setCloudConnected(probe.connected)

      if (!probe.connected || !state.settings.onboardingDone) return

      const sid = spaceIdFrom(state)
      const [cats, txs] = await Promise.all([
        insforgeQuery<{
          id: string
          name: string
          icon: string
          color: string
          type: 'expense' | 'income'
          is_default?: boolean
        }>('cuanto_categories', `space_id=eq.${encodeURIComponent(sid)}`),
        insforgeQuery<{
          id: string
          category_id: string
          type: 'expense' | 'income'
          amount: number | string
          occurred_on: string
          note: string
          created_at: string
        }>('cuanto_transactions', `space_id=eq.${encodeURIComponent(sid)}&order=occurred_on.desc`),
      ])

      if (cancelled) return

      setState((s) => {
        const next = { ...s }
        if (cats.ok && cats.data && cats.data.length > 0) {
          next.categories = cats.data.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            type: c.type,
            isDefault: Boolean(c.is_default),
          }))
        }
        if (txs.ok && txs.data) {
          next.transactions = txs.data.map((t) => ({
            id: t.id,
            categoryId: t.category_id,
            type: t.type,
            amount: Number(t.amount),
            date: t.occurred_on,
            note: t.note ?? '',
            createdAt: t.created_at,
          }))
        }
        return next
      })
    }
    void syncFromCloud()
    return () => {
      cancelled = true
    }
    // Solo al montar / cuando termina onboarding
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.onboardingDone])

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
      setState((s) => {
        const next: AppState = {
          ...s,
          settings: {
            ...s.settings,
            ...input,
            onboardingDone: true,
            role: 'owner',
          },
        }
        const sid = spaceIdFrom(next)
        void insforgeUpsert('cuanto_spaces', {
          id: sid,
          name: input.orgName,
          currency_code: input.currency,
          country_code: input.countryCode,
          user_name: input.userName,
          phone_whatsapp: input.phoneWhatsapp,
          role: 'owner',
          updated_at: new Date().toISOString(),
        })
        void insforgeUpsert(
          'cuanto_categories',
          next.categories.map((c) => ({
            id: c.id,
            space_id: sid,
            name: c.name,
            icon: c.icon,
            color: c.color,
            type: c.type,
            is_default: Boolean(c.isDefault),
            updated_at: new Date().toISOString(),
          })),
        )
        return next
      })
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
    cloudConnected,
    completeOnboarding,
    addTransaction: (input) => {
      const tx: Transaction = {
        ...input,
        id: uid('tx'),
        createdAt: new Date().toISOString(),
      }
      setState((s) => {
        const next = { ...s, transactions: [tx, ...s.transactions] }
        void insforgeInsert('cuanto_transactions', {
          id: tx.id,
          space_id: spaceIdFrom(next),
          category_id: tx.categoryId,
          type: tx.type,
          amount: tx.amount,
          occurred_on: tx.date,
          note: tx.note,
          created_at: tx.createdAt,
        })
        return next
      })
    },
    deleteTransaction: (id) => {
      setState((s) => {
        void insforgeDelete('cuanto_transactions', `id=eq.${encodeURIComponent(id)}`)
        return {
          ...s,
          transactions: s.transactions.filter((t) => t.id !== id),
        }
      })
    },
    addCategory: (input) => {
      const cat: Category = { ...input, id: uid('cat') }
      setState((s) => {
        const next = { ...s, categories: [...s.categories, cat] }
        void insforgeUpsert('cuanto_categories', {
          id: cat.id,
          space_id: spaceIdFrom(next),
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        return next
      })
    },
    updateCategory: (id, patch) => {
      setState((s) => {
        const categories = s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
        const cat = categories.find((c) => c.id === id)
        if (cat) {
          void insforgeUpsert('cuanto_categories', {
            id: cat.id,
            space_id: spaceIdFrom(s),
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            is_default: Boolean(cat.isDefault),
            updated_at: new Date().toISOString(),
          })
        }
        return { ...s, categories }
      })
    },
    deleteCategory: (id) => {
      setState((s) => {
        void insforgeDelete('cuanto_categories', `id=eq.${encodeURIComponent(id)}`)
        return {
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
        }
      })
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
