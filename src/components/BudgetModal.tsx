import { useEffect, useState } from 'react'
import { categoriesFor } from '../lib/constants'
import { formatMonth, parseAmount } from '../lib/format'
import type { MonthBudget } from '../lib/types'
import { useData } from '../context/DataContext'
import { Icon } from './Icon'
import { Field, Modal, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  month: string
  initial?: MonthBudget
}

export default function BudgetModal({ open, onClose, month, initial }: Props) {
  const { saveBudget } = useData()
  const { toast } = useToast()
  const [overall, setOverall] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setOverall(initial ? String(initial.overall) : '')
    const next: Record<string, string> = {}
    for (const cat of categoriesFor('expense')) {
      const amount = initial?.categories?.[cat.id]
      next[cat.id] = amount ? String(amount) : ''
    }
    setValues(next)
    setError('')
  }, [open, initial])

  const categories = categoriesFor('expense')
  const allocated = categories.reduce((sum, cat) => sum + (parseAmount(values[cat.id] ?? '') || 0), 0)
  const overallValue = parseAmount(overall)

  const submit = () => {
    if (!overallValue || overallValue <= 0) {
      setError("Définissez une enveloppe mensuelle supérieure à zéro.")
      return
    }
    const categoriesMap: Record<string, number> = {}
    for (const cat of categories) {
      const amount = parseAmount(values[cat.id] ?? '')
      if (amount > 0) categoriesMap[cat.id] = Math.round(amount * 100) / 100
    }
    saveBudget(month, Math.round(overallValue * 100) / 100, categoriesMap)
    toast(`Budget de ${formatMonth(month)} enregistré`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Budget · ${formatMonth(month)}`}
      subtitle="Enveloppe globale et plafonds par catégorie."
      width="lg"
      footer={
        <>
          <span className="modal-note">
            {allocated > 0 ? `Réparti : ${allocated.toFixed(0)} €` : 'Aucune répartition'}
            {overallValue > 0 && allocated > overallValue ? ' · dépasse l’enveloppe' : ''}
          </span>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Enveloppe mensuelle globale" error={error || undefined}>
          <div className="input-affix">
            <span>€</span>
            <input
              className="input"
              inputMode="decimal"
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
              placeholder="1 500"
              autoFocus
            />
          </div>
        </Field>

        <div className="divider" />

        <div className="budget-form-grid">
          {categories.map((cat) => (
            <label key={cat.id} className="budget-form-row">
              <span className="budget-form-label">
                <span className="mini-line-icon" style={{ color: cat.color }}>
                  <Icon name={cat.icon} size={14} />
                </span>
                {cat.label}
              </span>
              <span className="input-affix input-affix-sm">
                <span>€</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={values[cat.id] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="0"
                />
              </span>
            </label>
          ))}
        </div>
        <p className="hint">
          Laissez vide pour ne pas plafonner une catégorie. Les dépenses déjà enregistrées sont prises en compte
          immédiatement.
        </p>
      </div>
    </Modal>
  )
}
