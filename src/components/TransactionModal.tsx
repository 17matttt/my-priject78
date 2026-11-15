import { useEffect, useMemo, useState } from 'react'
import { categoriesFor, PAYMENT_METHODS, RECURRENCES } from '../lib/constants'
import { todayIso, parseAmount } from '../lib/format'
import type { PaymentMethod, Recurrence, Transaction, TxType } from '../lib/types'
import { useData } from '../context/DataContext'
import { Field, Modal, Segmented, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Transaction | null
  defaultType?: TxType
  defaultDate?: string
}

export default function TransactionModal({ open, onClose, initial, defaultType = 'expense', defaultDate }: Props) {
  const { addTransaction, updateTransaction } = useData()
  const { toast } = useToast()

  const [type, setType] = useState<TxType>(defaultType)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('courses')
  const [date, setDate] = useState(defaultDate ?? todayIso())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setType(initial.type)
      setName(initial.name)
      setAmount(String(initial.amount))
      setCategory(initial.category)
      setDate(initial.date)
      setPaymentMethod(initial.paymentMethod)
      setRecurrence(initial.recurrence)
      setNotes(initial.notes)
    } else {
      setType(defaultType)
      setName('')
      setAmount('')
      setCategory(defaultType === 'income' ? 'salaire' : 'courses')
      setDate(defaultDate ?? todayIso())
      setPaymentMethod('card')
      setRecurrence('none')
      setNotes('')
    }
    setErrors({})
  }, [open, initial, defaultType, defaultDate])

  const categories = useMemo(() => categoriesFor(type), [type])

  const handleTypeChange = (next: TxType) => {
    setType(next)
    if (!categoriesFor(next).some((c) => c.id === category)) {
      setCategory(categoriesFor(next)[0].id)
    }
  }

  const submit = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Un libellé est requis.'
    const value = parseAmount(amount)
    if (!value || value <= 0) nextErrors.amount = 'Saisissez un montant supérieur à 0.'
    if (!date) nextErrors.date = 'Choisissez une date.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      type,
      name: name.trim(),
      amount: Math.round(value * 100) / 100,
      category,
      date,
      paymentMethod,
      recurrence,
      notes: notes.trim(),
    }

    if (initial) {
      updateTransaction(initial.id, payload)
      toast('Transaction mise à jour')
    } else {
      addTransaction(payload)
      toast(type === 'income' ? 'Revenu ajouté' : 'Dépense ajoutée')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier la transaction' : 'Nouvelle transaction'}
      subtitle="Les données restent stockées sur cet appareil."
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Segmented
          options={[
            { id: 'expense', label: 'Dépense' },
            { id: 'income', label: 'Revenu' },
          ]}
          value={type}
          onChange={(v) => handleTypeChange(v as TxType)}
        />

        <Field label="Libellé" error={errors.name}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Courses hebdomadaires"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Montant" error={errors.amount}>
            <div className="input-affix">
              <span>€</span>
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </Field>
          <Field label="Date" error={errors.date}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Catégorie">
          <div className="cat-picker">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat-chip ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
                style={category === c.id ? { borderColor: c.color, color: c.color } : undefined}
              >
                <span className="cat-dot" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="form-grid">
          <Field label="Moyen de paiement">
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Récurrence" hint="Les récurrences apparaissent dans le calendrier.">
            <select
              className="select"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              {RECURRENCES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes (optionnel)">
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informations complémentaires…"
          />
        </Field>
      </div>
    </Modal>
  )
}
