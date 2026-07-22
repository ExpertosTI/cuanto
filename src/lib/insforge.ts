import { createClient, type InsForgeClient } from '@insforge/sdk'

const baseUrl = import.meta.env.VITE_INSFORGE_URL as string | undefined
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined

export const isInsForgeConfigured = Boolean(baseUrl && anonKey)

export const insforge: InsForgeClient | null = isInsForgeConfigured
  ? createClient({ baseUrl: baseUrl!, anonKey: anonKey! })
  : null
