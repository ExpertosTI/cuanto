import { useMemo, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import { Screen } from '../components/Motion'
import { useStore } from '../store'
import type { TransactionType } from '../types'

interface AgregarProps {
  onDone: () => void
  onManageCategories: () => void
  initialType?: TransactionType
}

export function Agregar({ onDone, onManageCategories, initialType = 'expense' }: AgregarProps) {
  const { categories, addTransaction } = useStore()
  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const filteredCats = useMemo(() => categories.filter((c) => c.type === type), [categories, type])
  const selectedCategory = categoryId || filteredCats[0]?.id || ''
  const canSave = Number(amount) > 0 && selectedCategory

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    addTransaction({
      amount: Number(amount),
      categoryId: selectedCategory,
      type,
      date,
      note: note.trim(),
    })
    onDone()
  }

  return (
    <Screen className={type === 'income' ? 'mode-income' : 'mode-expense'}>
      <header className="screen-header">
        <h1>Agregar</h1>
        <div className="type-toggle">
          <button
            type="button"
            className={type === 'expense' ? 'active expense-active' : ''}
            onClick={() => {
              setType('expense')
              setCategoryId('')
            }}
          >
            Gasto
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active income-active' : ''}
            onClick={() => {
              setType('income')
              setCategoryId('')
            }}
          >
            Ingreso
          </button>
        </div>
      </header>

      <form className="add-form" onSubmit={handleSubmit}>
        <label className="amount-field">
          <span className="field-label">Monto</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>

        <div className="form-section">
          <div className="section-head">
            <span className="field-label">Categoría</span>
            <button type="button" className="link-btn" onClick={onManageCategories}>
              Renombrar / gestionar
            </button>
          </div>
          <div className="cat-grid">
            {filteredCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`cat-pick ${selectedCategory === cat.id ? 'selected' : ''}`}
                onClick={() => setCategoryId(cat.id)}
              >
                <span className="cat-badge lg" style={{ background: cat.color }}>
                  <CategoryIcon name={cat.icon} size={20} color="#fff" />
                </span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Nota</span>
          <input
            type="text"
            placeholder="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
          />
        </label>

        <button type="submit" className="btn-primary btn-block" disabled={!canSave}>
          <Check size={18} />
          Guardar
        </button>
      </form>
    </Screen>
  )
}
