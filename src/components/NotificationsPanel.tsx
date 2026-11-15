import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { notificationsFor, type Notification } from '../lib/analytics'
import { Icon } from './Icon'

const KIND_ICON: Record<Notification['kind'], string> = {
  bill: 'receipt',
  budget: 'chart',
  goal: 'target',
  subscription: 'repeat',
  info: 'info',
}

const KIND_ROUTE: Record<Notification['kind'], string> = {
  bill: '/calendrier',
  budget: '/budgets',
  goal: '/epargne',
  subscription: '/abonnements',
  info: '/analyses',
}

export default function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useData()
  const navigate = useNavigate()
  const items = notificationsFor(data)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="panel" role="dialog" aria-modal="true" aria-label="Notifications">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Notifications</h2>
            <p className="panel-sub">
              {items.length ? `${items.length} alerte${items.length > 1 ? 's' : ''} en cours` : 'Tout est à jour'}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="panel-body">
          {items.length === 0 ? (
            <div className="panel-empty">
              <Icon name="check-circle" size={22} />
              <p>Aucune alerte. Vos budgets, échéances et abonnements sont sous contrôle.</p>
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notif tone-${n.tone}`}
                onClick={() => {
                  navigate(KIND_ROUTE[n.kind])
                  onClose()
                }}
              >
                <span className="notif-icon">
                  <Icon name={KIND_ICON[n.kind]} size={16} />
                </span>
                <span className="notif-main">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-detail">{n.detail}</span>
                </span>
                <Icon name="chevron-right" size={15} className="notif-arrow" />
              </button>
            ))
          )}
        </div>

        <footer className="panel-foot">
          <Icon name="info" size={14} />
          <span>Alertes recalculées en direct à partir de vos données.</span>
        </footer>
      </aside>
    </div>
  )
}
