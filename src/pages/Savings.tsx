import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { goalProjection } from '../lib/analytics'
import { formatDate, parseAmount, todayIso } from '../lib/format'
import type { Goal } from '../lib/types'
import GoalModal from '../components/GoalModal'
import { Icon } from '../components/Icon'
import { Badge, ConfirmDialog, EmptyState, Field, Modal, Progress, SectionHead, useToast } from '../components/UI'

const STATE_LABEL: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'accent' | 'muted' }> = {
  'on-track': { label: 'Dans les temps', tone: 'ok' },
  ahead: { label: 'En avance', tone: 'ok' },
  behind: { label: 'En retard', tone: 'warn' },
  done: { label: 'Objectif atteint', tone: 'accent' },
  'no-pace': { label: 'À démarrer', tone: 'muted' },
}

function MoneyModal({
  goal,
  mode,
  onClose,
}: {
  goal: Goal | null
  mode: 'deposit' | 'withdraw'
  onClose: () => void
}) {
  const { contributeToGoal } = useData()
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso())
  const [error, setError] = useState('')

  const value = parseAmount(amount)

  const submit = () => {
    if (!goal) return
    if (!value || value <= 0) {
      setError('Saisissez un montant supérieur à zéro.')
      return
    }
    if (mode === 'withdraw' && value > goal.saved) {
      setError(`Vous ne pouvez retirer que ${goal.saved.toFixed(2)} € de cet objectif.`)
      return
    }
    contributeToGoal(goal.id, mode === 'deposit' ? value : -value, note.trim(), date)
    toast(mode === 'deposit' ? 'Versement enregistré' : 'Retrait enregistré')
    setAmount('')
    setNote('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={Boolean(goal)}
      onClose={onClose}
      title={mode === 'deposit' ? 'Ajouter à l’objectif' : 'Retirer de l’objectif'}
      subtitle={goal?.name}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {mode === 'deposit' ? 'Verser' : 'Retirer'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Montant" error={error || undefined}>
          <div className="input-affix">
            <span>€</span>
            <input
              className="input"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150"
              autoFocus
            />
          </div>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (facultatif)">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Prime, virement mensuel…"
          />
        </Field>
        {goal ? (
          <p className="hint">
            Solde actuel : {goal.saved.toFixed(2)} € sur {goal.target.toFixed(2)} €.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

export default function Savings() {
  const { data, money, deleteGoal } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [money_goal, setMoneyGoal] = useState<Goal | null>(null)
  const [moneyMode, setMoneyMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [toDelete, setToDelete] = useState<Goal | null>(null)

  const totals = useMemo(() => {
    const saved = data.goals.reduce((sum, g) => sum + g.saved, 0)
    const target = data.goals.reduce((sum, g) => sum + g.target, 0)
    return { saved, target, percent: target > 0 ? (saved / target) * 100 : 0 }
  }, [data.goals])

  const openDeposit = (goal: Goal) => {
    setMoneyMode('deposit')
    setMoneyGoal(goal)
  }

  const openWithdraw = (goal: Goal) => {
    setMoneyMode('withdraw')
    setMoneyGoal(goal)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Patrimoine</p>
          <h1 className="page-title">Épargne</h1>
          <p className="page-sub">Vos objectifs, votre rythme, vos projections d’atteinte.</p>
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
            <span>Nouvel objectif</span>
          </button>
        </div>
      </header>

      {data.goals.length > 0 ? (
        <section className="card savings-summary">
          <div className="savings-summary-main">
            <span className="stat-label">Épargne totale</span>
            <div className="savings-total tnum">{money(totals.saved)}</div>
            <span className="muted">
              sur {money(totals.target)} visés · {data.goals.length} objectif
              {data.goals.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="savings-summary-bar">
            <Progress percent={totals.percent} tone={totals.percent >= 100 ? 'ok' : 'accent'} />
            <span className="muted tnum">{Math.round(totals.percent)} % du programme atteint</span>
          </div>
        </section>
      ) : null}

      {data.goals.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="target"
            title="Aucun objectif d’épargne"
            text="Créez un objectif (voyage, matelas de sécurité, apport immobilier) et suivez sa progression versement après versement."
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
                Créer un objectif
              </button>
            }
          />
        </section>
      ) : (
        <div className="grid-goals">
          {data.goals.map((goal) => {
            const projection = goalProjection(goal, todayIso())
            const state = STATE_LABEL[projection.state] ?? STATE_LABEL['no-pace']
            const recent = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

            return (
              <article key={goal.id} className="card goal-card">
                <div className="goal-head">
                  <span className="goal-icon">
                    <Icon name={goal.icon} size={18} />
                  </span>
                  <div className="goal-head-main">
                    <h3 className="goal-title">{goal.name}</h3>
                    {goal.description ? <p className="goal-desc">{goal.description}</p> : null}
                  </div>
                  <div className="goal-head-actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => {
                        setEditing(goal)
                        setFormOpen(true)
                      }}
                      aria-label={`Modifier ${goal.name}`}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => setToDelete(goal)}
                      aria-label={`Supprimer ${goal.name}`}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <div className="goal-figures">
                  <div>
                    <span className="stat-label">Épargné</span>
                    <div className="goal-saved tnum">{money(goal.saved)}</div>
                  </div>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </div>

                <Progress percent={projection.percent} tone={projection.percent >= 100 ? 'ok' : 'accent'} />
                <div className="goal-progress-meta">
                  <span className="tnum">{Math.round(projection.percent)} %</span>
                  <span className="muted">
                    {projection.remaining > 0 ? `${money(projection.remaining)} restants` : 'Objectif financé'}
                  </span>
                </div>

                <div className="goal-meta">
                  <div className="goal-meta-row">
                    <span>Objectif cible</span>
                    <span className="tnum">{money(goal.target)}</span>
                  </div>
                  <div className="goal-meta-row">
                    <span>Échéance</span>
                    <span>{goal.deadline ? formatDate(goal.deadline, 'long') : 'Libre'}</span>
                  </div>
                  <div className="goal-meta-row">
                    <span>Effort mensuel requis</span>
                    <span className="tnum">{money(projection.requiredMonthly)}</span>
                  </div>
                  <div className="goal-meta-row">
                    <span>Rythme actuel</span>
                    <span className="tnum">
                      {projection.pace == null ? '—' : `${money(projection.pace)} / mois`}
                    </span>
                  </div>
                  <div className="goal-meta-row">
                    <span>Fin estimée</span>
                    <span>{projection.estimatedDate ? formatDate(projection.estimatedDate, 'long') : 'À définir'}</span>
                  </div>
                </div>

                {recent.length ? (
                  <ul className="goal-history">
                    {recent.map((c) => (
                      <li key={c.id}>
                        <span className="muted">{formatDate(c.date)}</span>
                        <span className="goal-history-note">{c.note || (c.amount >= 0 ? 'Versement' : 'Retrait')}</span>
                        <span className={`tnum ${c.amount >= 0 ? 'pos' : 'neg'}`}>
                          {c.amount >= 0 ? '+' : '−'}
                          {money(Math.abs(c.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="goal-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openDeposit(goal)}>
                    <Icon name="plus" size={14} />
                    Verser
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => openWithdraw(goal)}
                    disabled={goal.saved <= 0}
                  >
                    <Icon name="minus" size={14} />
                    Retirer
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <section className="card">
        <SectionHead
          title="Derniers mouvements d’épargne"
          subtitle="Versements et retraits, tous objectifs confondus"
        />
        {data.goals.some((g) => g.contributions.length) ? (
          <ul className="flow-list">
            {data.goals
              .flatMap((g) => g.contributions.map((c) => ({ ...c, goal: g.name })))
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((c) => (
                <li key={c.id}>
                  <span className="flow-icon">
                    <Icon name={c.amount >= 0 ? 'arrow-up-right' : 'arrow-down-right'} size={14} />
                  </span>
                  <span className="flow-main">
                    <span className="flow-title">{c.goal}</span>
                    <span className="flow-meta">
                      {formatDate(c.date, 'long')}
                      {c.note ? ` · ${c.note}` : ''}
                    </span>
                  </span>
                  <span className={`tnum ${c.amount >= 0 ? 'pos' : 'neg'}`}>
                    {c.amount >= 0 ? '+' : '−'}
                    {money(Math.abs(c.amount))}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="chart-empty">Vos versements apparaîtront ici.</p>
        )}
      </section>

      <GoalModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        initial={editing}
      />

      <MoneyModal goal={money_goal} mode={moneyMode} onClose={() => setMoneyGoal(null)} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cet objectif ?"
        message={
          toDelete
            ? `« ${toDelete.name} » et son historique de versements seront supprimés. Vos transactions ne sont pas modifiées.`
            : ''
        }
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => {
          if (toDelete) deleteGoal(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
