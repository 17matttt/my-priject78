import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHead,
  Progress,
  useToast,
} from '../components/UI'
import { daysUntil, goalMonthlyPace, goalProgress } from '../lib/analytics'
import {
  currencySymbol,
  formatDate,
  formatMoney,
  parseAmount,
  todayIso,
} from '../lib/format'
import { DEFAULT_CURRENCY } from '../lib/constants'
import type { SavingsGoal } from '../lib/types'

export default function Savings() {
  const { profile, goals, activity, addGoal, editGoal, removeGoal, moveGoalMoney, loading } = useData()
  const notify = useToast()

  const currency = profile?.currency ?? DEFAULT_CURRENCY
  const masked = profile?.privacy_mode ?? false

  const [goalOpen, setGoalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [moneyGoal, setMoneyGoal] = useState<SavingsGoal | null>(null)
  const [direction, setDirection] = useState<'deposit' | 'withdraw'>('deposit')
  const [moneyAmount, setMoneyAmount] = useState('')
  const [note, setNote] = useState('')
  const [moneyError, setMoneyError] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null)
  const [busy, setBusy] = useState(false)

  const totalSaved = useMemo(() => goals.reduce((acc, goal) => acc + goal.saved_amount, 0), [goals])
  const totalTarget = useMemo(() => goals.reduce((acc, goal) => acc + goal.target_amount, 0), [goals])

  const recentActivity = useMemo(
    () =>
      [...activity]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
        .slice(0, 8),
    [activity],
  )

  const openNew = () => {
    setEditing(null)
    setName('')
    setTarget('')
    setSaved('')
    setDeadline('')
    setError(null)
    setGoalOpen(true)
  }

  const openEdit = (goal: SavingsGoal) => {
    setEditing(goal)
    setName(goal.name)
    setTarget(String(goal.target_amount))
    setSaved(String(goal.saved_amount))
    setDeadline(goal.deadline ?? '')
    setError(null)
    setGoalOpen(true)
  }

  const submitGoal = async () => {
    if (name.trim().length < 2) {
      setError('Give this goal a name.')
      return
    }
    const targetValue = parseAmount(target)
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError('Enter a target amount greater than zero.')
      return
    }
    const savedValue = saved.trim() === '' ? 0 : parseAmount(saved)
    if (!Number.isFinite(savedValue) || savedValue < 0) {
      setError('The saved amount cannot be negative.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        target_amount: targetValue,
        saved_amount: savedValue,
        deadline: deadline || null,
      }
      if (editing) {
        await editGoal(editing.id, payload)
        notify('Goal updated.', 'ok')
      } else {
        await addGoal(payload)
        notify('Savings goal created.', 'ok')
      }
      setGoalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this goal.')
    } finally {
      setBusy(false)
    }
  }

  const openMoney = (goal: SavingsGoal, mode: 'deposit' | 'withdraw') => {
    setMoneyGoal(goal)
    setDirection(mode)
    setMoneyAmount('')
    setNote('')
    setMoneyError(null)
  }

  const submitMoney = async () => {
    if (!moneyGoal) return
    const value = parseAmount(moneyAmount)
    if (!Number.isFinite(value) || value <= 0) {
      setMoneyError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    setMoneyError(null)
    try {
      await moveGoalMoney(
        moneyGoal.id,
        direction === 'deposit' ? value : -value,
        note.trim() || (direction === 'deposit' ? 'Deposit' : 'Withdrawal'),
      )
      notify(direction === 'deposit' ? 'Money added to goal.' : 'Money withdrawn.', 'ok')
      setMoneyGoal(null)
    } catch (err) {
      setMoneyError(err instanceof Error ? err.message : 'Could not move this money.')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await removeGoal(pendingDelete.id)
      notify('Goal deleted.', 'ok')
      setPendingDelete(null)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete this goal.', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow="Reserves"
        title="Savings"
        sub="Set the target, move money in and out, and let VAULT compute the pace."
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus />
            New goal
          </button>
        }
      />

      <div className="grid g-3">
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Total saved</span>
            <span className="stat-icon" style={{ color: 'var(--accent)' }}>
              <Target size={15} />
            </span>
          </div>
          <div className="stat-value tnum" style={{ color: 'var(--accent)' }}>
            {formatMoney(totalSaved, currency, { masked })}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Combined target</span>
          </div>
          <div className="stat-value tnum">{formatMoney(totalTarget, currency, { masked })}</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Goals</span>
          </div>
          <div className="stat-value tnum">{goals.length}</div>
          <div className="stat-foot">
            <span>
              {totalTarget > 0
                ? `${Math.round((totalSaved / totalTarget) * 100)}% of combined target`
                : 'No target set yet'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card skeleton" style={{ height: 200 }} />
      ) : goals.length === 0 ? (
        <section className="card">
          <div className="card-pad">
            <EmptyState
              icon={<Target size={20} />}
              title="No savings goals yet"
              text="A goal is a name, a target and a deadline. Create one and VAULT tracks deposits, withdrawals and the monthly pace you need."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
                  <Plus />
                  Create your first goal
                </button>
              }
            />
          </div>
        </section>
      ) : (
        <div className="grid g-2">
          {goals.map((goal) => {
            const progress = goalProgress(goal)
            const days = daysUntil(goal.deadline)
            const pace = goalMonthlyPace(goal)
            return (
              <section className="card goal-card" key={goal.id}>
                <div className="card-pad">
                  <div className="goal-head">
                    <div>
                      <div className="goal-name">{goal.name}</div>
                      <div className="tx-meta">
                        {goal.deadline ? `Due ${formatDate(goal.deadline, 'long')}` : 'No deadline'}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(goal)}
                        aria-label={`Edit ${goal.name}`}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setPendingDelete(goal)}
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>

                  <div className="goal-amounts">
                    <span className="goal-saved tnum">
                      {formatMoney(goal.saved_amount, currency, { masked })}
                    </span>
                    <span className="goal-target tnum">
                      of {formatMoney(goal.target_amount, currency, { masked })}
                    </span>
                  </div>

                  <Progress value={progress} />

                  <div className="row-between" style={{ marginTop: 10 }}>
                    <span className="tx-meta" style={{ margin: 0 }}>
                      {Math.round(progress)}% funded
                    </span>
                    {days !== null ? (
                      <Badge tone={days < 0 ? 'red' : days < 30 ? 'warn' : 'neutral'}>
                        {days < 0 ? `${Math.abs(days)} days late` : `${days} days left`}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Open ended</Badge>
                    )}
                  </div>

                  {pace !== null && pace > 0 ? (
                    <div className="goal-deadline">
                      Set aside {formatMoney(pace, currency, { masked })}/month to reach the target on time.
                    </div>
                  ) : null}

                  <div className="goal-foot">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openMoney(goal, 'deposit')}
                    >
                      <ArrowDownLeft />
                      Add money
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => openMoney(goal, 'withdraw')}
                      disabled={goal.saved_amount <= 0}
                    >
                      <ArrowUpRight />
                      Withdraw
                    </button>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {recentActivity.length > 0 ? (
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Goal activity</h2>
              <p className="card-sub">Deposits and withdrawals, newest first</p>
            </div>
          </div>
          <div className="card-pad">
            <div className="tx-list">
              {recentActivity.map((entry) => {
                const goal = goals.find((item) => item.id === entry.goal_id)
                return (
                  <div className="tx-row" key={entry.id}>
                    <span
                      className="tx-icon"
                      style={{
                        background: entry.amount >= 0 ? 'rgba(197,243,107,0.14)' : 'rgba(255,255,255,0.05)',
                        color: entry.amount >= 0 ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      {entry.amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div className="tx-main">
                      <div className="tx-desc">{entry.note || (entry.amount >= 0 ? 'Deposit' : 'Withdrawal')}</div>
                      <div className="tx-meta">
                        {goal?.name ?? 'Goal'} · {formatDate(entry.created_at.slice(0, 10))}
                      </div>
                    </div>
                    <div
                      className="tx-amount tnum"
                      style={{ color: entry.amount >= 0 ? 'var(--accent)' : 'var(--text)' }}
                    >
                      {entry.amount >= 0 ? '+' : '−'}
                      {formatMoney(Math.abs(entry.amount), currency, { masked })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={editing ? 'Edit goal' : 'New savings goal'}
        subtitle="Targets and deadlines are optional — progress is always automatic."
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setGoalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitGoal} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <Field label="Goal name" htmlFor="goal-name">
            <input
              id="goal-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Emergency fund"
              maxLength={80}
            />
          </Field>

          <div className="form-grid">
            <Field label="Target amount" htmlFor="goal-target">
              <input
                id="goal-target"
                className="input"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                inputMode="decimal"
                placeholder={`${currencySymbol(currency)}0.00`}
              />
            </Field>
            <Field label="Already saved" htmlFor="goal-saved">
              <input
                id="goal-saved"
                className="input"
                value={saved}
                onChange={(event) => setSaved(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Deadline" htmlFor="goal-deadline">
            <input
              id="goal-deadline"
              className="input"
              type="date"
              value={deadline}
              min={todayIso()}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </Field>

          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={moneyGoal !== null}
        onClose={() => setMoneyGoal(null)}
        title={direction === 'deposit' ? 'Add money' : 'Withdraw money'}
        subtitle={moneyGoal ? `${moneyGoal.name} · ${formatMoney(moneyGoal.saved_amount, currency, { masked })} saved` : ''}
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setMoneyGoal(null)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitMoney} disabled={busy}>
              {busy ? 'Working…' : direction === 'deposit' ? 'Add money' : 'Withdraw'}
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <div className="amount-input">
            <span className="sym">{currencySymbol(currency)}</span>
            <input
              value={moneyAmount}
              onChange={(event) => setMoneyAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              autoFocus
            />
          </div>

          <Field label="Note" htmlFor="goal-note">
            <input
              id="goal-note"
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={direction === 'deposit' ? 'Monthly transfer' : 'Used for repair'}
              maxLength={120}
            />
          </Field>

          {moneyError ? <p className="field-error">{moneyError}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete savings goal?"
        text="The goal and its activity history will be removed. Your transactions are not affected."
        confirmLabel="Delete goal"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
