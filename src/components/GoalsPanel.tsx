import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Target } from 'lucide-react'
import { useStore } from '../store'
import { filterByPeriod, filterByType, formatMoney, sumAmounts } from '../utils'

interface GoalsPanelProps {
  onOpenMetas: () => void
}

function clampPct(current: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function GoalsPanel({ onOpenMetas }: GoalsPanelProps) {
  const { goals, transactions, settings } = useStore()
  const now = useMemo(() => new Date(), [])

  const monthIncome = useMemo(
    () => sumAmounts(filterByType(filterByPeriod(transactions, 'month', now), 'income')),
    [transactions, now],
  )
  const dayExpense = useMemo(
    () => sumAmounts(filterByType(filterByPeriod(transactions, 'day', now), 'expense')),
    [transactions, now],
  )
  const monthExpense = useMemo(
    () => sumAmounts(filterByType(filterByPeriod(transactions, 'month', now), 'expense')),
    [transactions, now],
  )

  const hasAny =
    goals.incomeMonth > 0 ||
    goals.expenseDay > 0 ||
    goals.expenseMonth > 0 ||
    goals.savingsTarget > 0

  const incomePct = clampPct(monthIncome, goals.incomeMonth)
  const dayPct = clampPct(dayExpense, goals.expenseDay)
  const monthPct = clampPct(monthExpense, goals.expenseMonth)
  const savePct = clampPct(goals.savingsCurrent, goals.savingsTarget)

  return (
    <section className="goals-panel">
      <div className="section-label">
        <h2>Metas</h2>
        <button type="button" className="link-btn" onClick={onOpenMetas}>
          {hasAny ? 'Editar' : 'Configurar'}
        </button>
      </div>

      {!hasAny ? (
        <button type="button" className="goals-empty" onClick={onOpenMetas}>
          <Target size={18} />
          <span>Definí ingresos, topes de gasto y tu plan de ahorro</span>
        </button>
      ) : (
        <div className="goals-list">
          {goals.incomeMonth > 0 ? (
            <div className="goal-row">
              <div className="goal-row-top">
                <span className="goal-ico income">
                  <ArrowDownLeft size={14} />
                </span>
                <div className="goal-copy">
                  <strong>Ingresos del mes</strong>
                  <span>
                    {formatMoney(monthIncome, settings.currency)} /{' '}
                    {formatMoney(goals.incomeMonth, settings.currency)}
                  </span>
                </div>
                <em>{incomePct}%</em>
              </div>
              <div className="goal-track">
                <div className="goal-fill income" style={{ width: `${incomePct}%` }} />
              </div>
            </div>
          ) : null}

          {goals.expenseDay > 0 ? (
            <div className="goal-row">
              <div className="goal-row-top">
                <span className="goal-ico expense">
                  <ArrowUpRight size={14} />
                </span>
                <div className="goal-copy">
                  <strong>Gastos de hoy</strong>
                  <span>
                    {formatMoney(dayExpense, settings.currency)} /{' '}
                    {formatMoney(goals.expenseDay, settings.currency)}
                  </span>
                </div>
                <em className={dayPct >= 100 ? 'over' : ''}>{dayPct}%</em>
              </div>
              <div className="goal-track">
                <div
                  className={`goal-fill expense ${dayPct >= 100 ? 'over' : ''}`}
                  style={{ width: `${dayPct}%` }}
                />
              </div>
            </div>
          ) : null}

          {goals.expenseMonth > 0 ? (
            <div className="goal-row">
              <div className="goal-row-top">
                <span className="goal-ico expense">
                  <ArrowUpRight size={14} />
                </span>
                <div className="goal-copy">
                  <strong>Gastos del mes</strong>
                  <span>
                    {formatMoney(monthExpense, settings.currency)} /{' '}
                    {formatMoney(goals.expenseMonth, settings.currency)}
                  </span>
                </div>
                <em className={monthPct >= 100 ? 'over' : ''}>{monthPct}%</em>
              </div>
              <div className="goal-track">
                <div
                  className={`goal-fill expense ${monthPct >= 100 ? 'over' : ''}`}
                  style={{ width: `${monthPct}%` }}
                />
              </div>
            </div>
          ) : null}

          {goals.savingsTarget > 0 ? (
            <div className="goal-row">
              <div className="goal-row-top">
                <span className="goal-ico save">
                  <PiggyBank size={14} />
                </span>
                <div className="goal-copy">
                  <strong>{goals.savingsName}</strong>
                  <span>
                    {formatMoney(goals.savingsCurrent, settings.currency)} /{' '}
                    {formatMoney(goals.savingsTarget, settings.currency)}
                  </span>
                </div>
                <em>{savePct}%</em>
              </div>
              <div className="goal-track">
                <div className="goal-fill save" style={{ width: `${savePct}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
