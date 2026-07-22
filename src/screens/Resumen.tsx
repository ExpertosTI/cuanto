import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'
import { DonutChart } from '../components/DonutChart'
import { CategoryIcon } from '../components/CategoryIcon'
import { GoalsPanel } from '../components/GoalsPanel'
import { PeriodTabs } from '../components/PeriodTabs'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import type { Period, TransactionType } from '../types'
import { filterByPeriod, filterByType, formatMoney, sumAmounts } from '../utils'

interface ResumenProps {
  onAdd: (type?: TransactionType) => void
  onOpenMetas: () => void
  onOpenPro?: () => void
  isPro?: boolean
}

export function Resumen({ onAdd, onOpenMetas, onOpenPro, isPro }: ResumenProps) {
  const { balance, transactions, categories, settings } = useStore()
  const [period, setPeriod] = useState<Period>('month')
  const [reference, setReference] = useState(new Date())

  const periodTx = useMemo(
    () => filterByPeriod(transactions, period, reference),
    [transactions, period, reference],
  )
  const expenses = useMemo(() => filterByType(periodTx, 'expense'), [periodTx])
  const income = useMemo(() => filterByType(periodTx, 'income'), [periodTx])
  const expenseTotal = sumAmounts(expenses)
  const incomeTotal = sumAmounts(income)

  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of expenses) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return {
          name: cat?.name ?? 'Otro',
          value,
          color: cat?.color ?? '#94A3B8',
          icon: cat?.icon ?? 'wallet',
          categoryId,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [expenses, categories])

  return (
    <Screen>
      <FadeIn>
        <header className="screen-header balance-header">
          <div className="balance-top">
            <div>
              <p className="eyebrow">Balance · {settings.orgName}</p>
              <h1 className="balance-amount">{formatMoney(balance, settings.currency)}</h1>
            </div>
            <div className="balance-badges">
              <span className="pill-soft">{settings.currency}</span>
              {onOpenPro ? (
                <button
                  type="button"
                  className={`pill-soft pro-pill ${isPro ? 'on' : ''}`}
                  onClick={onOpenPro}
                >
                  {isPro ? 'Pro' : 'Pro $1.99'}
                </button>
              ) : null}
            </div>
          </div>
          <div className="balance-split">
            <button
              type="button"
              className="income-chip chip-action"
              onClick={() => onAdd('income')}
              aria-label="Agregar ingreso"
            >
              <span className="chip-top">
                <span className="chip-icon" aria-hidden>
                  <ArrowDownLeft size={16} strokeWidth={2.4} />
                </span>
                <span className="muted">Ingresos</span>
              </span>
              <strong>{formatMoney(incomeTotal, settings.currency)}</strong>
              <span className="chip-hint">+ Agregar</span>
            </button>
            <button
              type="button"
              className="expense-chip chip-action"
              onClick={() => onAdd('expense')}
              aria-label="Agregar gasto"
            >
              <span className="chip-top">
                <span className="chip-icon" aria-hidden>
                  <ArrowUpRight size={16} strokeWidth={2.4} />
                </span>
                <span className="muted">Gastos</span>
              </span>
              <strong>{formatMoney(expenseTotal, settings.currency)}</strong>
              <span className="chip-hint">+ Agregar</span>
            </button>
          </div>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <GoalsPanel onOpenMetas={onOpenMetas} />
      </FadeIn>

      <FadeIn delay={0.08}>
        <PeriodTabs
          period={period}
          onPeriodChange={setPeriod}
          reference={reference}
          onReferenceChange={setReference}
        />
      </FadeIn>

      <DonutChart
        data={chartData}
        centerLabel="Gastos"
        centerValue={formatMoney(expenseTotal, settings.currency)}
      />

      <div className="section-label">
        <h2>Por categoría</h2>
        <span>{chartData.length} ítems</span>
      </div>

      <section className="category-breakdown has-fab">
        {chartData.length === 0 ? (
          <p className="empty-hint">Aún no hay gastos en este período. Toca + para agregar uno.</p>
        ) : (
          chartData.map((item, i) => {
            const pct = expenseTotal > 0 ? Math.round((item.value / expenseTotal) * 100) : 0
            return (
              <FadeIn key={item.categoryId} delay={0.04 * i}>
                <div className="breakdown-row">
                  <div className="breakdown-left">
                    <span className="cat-badge" style={{ background: item.color }}>
                      <CategoryIcon name={item.icon} size={16} color="#fff" />
                    </span>
                    <div>
                      <p className="breakdown-name">{item.name}</p>
                      <p className="breakdown-pct">{pct}%</p>
                    </div>
                  </div>
                  <p className="breakdown-amount expense-text">
                    {formatMoney(item.value, settings.currency)}
                  </p>
                </div>
              </FadeIn>
            )
          })
        )}
      </section>

      <button type="button" className="fab" aria-label="Agregar movimiento" onClick={() => onAdd()}>
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </Screen>
  )
}
