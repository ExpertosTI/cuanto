import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import { Screen } from '../components/Motion'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categories'
import { useStore } from '../store'
import type { AppTheme, TransactionType } from '../types'

interface CategoriasProps {
  onBack: () => void
  onOpenEquipo?: () => void
  onOpenMetas?: () => void
  onOpenPro?: () => void
}

const THEMES: { id: AppTheme; label: string; swatch: string }[] = [
  { id: 'bosque', label: 'Bosque', swatch: '#2f7a56' },
  { id: 'oceano', label: 'Océano', swatch: '#2a6f9b' },
  { id: 'arena', label: 'Arena', swatch: '#a67c3d' },
  { id: 'noche', label: 'Noche', swatch: '#1a2220' },
]

export function Categorias({ onBack, onOpenEquipo, onOpenMetas, onOpenPro }: CategoriasProps) {
  const { categories, addCategory, updateCategory, deleteCategory, settings, setTheme } = useStore()
  const [type, setType] = useState<TransactionType>('expense')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0])
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const list = categories.filter((c) => c.type === type)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addCategory({ name: trimmed, icon, color, type })
    setName('')
  }

  function startEdit(id: string, current: string) {
    setEditingId(id)
    setEditName(current)
  }

  function saveEdit(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    updateCategory(id, { name: trimmed })
    setEditingId(null)
  }

  return (
    <Screen className={type === 'income' ? 'mode-income' : 'mode-expense'}>
      <header className="screen-header row">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Volver
        </button>
        <h1>Más</h1>
        <p className="muted small">Pro, metas, equipo, temas y categorías.</p>
        <div className="cat-extra-links">
          {onOpenPro ? (
            <button type="button" className="btn-primary btn-block" onClick={onOpenPro}>
              Cuanto Pro · $1.99
            </button>
          ) : null}
          {onOpenMetas ? (
            <button type="button" className="btn-secondary btn-block" onClick={onOpenMetas}>
              Metas e ingresos
            </button>
          ) : null}
          {onOpenEquipo ? (
            <button type="button" className="btn-secondary btn-block" onClick={onOpenEquipo}>
              Equipo e invitaciones
            </button>
          ) : null}
        </div>

        <div className="theme-picker">
          <p className="field-label">Tema</p>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-chip ${settings.theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
              >
                <span className="theme-swatch" style={{ background: t.swatch }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="type-toggle">
        <button
          type="button"
          className={type === 'expense' ? 'active expense-active' : ''}
          onClick={() => setType('expense')}
        >
          Gasto
        </button>
        <button
          type="button"
          className={type === 'income' ? 'active income-active' : ''}
          onClick={() => setType('income')}
        >
          Ingreso
        </button>
      </div>

      <form className="cat-form" onSubmit={handleAdd}>
        <label className="field">
          <span className="field-label">Nueva categoría</span>
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
        </label>

        <div className="form-section">
          <span className="field-label">Ícono</span>
          <div className="icon-picker">
            {CATEGORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-pick ${icon === ic ? 'selected' : ''}`}
                onClick={() => setIcon(ic)}
              >
                <CategoryIcon name={ic} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <span className="field-label">Color</span>
          <div className="color-picker">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={!name.trim()}>
          Agregar categoría
        </button>
      </form>

      <section className="cat-list">
        <h2 className="section-title">Tus categorías ({type === 'income' ? 'ingresos' : 'gastos'})</h2>
        {list.map((cat) => (
          <div key={cat.id} className="cat-list-row">
            <span className="cat-badge" style={{ background: cat.color }}>
              <CategoryIcon name={cat.icon} size={16} color="#fff" />
            </span>
            {editingId === cat.id ? (
              <div className="inline-edit">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <button type="button" className="link-btn" onClick={() => saveEdit(cat.id)}>
                  Guardar
                </button>
              </div>
            ) : (
              <>
                <span className="cat-list-name">{cat.name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Renombrar ${cat.name}`}
                  onClick={() => startEdit(cat.id, cat.name)}
                >
                  <Pencil size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-btn danger"
              aria-label={`Eliminar ${cat.name}`}
              onClick={() => deleteCategory(cat.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </section>

      <p className="app-legal-links">
        <a href="/privacidad">Privacidad</a>
        <span>·</span>
        <a href="/terminos">Términos</a>
      </p>
    </Screen>
  )
}
