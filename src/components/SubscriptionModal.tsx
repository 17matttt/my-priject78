import { useEffect, useState } from 'react'
import { categoriesFor, CYCLES } from '../lib/constants'
import { parseAmount, todayIso } from '../lib/format'
import type { Subscription, SubscriptionCycle } from '../lib/types'
import { useData } from '../context/DataContext'
import { Field, Modal, Segmented, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Subscription | null
}

export default function SubscriptionModal({ open, onClose, initial }: Props) {
  const { addSubscription, updateSubscription } = useData()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<SubscriptionCycle>('monthly')
  const [nextPayment, setNextPayment] = useState(todayIso())
  const [category, setCategory] = useState('abonnements')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setAmount(String(initial.amount))
      setCycle(initial.cycle)
      setNextPayment(initial.nextPayment)
      setCategory(initial.category)
      setDescription(initial.description)
      setActive(initial.active)
    } else {
      setName('')
      setAmount('')
      setCycle('monthly')
      setNextPayment(todayIso())
      setCategory('abonnements')
      setDescription('')
      setActive(true)
    }
    setErrors({})
  }, [open, initial])

  const submit = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Un nom est requis.'
    const value = parseAmount(amount)
    if (!value || value <= 0) nextErrors.amount = 'Montant invalide.'
    if (!nextPayment) nextErrors.nextPayment = 'Date requise.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      name: name.trim(),
      amount: Math.round(value * 100) / 100,
      cycle,
      nextPayment,
      category,
      description: description.trim(),
      active,
    }
    if (initial) {
      updateSubscription(initial.id, payload)
      toast('Abonnement mis à jour')
    } else {
      addSubscription(payload)
      toast('Abonnement ajouté')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Modifier l'abonnement" : 'Nouvel abonnement'}
      subtitle="Suivez vos charges récurrentes et leurs renouvellements."
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
        <Field label="Nom de l'abonnement" error={errors.name}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Netflix, Spotify, salle de sport…"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Prix" error={errors.amount}>
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
          <Field label="Facturation">
            <Segmented
              options={CYCLES.map((c) => ({ id: c.id, label: c.label }))}
              value={cycle}
              onChange={(v) => setCycle(v as SubscriptionCycle)}
              size="sm"
            />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Prochain paiement" error={errors.nextPayment}>
            <input
              className="input"
              type="date"
              value={nextPayment}
              onChange={(e) => setNextPayment(e.target.value)}
            />
          </Field>
          <Field label="Catégorie">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoriesFor('expense').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description (optionnel)">
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Formule, compte, usage…"
          />
        </Field>

        <label className="checkbox-row">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Abonnement actif</span>
        </label>
      </div>
    </Modal>
  )
}
