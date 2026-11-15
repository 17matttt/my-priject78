import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Modal } from './UI'
import TransactionModal from './TransactionModal'
import SubscriptionModal from './SubscriptionModal'
import GoalModal from './GoalModal'
import EventModal from './EventModal'

type Mode = 'menu' | 'transaction' | 'subscription' | 'goal' | 'event'

const OPTIONS: { id: Exclude<Mode, 'menu'>; label: string; hint: string; icon: string }[] = [
  { id: 'transaction', label: 'Transaction', hint: 'Revenu ou dépense', icon: 'receipt' },
  { id: 'subscription', label: 'Abonnement', hint: 'Charge récurrente', icon: 'repeat' },
  { id: 'goal', label: "Objectif d'épargne", hint: 'Nouvelle cible', icon: 'target' },
  { id: 'event', label: 'Événement', hint: 'Facture, revenu, versement', icon: 'calendar' },
]

export default function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('menu')

  useEffect(() => {
    if (open) setMode('menu')
  }, [open])

  const close = () => {
    setMode('menu')
    onClose()
  }

  return (
    <>
      <Modal
        open={open && mode === 'menu'}
        onClose={close}
        title="Ajout rapide"
        subtitle="Créez un élément en quelques secondes."
        width="sm"
      >
        <div className="quick-grid">
          {OPTIONS.map((opt) => (
            <button key={opt.id} type="button" className="quick-option" onClick={() => setMode(opt.id)}>
              <span className="quick-icon">
                <Icon name={opt.icon} size={18} />
              </span>
              <span className="quick-main">
                <span className="quick-label">{opt.label}</span>
                <span className="quick-hint">{opt.hint}</span>
              </span>
              <Icon name="chevron-right" size={15} className="quick-arrow" />
            </button>
          ))}
        </div>
      </Modal>

      <TransactionModal open={open && mode === 'transaction'} onClose={close} />
      <SubscriptionModal open={open && mode === 'subscription'} onClose={close} />
      <GoalModal open={open && mode === 'goal'} onClose={close} />
      <EventModal open={open && mode === 'event'} onClose={close} />
    </>
  )
}
