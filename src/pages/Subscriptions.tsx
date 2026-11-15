import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { subscriptionTotals } from '../lib/analytics'
import { categoryById } from '../lib/constants'
import { addMonthsToIso, daysBetween, formatDate, todayIso } from '../lib/format'
import type { Subscription } from '../lib/types'
import SubscriptionModal from '../components/SubscriptionModal'
import { Icon } from '../components/Icon'
import { Badge, ConfirmDialog, EmptyState, SectionHead, Toggle } from '../components/UI'

function nextDate(sub: Subscription): string {
  let date = sub.nextPayment
  let guard = 0
  while (date < todayIso() && guard < 120) {
    date = addMonthsToIso(date, sub.cycle === 'monthly' ? 1 : 12)
    guard++
  }
  return date
}

export default function Subscriptions() {
  const { data, money, updateSubscription, deleteSubscription } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [toDelete, setToDelete] = useState<Subscription | null>(null)

  const totals = useMemo(() => subscriptionTotals(data.subscriptions, todayIso()), [data.subscriptions])

  const sorted = useMemo(
    () =>
      [...data.subscriptions].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        return nextDate(a).localeCompare(nextDate(b))
      }),
    [data.subscriptions],
  )

  const annualSavingIfPaused = useMemo(
    () => data.subscriptions.filter((s) => !s.active).reduce((sum, s) => sum + (s.cycle === 'monthly' ? s.amount * 12 : s.amount), 0),
    [data.subscriptions],
  )

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Récurrences</p>
          <h1 className="page-title">Abonnements</h1>
          <p className="page-sub">Coût réel de vos services récurrents et prochains prélèvements.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Icon name="plus" size={15} />
            <span>Nouvel abonnement</span>
          </button>
        </div>
      </header>

      <div className="grid-4">
        <div className="card kpi">
          <span className="stat-label">Coût mensuel</span>
          <div className="kpi-value tnum">{money(totals.monthly)}</div>
          <span className="muted">abonnements actifs lissés</span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Coût annuel</span>
          <div className="kpi-value tnum">{money(totals.annual)}</div>
          <span className="muted">projection sur 12 mois</span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Abonnements actifs</span>
          <div className="kpi-value tnum">{totals.activeCount}</div>
          <span className="muted">
            {data.subscriptions.length - totals.activeCount} en pause
          </span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Renouvellements 30 j</span>
          <div className="kpi-value tnum">{totals.next30.length}</div>
          <span className="muted">
            {annualSavingIfPaused > 0 ? `${money(annualSavingIfPaused)} économisés/an` : 'aucune pause'}
          </span>
        </div>
      </div>

      {data.subscriptions.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="repeat"
            title="Aucun abonnement suivi"
            text="Streaming, téléphonie, logiciels, salle de sport… Ajoutez vos abonnements pour connaître leur coût réel et ne plus subir de prélèvement oublié."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Icon name="plus" size={15} />
                Ajouter un abonnement
              </button>
            }
          />
        </section>
      ) : (
        <section className="card card-flush">
          <ul className="sub-list">
            {sorted.map((sub) => {
              const cat = categoryById(sub.category)
              const next = nextDate(sub)
              const days = daysBetween(todayIso(), next)
              const monthly = sub.cycle === 'monthly' ? sub.amount : sub.amount / 12
              return (
                <li key={sub.id} className={`sub-row ${sub.active ? '' : 'sub-row-paused'}`}>
                  <span className="tx-icon" style={{ color: cat.color, background: `${cat.color}14` }}>
                    <Icon name={cat.icon} size={16} />
                  </span>
                  <span className="tx-main">
                    <span className="tx-title">
                      {sub.name}
                      {sub.cycle === 'yearly' ? <Badge tone="muted">Annuel</Badge> : null}
                      {!sub.active ? <Badge tone="muted">En pause</Badge> : null}
                    </span>
                    <span className="tx-meta">
                      {cat.label} · prochain prélèvement {formatDate(next, 'long')}
                      {sub.active ? ` · dans ${days} j` : ''}
                      {sub.description ? ` · ${sub.description}` : ''}
                    </span>
                  </span>
                  <span className="sub-cost">
                    <span className="tnum strong">{money(sub.amount)}</span>
                    <span className="muted tnum">
                      {sub.cycle === 'monthly' ? `${money(monthly)} / mois` : `${money(monthly)} / mois`}
                    </span>
                  </span>
                  <span className="sub-actions">
                    <Toggle
                      checked={sub.active}
                      onChange={() => updateSubscription(sub.id, { active: !sub.active })}
                      label={sub.active ? 'Mettre en pause' : 'Réactiver'}
                    />
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => {
                        setEditing(sub)
                        setFormOpen(true)
                      }}
                      aria-label={`Modifier ${sub.name}`}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => setToDelete(sub)}
                      aria-label={`Supprimer ${sub.name}`}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {totals.next30.length ? (
        <section className="card">
          <SectionHead title="Prochaines échéances" subtitle="Prélèvements prévus dans les 30 prochains jours" />
          <ul className="flow-list">
            {totals.next30.map(({ sub, date, days }) => (
              <li key={`${sub.id}-${date}`}>
                <span className="flow-icon">
                  <Icon name="calendar" size={14} />
                </span>
                <span className="flow-main">
                  <span className="flow-title">{sub.name}</span>
                  <span className="flow-meta">
                    {formatDate(date, 'long')} · {days === 0 ? "aujourd'hui" : `dans ${days} jour${days > 1 ? 's' : ''}`}
                  </span>
                </span>
                <span className="tnum neg">−{money(sub.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SubscriptionModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cet abonnement ?"
        message={toDelete ? `« ${toDelete.name} » sera retiré de vos abonnements et du calendrier.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => {
          if (toDelete) deleteSubscription(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
