/**
 * Persistencia de cuentas (master + tenants) en JSON local del API.
 * Sin datos de ejemplo: solo se escriben al verificar OTP / cambiar plan.
 */
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.ACCOUNTS_DIR || path.join(__dirname, '../data')
const FILE = path.join(DATA_DIR, 'accounts.json')

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ accounts: [] }, null, 2), 'utf8')
  }
}

function readAll() {
  ensureStore()
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return Array.isArray(raw.accounts) ? raw.accounts : []
  } catch {
    return []
  }
}

function writeAll(accounts) {
  ensureStore()
  fs.writeFileSync(FILE, JSON.stringify({ accounts, updatedAt: Date.now() }, null, 2), 'utf8')
}

function masterPhonesFromEnv() {
  return String(process.env.MASTER_PHONES || '')
    .split(',')
    .map((p) => p.replace(/\D/g, ''))
    .filter(Boolean)
}

function listAccounts() {
  return readAll().sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0))
}

function findByPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '')
  if (!p) return null
  return readAll().find((a) => a.phone === p) || null
}

function hasMasterAccount() {
  return readAll().some((a) => a.role === 'master')
}

/**
 * ¿Este teléfono puede autenticarse como master?
 * - Está en MASTER_PHONES
 * - Ya es cuenta master registrada
 * - O aún no hay master (bootstrap primera vez)
 */
function canClaimMaster(phone) {
  const p = String(phone || '').replace(/\D/g, '')
  if (!p || p.length < 10) return false
  if (masterPhonesFromEnv().includes(p)) return true
  const existing = findByPhone(p)
  if (existing?.role === 'master') return true
  if (!hasMasterAccount()) return true
  return false
}

function upsertAccount({ phone, email, name, role, plan }) {
  const p = String(phone || '').replace(/\D/g, '')
  const accounts = readAll()
  const now = Date.now()
  const idx = p ? accounts.findIndex((a) => a.phone === p) : -1
  const emailNorm = email ? String(email).trim().toLowerCase() : ''

  if (idx >= 0) {
    const prev = accounts[idx]
    accounts[idx] = {
      ...prev,
      phone: p || prev.phone,
      email: emailNorm || prev.email || '',
      name: name != null && String(name).trim() ? String(name).trim().slice(0, 80) : prev.name,
      role: role || prev.role,
      plan: plan || prev.plan,
      lastLoginAt: now,
      updatedAt: now,
    }
  } else {
    accounts.push({
      id: `acc_${now}_${Math.random().toString(36).slice(2, 8)}`,
      phone: p,
      email: emailNorm,
      name: String(name || '').trim().slice(0, 80),
      role: role === 'master' ? 'master' : 'tenant',
      plan: plan === 'pro' ? 'pro' : role === 'master' ? 'pro' : 'free',
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
    })
  }
  writeAll(accounts)
  return findByPhone(p) || accounts[accounts.length - 1]
}

function setPlan(phone, plan) {
  const p = String(phone || '').replace(/\D/g, '')
  const accounts = readAll()
  const idx = accounts.findIndex((a) => a.phone === p)
  if (idx < 0) {
    return upsertAccount({ phone: p, role: 'tenant', plan })
  }
  accounts[idx] = {
    ...accounts[idx],
    plan: plan === 'pro' ? 'pro' : 'free',
    updatedAt: Date.now(),
  }
  writeAll(accounts)
  return accounts[idx]
}

function publicAccount(a) {
  if (!a) return null
  return {
    id: a.id,
    phone: a.phone || '',
    email: a.email || '',
    name: a.name || '',
    role: a.role,
    plan: a.plan,
    createdAt: a.createdAt,
    lastLoginAt: a.lastLoginAt,
  }
}

module.exports = {
  listAccounts,
  findByPhone,
  hasMasterAccount,
  canClaimMaster,
  upsertAccount,
  setPlan,
  publicAccount,
  masterPhonesFromEnv,
}
