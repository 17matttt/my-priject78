import { useEffect, useState } from 'react'
import { EVENT_KINDS } from '../lib/constants'
import { parseAmount, todayIso } from '../lib/format'
import type { CalendarEvent, EventKind } from '../lib/types'
import { useData } from '../context/DataContext'
import { Field, Modal, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  initial?: CalendarEvent | null
  defaultDate?: string
}

export default function EventModal({ open, onClose, initial, defaultDate }: Props) {
  const { addEvent, updateEvent } = useData()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate ?? todayIso())
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<EventKind>('bill')
  const [notes, setNotes] = useState('')
  const [paid, setPaid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setDate(initial.date)
      setAmount(initial.amount === null ? '' : String(initial.amount))
      setKind(initial.kind)
      setNotes(initial.notes)
      setPaid(initial.paid)
    } else {
      setTitle('')
      setDate(defaultDate ?? todayIso())
      setAmount('')
      setKind('bill')
      setNotes('')
      setPaid(false)
    }
    setErrors({})
  }, [open, initial, defaultDate])

  const submit = () => {
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = 'Un intitulé est requis.'
    if (!date) nextErrors.date = 'Choisissez une date.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const value = parseAmount(amount)
    const payload = {
      title: title.trim(),
      date,
      amount: amount.trim() ? Math.round(value * 100) / 100 : null,
      kind,
      notes: notes.trim(),
      paid,
    }
    if (initial) {
      updateEvent(initial.id, payload)
      toast('Événement mis à jour')
    } else {
      addEvent(payload)
      toast('Événement ajouté au calendrier')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Modifier l'événement" : 'Nouvel événement financier'}
      subtitle="Factures, revenus attendus, versements d'épargne…"
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
        <Field label="Intitulé" error={errors.title}>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Assurance auto"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Date" error={errors.date}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Montant (optionnel)">
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
        </div>

        <Field label="Type">
          <div className="cat-picker">
            {EVENT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`cat-chip ${kind === k.id ? 'active' : ''}`}
                onClick={() => setKind(k.id)}
                style={kind === k.id ? { borderColor: k.color, color: k.color } : undefined}
              >
                <span className="cat-dot" style={{ background: k.color }} />
                {k.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notes (optionnel)">
          <textarea
            className="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Détails du paiement…"
          />
        </Field>

        <label className="checkbox-row">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span>Déjà payé</span>
        </label>
      </div>
    </Modal>
  )
}
