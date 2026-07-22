import { useMemo, useState, type FormEvent } from 'react'
import { PiggyBank, Target } from 'lucide-react'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import { formatMoney } from '../utils'

interface MetasProps {
  onBack: () => void
}

export function Metas({ onBack }: MetasProps) {
  const { goals, settings, updateGoals, addSavings } = useStore()
  const [incomeMonth, setIncomeMonth] = useState(String(goals.incomeMonth || ''))
  const [expenseDay, setExpenseDay] = useState(String(goals.expenseDay || ''))
  const [expenseMonth, setExpenseMonth] = useState(String(goals.expenseMonth || ''))
  const [savingsTarget, setSavingsTarget] = useState(String(goals.savingsTarget || ''))
  const [savingsName, setSavingsName] = useState(goals.savingsName)
  const [aporte, setAporte] = useState('')
  const [saved, setSaved] = useState(false)

  const savingsPct = useMemo(() => {
    if (goals.savingsTarget <= 0) return 0
    return Math.min(100, Math.round((goals.savingsCurrent / goals.savingsTarget) * 100))
  }, [goals.savingsCurrent, goals.savingsTarget])

  function handleSave(e: FormEvent) {
    e.preventDefault()
    updateGoals({
      incomeMonth: Number(incomeMonth) || 0,
      expenseDay: Number(expenseDay) || 0,
      expenseMonth: Number(expenseMonth) || 0,
      savingsTarget: Number(savingsTarget) || 0,
      savingsName: savingsName.trim() || 'Fondo de ahorro',
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  function handleAporte(e: FormEvent) {
    e.preventDefault()
    const n = Number(aporte)
    if (n <= 0) return
    addSavings(n)
    setAporte('')
  }

  return (
    <Screen>
      <header className="screen-header row">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Volver
        </button>
        <h1>Metas</h1>
        <p className="muted small">Ingresos, topes de gasto y plan de ahorro.</p>
      </header>

      <FadeIn>
        <form className="metas-form" onSubmit={handleSave}>
          <label className="field">
            <span className="field-label">Meta de ingresos (mes)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={incomeMonth}
              onChange={(e) => setIncomeMonth(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Tope de gastos (día)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={expenseDay}
              onChange={(e) => setExpenseDay(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Tope de gastos (mes)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={expenseMonth}
              onChange={(e) => setExpenseMonth(e.target.value)}
            />
          </label>

          <div className="metas-block">
            <div className="metas-block-head">
              <PiggyBank size={18} />
              <span>Plan de ahorro</span>
            </div>
            <label className="field">
              <span className="field-label">Nombre</span>
              <input
                type="text"
                maxLength={40}
                value={savingsName}
                onChange={(e) => setSavingsName(e.target.value)}
                placeholder="Fondo de ahorro"
              />
            </label>
            <label className="field">
              <span className="field-label">Meta a alcanzar</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="btn-primary btn-block">
            <Target size={18} />
            {saved ? 'Guardado' : 'Guardar metas'}
          </button>
        </form>
      </FadeIn>

      {goals.savingsTarget > 0 ? (
        <FadeIn delay={0.06} className="savings-card">
          <div className="section-head">
            <strong>{goals.savingsName}</strong>
            <span className="muted small">{savingsPct}%</span>
          </div>
          <div className="goal-track">
            <div className="goal-fill income" style={{ width: `${savingsPct}%` }} />
          </div>
          <p className="muted small">
            {formatMoney(goals.savingsCurrent, settings.currency)} de{' '}
            {formatMoney(goals.savingsTarget, settings.currency)}
          </p>
          <form className="aporte-row" onSubmit={handleAporte}>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Aporte"
              value={aporte}
              onChange={(e) => setAporte(e.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={!(Number(aporte) > 0)}>
              Sumar
            </button>
          </form>
        </FadeIn>
      ) : null}
    </Screen>
  )
}
