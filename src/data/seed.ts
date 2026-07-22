import type { Category, Transaction } from '../types'
import { uid } from '../utils'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Datos iniciales DOP para que la app no arranque vacía */
export function createSeedTransactions(categories: Category[]): Transaction[] {
  const byName = (name: string) => categories.find((c) => c.name === name)?.id
  const salario = byName('Salario')
  const remesas = byName('Remesas')
  const mercado = byName('Colmado / Mercado')
  const comida = byName('Comida')
  const transporte = byName('Transporte')
  const luz = byName('Luz / Agua / Internet')
  const now = new Date().toISOString()

  const rows: Array<Omit<Transaction, 'id' | 'createdAt'> & { createdAt?: string }> = [
    { amount: 45000, categoryId: salario ?? '', type: 'income', date: daysAgo(12), note: 'Quincena' },
    { amount: 8000, categoryId: remesas ?? '', type: 'income', date: daysAgo(8), note: '' },
    { amount: 3200, categoryId: mercado ?? '', type: 'expense', date: daysAgo(6), note: 'Compra semanal' },
    { amount: 850, categoryId: comida ?? '', type: 'expense', date: daysAgo(4), note: '' },
    { amount: 400, categoryId: transporte ?? '', type: 'expense', date: daysAgo(3), note: 'Motoconcho' },
    { amount: 2100, categoryId: luz ?? '', type: 'expense', date: daysAgo(2), note: 'Edesur' },
    { amount: 650, categoryId: comida ?? '', type: 'expense', date: daysAgo(1), note: '' },
    { amount: 1500, categoryId: mercado ?? '', type: 'expense', date: daysAgo(0), note: 'Colmado' },
  ]

  return rows
    .filter((r) => r.categoryId)
    .map((r) => ({
      id: uid('tx'),
      amount: r.amount,
      categoryId: r.categoryId,
      type: r.type,
      date: r.date,
      note: r.note,
      createdAt: r.createdAt ?? now,
    }))
}
