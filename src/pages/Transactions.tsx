import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { ConfirmDialog, EmptyState, PageHead, useToast } from '../components/UI'
import TransactionModal from '../components/TransactionModal'
import {
  categoryLabel,
  categoryColor,
  ALL_CATEGORIES,
  DEFAULT_CURRENCY,
} from '../lib/constants'
import { formatDate, formatMoney, monthKeyOf, relativeDay } from '../lib/format'
import { groupByDay, round2, sortByDateDesc } from '../lib/analytics'
import type { Transaction, TxType } from '../lib/types'

type TypeFilter = 'all' | TxType

export default function Transactions() {
  const { profile, transactions, removeTransaction, loading } = useData()
  const notify = useToast()

  const currency = profile?.currency ?? DEFAULT_CURRENCY
  const masked = profile?.privacy_mode ?? false

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [category, setCategory] = useState('all')
  const [month, setMonth] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  const [busy, setBusy] = useState(false)

  const months = useMemo(() => {
    const set = new Set(transactions.map((tx) => monthKeyOf(tx.occurred_on)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [transactions])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sortByDateDesc(transactions).filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (category !== 'all' && tx.category !== category) return false
      if (month !== 'all' && monthKeyOf(tx.occurred_on) !== month) return false
      if (needle) {
        const haystack = `${tx.description ?? ''} ${categoryLabel(tx.category)} ${tx.amount} ${tx.occurred_on}`
        if (!haystack.toLowerCase().includes(needle)) return false
      }
      return true
    })
  }, [transactions, query, type, category, month])

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount
      else expense += tx.amount
    }
    return { income: round2(income), expense: round2(expense), net: round2(income - expense) }
  }, [filtered])

  const hasFilters = query !== '' || type !== 'all' || category !== 'all' || month !== 'all'

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await removeTransaction(pendingDelete.id)
      notify('Transaction deleted.', 'ok')
      setPendingDelete(null)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete this transaction.', 'err')
    } finally {
      setBusy(false)
    }
  }

  const resetFilters = () => {
    setQuery('')
    setType('all')
    setCategory('all')
    setMonth('all')
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow="Ledger"
        title="Transactions"
        sub="Every euro in and out, searchable and fully editable."
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus />
            New transaction
          </button>
        }
      />

      <div className="grid g-3">
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Income in view</span>
            <span className="stat-icon" style={{ color: 'var(--accent)' }}>
              <ArrowDownLeft size={15} />
            </span>
          </div>
          <div className="stat-value tnum" style={{ color: 'var(--accent)' }}>
            {formatMoney(totals.income, currency, { masked })}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Expenses in view</span>
            <span className="stat-icon">
              <ArrowUpRight size={15} />
            </span>
          </div>
          <div className="stat-value tnum">{formatMoney(totals.expense, currency, { masked })}</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Net in view</span>
          </div>
          <div className="stat-value tnum">{formatMoney(totals.net, currency, { masked, signed: true })}</div>
          <div className="stat-foot">
            <span>{filtered.length} transactions</span>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-pad">
          <div className="toolbar">
            <label className="search">
              <Search size={15} />
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search description, category or amount"
                aria-label="Search transactions"
              />
            </label>

            <select
              className="select"
              value={type}
              onChange={(event) => setType(event.target.value as TypeFilter)}
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>

            <select
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {ALL_CATEGORIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              aria-label="Filter by month"
            >
              <option value="all">All months</option>
              {months.map((key) => (
                <option key={key} value={key}>
                  {formatDate(`${key}-01`, 'long').replace(/^01 /, '')}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <button type="button" className="btn btn-quiet btn-sm" onClick={resetFilters}>
                Clear
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="stack">
              <div className="skeleton" style={{ height: 54 }} />
              <div className="skeleton" style={{ height: 54 }} />
              <div className="skeleton" style={{ height: 54 }} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt size={20} />}
              title={hasFilters ? 'No matches' : 'No transactions yet'}
              text={
                hasFilters
                  ? 'Nothing matches those filters. Try a different search or clear them.'
                  : 'Record your first income or expense and it will be stored against your account immediately.'
              }
              action={
                hasFilters ? (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={resetFilters}>
                    Clear filters
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus />
                    Add transaction
                  </button>
                )
              }
            />
          ) : (
            <div className="tx-list">
              {groups.map((group) => {
                const dayNet = round2(
                  group.items.reduce(
                    (acc, tx) => acc + (tx.type === 'income' ? tx.amount : -tx.amount),
                    0,
                  ),
                )
                return (
                  <div key={group.day}>
                    <div className="tx-day-head">
                      <span>{relativeDay(group.day)}</span>
                      <span className="tnum">
                        {formatMoney(dayNet, currency, { masked, signed: true })}
                      </span>
                    </div>
                    {group.items.map((tx) => (
                      <div className="tx-row" key={tx.id}>
                        <span
                          className="tx-icon"
                          style={{
                            background: `${categoryColor(tx.category)}1f`,
                            color: categoryColor(tx.category),
                          }}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownLeft size={15} />
                          ) : (
                            <ArrowUpRight size={15} />
                          )}
                        </span>
                        <div className="tx-main">
                          <div className="tx-desc">
                            {tx.description || categoryLabel(tx.category)}
                          </div>
                          <div className="tx-meta">
                            {categoryLabel(tx.category)} · {formatDate(tx.occurred_on)}
                          </div>
                        </div>
                        <div
                          className="tx-amount tnum"
                          style={{ color: tx.type === 'income' ? 'var(--accent)' : 'var(--text)' }}
                        >
                          {tx.type === 'income' ? '+' : '−'}
                          {formatMoney(tx.amount, currency, { masked })}
                        </div>
                        <div className="tx-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(tx)}
                            aria-label={`Edit ${tx.description || categoryLabel(tx.category)}`}
                          >
                            <Pencil />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setPendingDelete(tx)}
                            aria-label={`Delete ${tx.description || categoryLabel(tx.category)}`}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        currency={currency}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete transaction?"
        text="This entry will be removed from your balance and every chart immediately. This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
