import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from 'lucide-react'
import {
  Badge,
  Btn,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { AreaChart, Donut } from '../components/Charts'
import { useApp } from '../context/AppContext'
import { revenueSeries } from '../lib/analytics'
import { shortDate } from '../lib/format'
import type { FinanceEntry, FinanceType } from '../types'

const CATEGORIES = [
  'Commission',
  'Subscription',
  'Listing fee',
  'Marketing',
  'Payroll',
  'Software',
  'Office',
  'Other',
]

const blank = {
  label: '',
  type: 'income' as FinanceType,
  amount: '',
  category: 'Commission',
  date: new Date().toISOString().slice(0, 10),
  method: 'Bank transfer',
}

export function Finance() {
  const { data, money, addFinance, deleteFinance } = useApp()
  const [filter, setFilter] = useState<'all' | FinanceType>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<FinanceEntry | null>(null)

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...data.finance]
      .filter((entry) => (filter === 'all' ? true : entry.type === filter))
      .filter((entry) =>
        needle ? `${entry.label} ${entry.category} ${entry.method}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [data.finance, filter, query])

  const income = data.finance.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = data.finance.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net = income - expense

  const byCategory = useMemo(() => {
    const palette = ['#14c4b1', '#0f9e90', '#5ac8c0', '#8ad9d2', '#1b6b7a', '#2f8f9d']
    const map = new Map<string, number>()
    data.finance
      .filter((e) => e.type === 'expense')
      .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], index) => ({ label, value, color: palette[index % palette.length] }))
  }, [data.finance])

  const series = revenueSeries(data, 9)

  const submit = () => {
    if (form.label.trim().length < 2) {
      setError('Enter a short description.')
      return
    }
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    addFinance({
      label: form.label.trim(),
      type: form.type,
      amount,
      category: form.category,
      date: new Date(form.date).toISOString(),
      method: form.method,
    })
    setOpen(false)
    setForm(blank)
    setError('')
  }

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Finance"
        subtitle="Commissions, operating costs and net position."
        actions={
          <Btn icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            Add entry
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-light">
          <p className="stat-label">Total income</p>
          <strong className="stat-value">{money(income, true)}</strong>
          <p className="stat-delta up">
            <ArrowUpRight size={14} /> All recorded inflows
          </p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Total expenses</p>
          <strong className="stat-value">{money(expense, true)}</strong>
          <p className="stat-delta down">
            <ArrowDownRight size={14} /> All recorded outflows
          </p>
        </div>
        <div className="stat-card stat-dark">
          <p className="stat-label">Net position</p>
          <strong className="stat-value">{money(net, true)}</strong>
          <p className="stat-hint">{data.finance.length} ledger entries</p>
        </div>
      </div>

      <div className="split-2">
        <Panel tone="glass" title="Cashflow" subtitle="Income versus expenses by month">
          <AreaChart
            data={series.map((point) => ({ label: point.label, value: point.net }))}
            format={(value) => money(value, true)}
            height={240}
          />
        </Panel>
        <Panel tone="glass" title="Expense mix" subtitle="Where the money goes">
          {byCategory.length ? (
            <Donut slices={byCategory} centerLabel="Expenses" centerValue={money(expense, true)} />
          ) : (
            <EmptyState icon={<Wallet size={22} />} title="No expenses yet" text="Add an entry to see the breakdown." />
          )}
        </Panel>
      </div>

      <Panel
        tone="glass"
        title="Transactions"
        subtitle={`${entries.length} entries`}
        actions={
          <div className="toolbar-inline">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search ledger…" />
          </div>
        }
      >
        {entries.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="align-right">Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-strong">{entry.label}</td>
                    <td>{entry.category}</td>
                    <td>{entry.method}</td>
                    <td>{shortDate(entry.date)}</td>
                    <td>
                      <Badge tone={entry.type === 'income' ? 'success' : 'danger'}>{entry.type}</Badge>
                    </td>
                    <td className={`align-right cell-strong ${entry.type === 'income' ? 'cell-positive' : 'cell-negative'}`}>
                      {entry.type === 'income' ? '+' : '−'}
                      {money(entry.amount)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn sm danger"
                          aria-label={`Delete ${entry.label}`}
                          onClick={() => setPendingDelete(entry)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Wallet size={22} />}
            title="No ledger entries"
            text="Record income and expenses to track the agency’s position."
            action={
              <Btn icon={<Plus size={16} />} onClick={() => setOpen(true)}>
                Add entry
              </Btn>
            }
          />
        )}
      </Panel>

      <Modal
        open={open}
        title="Add ledger entry"
        subtitle="Income or expense recorded against the agency."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>Save entry</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Description" wide hint={error || undefined}>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Commission — Villa Azure"
            />
          </Field>
          <Field label="Type">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as FinanceType })}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Amount">
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="12500"
            />
          </Field>
          <Field label="Category">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select
              className="input"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {['Bank transfer', 'Card', 'Cash', 'Cheque', 'Crypto'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete entry"
        message={pendingDelete ? `“${pendingDelete.label}” will be removed from the ledger.` : ''}
        onConfirm={() => pendingDelete && deleteFinance(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
