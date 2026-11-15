import { useMemo, useState } from 'react'
import { AlertTriangle, Pencil, PieChart, Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  MonthNav,
  PageHead,
  Progress,
  useToast,
} from '../components/UI'
import { budgetStatuses } from '../lib/analytics'
import { currentMonthKey, formatMoney, formatMonth, parseAmount, shiftMonth } from '../lib/format'
import { DEFAULT_CURRENCY, EXPENSE_CATEGORIES, categoryColor, categoryLabel } from '../lib/constants'
import type { Budget } from '../lib/types'

export default function Budgets() {
  const { profile, budgets, transactions, saveBudget, removeBudget, loading } = useData()
  const notify = useToast()

  const currency = profile?.currency ?? DEFAULT_CURRENCY
  const masked = profile?.privacy_mode ?? false

  const [month, setMonth] = useState(currentMonthKey())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null)

  const statuses = useMemo(
    () => budgetStatuses(budgets, transactions, month),
    [budgets, transactions, month],
  )

  const summary = useMemo(() => {
    const budgeted = statuses.reduce((acc, item) => acc + item.budget.amount, 0)
    const spent = statuses.reduce((acc, item) => acc + item.spent, 0)
    return {
      budgeted,
      spent,
      remaining: budgeted - spent,
      ratio: budgeted > 0 ? (spent / budgeted) * 100 : 0,
    }
  }, [statuses])

  const over = statuses.filter((item) => item.state === 'over')
  const warn = statuses.filter((item) => item.state === 'warn')

  const openNew = () => {
    setEditing(null)
    setCategory(EXPENSE_CATEGORIES[0].id)
    setAmount('')
    setError(null)
    setOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditing(budget)
    setCategory(budget.category)
    setAmount(String(budget.amount))
    setError(null)
    setOpen(true)
  }

  const submit = async () => {
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a monthly limit greater than zero.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveBudget({ category, amount: value, month }, editing?.id)
      notify(editing ? 'Budget updated.' : 'Budget created.', 'ok')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this budget.')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await removeBudget(pendingDelete.id)
      notify('Budget removed.', 'ok')
      setPendingDelete(null)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not remove this budget.', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow="Limits"
        title="Budgets"
        sub="Set a monthly ceiling per category and catch overspend before it happens."
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus />
            New budget
          </button>
        }
      />

      <div className="row-between">
        <MonthNav
          label={formatMonth(month)}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, 1))}
          nextDisabled={month >= currentMonthKey()}
          onReset={() => setMonth(currentMonthKey())}
        />
        {month !== currentMonthKey() ? <Badge tone="neutral">Historical month</Badge> : null}
      </div>

      {over.length > 0 ? (
        <div className="banner" style={{ borderColor: 'rgba(255,125,107,0.35)', color: 'var(--danger)' }}>
          <AlertTriangle size={16} />
          <span>
            <strong>{over.length}</strong>{' '}
            {over.length === 1 ? 'budget has' : 'budgets have'} passed 100%:{' '}
            {over.map((item) => categoryLabel(item.budget.category)).join(', ')}.
          </span>
        </div>
      ) : null}

      {warn.length > 0 ? (
        <div className="banner" style={{ borderColor: 'rgba(240,193,107,0.32)', color: 'var(--warn)' }}>
          <AlertTriangle size={16} />
          <span>
            <strong>{warn.length}</strong>{' '}
            {warn.length === 1 ? 'budget is' : 'budgets are'} above 80%:{' '}
            {warn.map((item) => categoryLabel(item.budget.category)).join(', ')}.
          </span>
        </div>
      ) : null}

      {statuses.length > 0 ? (
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Monthly allocation</h2>
              <p className="card-sub">
                {formatMoney(summary.spent, currency, { masked })} spent of{' '}
                {formatMoney(summary.budgeted, currency, { masked })} budgeted
              </p>
            </div>
            <Badge tone={summary.ratio >= 100 ? 'red' : summary.ratio >= 80 ? 'warn' : 'lime'}>
              {Math.round(summary.ratio)}% used
            </Badge>
          </div>
          <div className="card-pad">
            <Progress
              value={summary.ratio}
              tone={summary.ratio >= 100 ? 'over' : summary.ratio >= 80 ? 'warn' : undefined}
            />
            <div className="row-between" style={{ marginTop: 12 }}>
              <span className="tx-meta" style={{ margin: 0 }}>
                {summary.remaining >= 0
                  ? `${formatMoney(summary.remaining, currency, { masked })} still available`
                  : `${formatMoney(Math.abs(summary.remaining), currency, { masked })} over budget`}
              </span>
              <span className="tx-meta" style={{ margin: 0 }}>
                {statuses.length} {statuses.length === 1 ? 'category' : 'categories'}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Category limits</h2>
            <p className="card-sub">{formatMonth(month)} spending ceilings</p>
          </div>
        </div>
        <div className="card-pad">
          {loading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : statuses.length === 0 ? (
            <EmptyState
              icon={<PieChart size={20} />}
              title="No budgets for this month"
              text="Create a limit for the categories you want to keep in check. VAULT warns you at 80% and again at 100%."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
                  <Plus />
                  Create budget
                </button>
              }
            />
          ) : (
            <div className="stack" style={{ gap: 22 }}>
              {statuses.map((item) => (
                <div className="budget-row" key={item.budget.id}>
                  <div className="budget-top">
                    <div className="row" style={{ gap: 10 }}>
                      <span
                        className="dot"
                        style={{ background: categoryColor(item.budget.category), width: 9, height: 9 }}
                      />
                      <div>
                        <div className="budget-name">{categoryLabel(item.budget.category)}</div>
                        <div className="budget-meta">
                          {formatMoney(item.spent, currency, { masked })} of{' '}
                          {formatMoney(item.budget.amount, currency, { masked })}
                        </div>
                      </div>
                    </div>
                    <div className="budget-figures">
                      <span className="tnum" style={{ fontWeight: 600 }}>
                        {Math.round(item.ratio)}%
                      </span>
                      {item.state === 'over' ? (
                        <Badge tone="red">Over</Badge>
                      ) : item.state === 'warn' ? (
                        <Badge tone="warn">80% alert</Badge>
                      ) : (
                        <Badge tone="lime">On track</Badge>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(item.budget)}
                        aria-label={`Edit ${categoryLabel(item.budget.category)} budget`}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setPendingDelete(item.budget)}
                        aria-label={`Delete ${categoryLabel(item.budget.category)} budget`}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>

                  <Progress
                    value={item.ratio}
                    tone={item.state === 'over' ? 'over' : item.state === 'warn' ? 'warn' : undefined}
                  />

                  <div className="row-between budget-meta">
                    <span>
                      {item.remaining >= 0
                        ? `${formatMoney(item.remaining, currency, { masked })} left`
                        : `${formatMoney(Math.abs(item.remaining), currency, { masked })} over`}
                    </span>
                    <span>
                      {item.remaining > 0
                        ? `${formatMoney(item.dailyAllowance, currency, { masked })}/day left`
                        : `Projected ${formatMoney(item.projected, currency, { masked })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit budget' : 'New budget'}
        subtitle={`Monthly limit for ${formatMonth(month)}`}
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create budget'}
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <Field label="Category" htmlFor="budget-category">
            <select
              id="budget-category"
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monthly limit" htmlFor="budget-amount">
            <input
              id="budget-amount"
              className="input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove budget?"
        text="The limit will be deleted for this month. Your transactions stay untouched."
        confirmLabel="Remove"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
