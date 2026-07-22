import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { DonutChart } from '../components/DonutChart'
import { CategoryIcon } from '../components/CategoryIcon'
import { PeriodTabs } from '../components/PeriodTabs'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import type { Period } from '../types'
import { filterByPeriod, filterByType, formatMoney, sumAmounts } from '../utils'

interface ResumenProps {
  onAdd: () => void
}

export function Resumen({ onAdd }: ResumenProps) {
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
            <span className="pill-soft">{settings.currency}</span>
          </div>
          <div className="balance-split">
            <div className="income-chip">
              <span className="muted">Ingresos</span>
              <strong>{formatMoney(incomeTotal, settings.currency)}</strong>
            </div>
            <div className="expense-chip">
              <span className="muted">Gastos</span>
              <strong>{formatMoney(expenseTotal, settings.currency)}</strong>
            </div>
          </div>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
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

      <section className="category-breakdown">
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
                  <p className="breakdown-amount">{formatMoney(item.value, settings.currency)}</p>
                </div>
              </FadeIn>
            )
          })
        )}
      </section>

      <button type="button" className="fab" aria-label="Agregar movimiento" onClick={onAdd}>
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </Screen>
  )
}
