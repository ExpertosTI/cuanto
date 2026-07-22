import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Period } from '../types'
import { periodLabel, shiftPeriod } from '../utils'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
]

interface PeriodTabsProps {
  period: Period
  onPeriodChange: (p: Period) => void
  reference: Date
  onReferenceChange: (d: Date) => void
}

export function PeriodTabs({ period, onPeriodChange, reference, onReferenceChange }: PeriodTabsProps) {
  return (
    <div className="period-block">
      <div className="period-tabs" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            className={`period-tab ${period === p.id ? 'active' : ''}`}
            onClick={() => onPeriodChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="period-nav">
        <button
          type="button"
          className="icon-btn"
          aria-label="Anterior"
          onClick={() => onReferenceChange(shiftPeriod(period, reference, -1))}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="period-label">{periodLabel(period, reference)}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Siguiente"
          onClick={() => onReferenceChange(shiftPeriod(period, reference, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
