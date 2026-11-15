import { useEffect, useState } from 'react'
import { GOAL_ICONS } from '../lib/constants'
import { parseAmount } from '../lib/format'
import type { Goal } from '../lib/types'
import { useData } from '../context/DataContext'
import { Icon } from './Icon'
import { Field, Modal, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Goal | null
}

export default function GoalModal({ open, onClose, initial }: Props) {
  const { addGoal, updateGoal } = useData()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState('piggy')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setTarget(String(initial.target))
      setSaved(String(initial.saved))
      setDeadline(initial.deadline ?? '')
      setIcon(initial.icon)
      setDescription(initial.description)
    } else {
      setName('')
      setTarget('')
      setSaved('')
      setDeadline('')
      setIcon('piggy')
      setDescription('')
    }
    setErrors({})
  }, [open, initial])

  const submit = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = "Nom de l'objectif requis."
    const targetValue = parseAmount(target)
    if (!targetValue || targetValue <= 0) nextErrors.target = 'Objectif invalide.'
    const savedValue = parseAmount(saved)
    if (savedValue < 0) nextErrors.saved = 'Montant invalide.'
    if (savedValue > targetValue) nextErrors.saved = "Ne peut pas dépasser l'objectif."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (initial) {
      updateGoal(initial.id, {
        name: name.trim(),
        target: Math.round(targetValue * 100) / 100,
        deadline: deadline || null,
        icon,
        description: description.trim(),
      })
      toast('Objectif mis à jour')
    } else {
      addGoal({
        name: name.trim(),
        target: Math.round(targetValue * 100) / 100,
        saved: Math.round(savedValue * 100) / 100,
        deadline: deadline || null,
        icon,
        description: description.trim(),
      })
      toast('Objectif créé')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}
      subtitle="Définissez une cible et suivez votre progression."
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom de l'objectif" error={errors.name}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Voyage au Japon"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Montant cible" error={errors.target}>
            <div className="input-affix">
              <span>€</span>
              <input
                className="input"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </Field>
          <Field label={initial ? 'Déjà épargné' : 'Montant de départ'} error={errors.saved} hint={initial ? 'Utilisez « Ajouter » pour verser.' : undefined}>
            <div className="input-affix">
              <span>€</span>
              <input
                className="input"
                inputMode="decimal"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
                placeholder="0,00"
                disabled={Boolean(initial)}
              />
            </div>
          </Field>
        </div>

        <Field label="Échéance (optionnel)">
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>

        <Field label="Icône">
          <div className="icon-picker">
            {GOAL_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                className={`icon-choice ${icon === name ? 'active' : ''}`}
                onClick={() => setIcon(name)}
                aria-label={name}
              >
                <Icon name={name} size={18} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Description (optionnel)">
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À quoi sert cet objectif ?"
          />
        </Field>
      </div>
    </Modal>
  )
}
