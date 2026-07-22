import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { currencyByCode } from './lib/country'
import type { Period, Transaction, TransactionType } from './types'

export function formatMoney(amount: number, currencyCode: string): string {
  const currency = currencyByCode(currencyCode)
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: ['CLP', 'COP', 'DOP'].includes(currency.code) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency.symbol}${amount.toLocaleString(currency.locale)}`
  }
}

export function getPeriodRange(period: Period, reference = new Date()) {
  switch (period) {
    case 'day':
      return { start: startOfDay(reference), end: endOfDay(reference) }
    case 'week':
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      }
    case 'month':
      return { start: startOfMonth(reference), end: endOfMonth(reference) }
    case 'year':
      return { start: startOfYear(reference), end: endOfYear(reference) }
  }
}

export function filterByPeriod(transactions: Transaction[], period: Period, reference = new Date()) {
  const range = getPeriodRange(period, reference)
  return transactions.filter((t) => isWithinInterval(parseISO(t.date), range))
}

export function filterByType(transactions: Transaction[], type: TransactionType) {
  return transactions.filter((t) => t.type === type)
}

export function sumAmounts(transactions: Transaction[]) {
  return transactions.reduce((acc, t) => acc + t.amount, 0)
}

export function periodLabel(period: Period, reference = new Date()): string {
  switch (period) {
    case 'day':
      return format(reference, "d 'de' MMMM", { locale: es })
    case 'week': {
      const { start, end } = getPeriodRange(period, reference)
      return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM', { locale: es })}`
    }
    case 'month':
      return format(reference, 'MMMM yyyy', { locale: es })
    case 'year':
      return format(reference, 'yyyy')
  }
}

export function shiftPeriod(period: Period, reference: Date, direction: -1 | 1): Date {
  const d = new Date(reference)
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + direction)
      break
    case 'week':
      d.setDate(d.getDate() + direction * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + direction)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + direction)
      break
  }
  return d
}

export function groupByDate(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>()
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )
  for (const t of sorted) {
    const list = map.get(t.date) ?? []
    list.push(t)
    map.set(t.date, list)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export function formatDateLabel(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE d 'de' MMMM", { locale: es })
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

/** Exporta movimientos a CSV (Excel / Sheets). */
export function downloadTransactionsCsv(
  transactions: Transaction[],
  categories: { id: string; name: string }[],
  filename = 'cuanto-movimientos.csv',
) {
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  const rows = [
    ['fecha', 'tipo', 'categoria', 'monto', 'nota', 'creado'].join(','),
    ...[...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((t) =>
        [
          t.date,
          t.type,
          csvEscape(catName(t.categoryId)),
          String(t.amount),
          csvEscape(t.note || ''),
          t.createdAt,
        ].join(','),
      ),
  ]
  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
