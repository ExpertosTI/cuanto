import { useMemo, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import { PeriodTabs } from '../components/PeriodTabs'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import type { Period, TransactionType } from '../types'
import {
  downloadTransactionsCsv,
  filterByPeriod,
  filterByType,
  formatDateLabel,
  formatMoney,
  groupByDate,
  sumAmounts,
} from '../utils'

interface MovimientosProps {
  onOpenPro?: () => void
}

export function Movimientos({ onOpenPro }: MovimientosProps) {
  const { transactions, categories, settings, getCategory, deleteTransaction, isPro } = useStore()
  const [type, setType] = useState<TransactionType>('expense')
  const [period, setPeriod] = useState<Period>('week')
  const [reference, setReference] = useState(new Date())

  const filtered = useMemo(
    () => filterByType(filterByPeriod(transactions, period, reference), type),
    [transactions, period, reference, type],
  )
  const total = sumAmounts(filtered)
  const groups = groupByDate(filtered)

  function handleExport() {
    if (!isPro) {
      onOpenPro?.()
      return
    }
    downloadTransactionsCsv(transactions, categories)
  }

  return (
    <Screen className={type === 'income' ? 'mode-income' : 'mode-expense'}>
      <header className="screen-header">
        <div className="section-label" style={{ margin: 0 }}>
          <h1>Movimientos</h1>
          <button type="button" className="link-btn" onClick={handleExport}>
            <Download size={16} style={{ verticalAlign: '-3px', marginRight: 4 }} />
            {isPro ? 'Exportar' : 'Exportar Pro'}
          </button>
        </div>
        <div className="type-toggle">
          <button
            type="button"
            className={type === 'expense' ? 'active expense-active' : ''}
            onClick={() => setType('expense')}
          >
            Gastos
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active income-active' : ''}
            onClick={() => setType('income')}
          >
            Ingresos
          </button>
        </div>
      </header>

      <PeriodTabs
        period={period}
        onPeriodChange={setPeriod}
        reference={reference}
        onReferenceChange={setReference}
      />

      <div className={`total-banner ${type === 'income' ? 'mode-income' : 'mode-expense'}`}>
        <span>Total</span>
        <strong className={type === 'income' ? 'income-text' : 'expense-text'}>
          {formatMoney(total, settings.currency)}
        </strong>
      </div>

      <div className="tx-list">
        {groups.length === 0 ? (
          <p className="empty-hint">No hay movimientos en este período.</p>
        ) : (
          groups.map((group) => (
            <section key={group.date} className="tx-group">
              <h2 className="tx-date">{formatDateLabel(group.date)}</h2>
              {group.items.map((tx, i) => {
                const cat = getCategory(tx.categoryId)
                return (
                  <FadeIn key={tx.id} delay={0.03 * i}>
                    <div className="tx-row">
                      <span className="cat-badge" style={{ background: cat?.color ?? '#94A3B8' }}>
                        <CategoryIcon name={cat?.icon ?? 'wallet'} size={16} color="#fff" />
                      </span>
                      <div className="tx-info">
                        <p className="tx-name">{cat?.name ?? 'Sin categoría'}</p>
                        {tx.note ? <p className="tx-note">{tx.note}</p> : null}
                      </div>
                      <p className={`tx-amount ${tx.type === 'income' ? 'income-text' : 'expense-text'}`}>
                        {formatMoney(tx.amount, settings.currency)}
                      </p>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Eliminar"
                        onClick={() => deleteTransaction(tx.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </FadeIn>
                )
              })}
            </section>
          ))
        )}
      </div>
    </Screen>
  )
}
