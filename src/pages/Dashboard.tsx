import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Badge, Delta, EmptyState, PageHead, Progress } from '../components/UI'
import { Donut, TrendChart, type TrendPoint } from '../components/Charts'
import TransactionModal from '../components/TransactionModal'
import {
  balanceOf,
  categoryBreakdown,
  daysUntil,
  goalProgress,
  lastMonths,
  monthlySeries,
  percentChange,
  savingsRate,
  sortByDateDesc,
  totalsFor,
} from '../lib/analytics'
import {
  currentMonthKey,
  formatMoney,
  formatMonth,
  formatPercent,
  relativeDay,
  shiftMonth,
} from '../lib/format'
import { DEFAULT_CURRENCY, categoryColor, categoryLabel } from '../lib/constants'

export default function Dashboard() {
  const { profile, transactions, goals, loading, error } = useData()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const currency = profile?.currency ?? DEFAULT_CURRENCY
  const masked = profile?.privacy_mode ?? false

  const month = currentMonthKey()
  const prevMonth = shiftMonth(month, -1)

  const totals = useMemo(() => totalsFor(transactions, month), [transactions, month])
  const prev = useMemo(() => totalsFor(transactions, prevMonth), [transactions, prevMonth])
  const balance = useMemo(() => balanceOf(transactions), [transactions])
  const series = useMemo(() => monthlySeries(transactions, lastMonths(6)), [transactions])

  const slices = useMemo(
    () =>
      categoryBreakdown(transactions, month, 'expense')
        .slice(0, 6)
        .map((slice) => ({
          label: categoryLabel(slice.category),
          value: slice.total,
          color: categoryColor(slice.category),
        })),
    [transactions, month],
  )

  const recent = useMemo(() => sortByDateDesc(transactions).slice(0, 6), [transactions])
  const points: TrendPoint[] = series.map((point) => ({
    label: formatMonth(point.month, 'short'),
    income: point.income,
    expense: point.expense,
  }))

  const rate = savingsRate(totals.income, totals.expense)
  const topGoals = useMemo(
    () => [...goals].sort((a, b) => goalProgress(b) - goalProgress(a)).slice(0, 3),
    [goals],
  )

  const firstName =
    (profile?.full_name ?? user?.name ?? '').trim().split(/\s+/)[0] || 'there'

  if (loading) {
    return (
      <div className="stack">
        <PageHead eyebrow="Overview" title="Loading your position…" />
        <div className="grid g-main">
          <div className="hero skeleton" style={{ height: 210 }} />
          <div className="stack">
            <div className="stat skeleton" style={{ height: 96 }} />
            <div className="stat skeleton" style={{ height: 96 }} />
          </div>
        </div>
        <div className="card skeleton" style={{ height: 300 }} />
      </div>
    )
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow={formatMonth(month)}
        title={`Good to see you, ${firstName}.`}
        sub="Here is exactly where your money stands today."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus />
            New transaction
          </button>
        }
      />

      {error ? <div className="banner">{error}</div> : null}

      <div className="grid g-main">
        <section className="hero">
          <div className="hero-label">Total tracked balance</div>
          <div className="hero-value tnum">{formatMoney(balance, currency, { masked })}</div>
          <div className="hero-foot">
            <Delta value={percentChange(totals.net, prev.net)} suffix="net vs last month" />
            <span className="hero-note">
              {formatPercent(rate, 1)} savings rate · {formatMonth(month, 'short')}
            </span>
          </div>
          <div className="hero-note" style={{ marginTop: 18 }}>
            {transactions.length === 0
              ? 'Add your first entry to start tracking — every figure below is calculated from your own data.'
              : `${transactions.length} entries tracked across ${new Set(transactions.map((tx) => tx.category)).size} categories.`}
          </div>
        </section>

        <div className="stack">
          <div className="stat">
            <div className="stat-top">
              <span className="stat-label">Income this month</span>
              <span className="stat-icon" style={{ color: 'var(--accent)' }}>
                <ArrowDownLeft size={15} />
              </span>
            </div>
            <div className="stat-value tnum" style={{ color: 'var(--accent)' }}>
              {formatMoney(totals.income, currency, { masked })}
            </div>
            <div className="stat-foot">
              <Delta value={percentChange(totals.income, prev.income)} />
              <span>vs {formatMonth(prevMonth, 'short')}</span>
            </div>
          </div>

          <div className="stat">
            <div className="stat-top">
              <span className="stat-label">Expenses this month</span>
              <span className="stat-icon">
                <ArrowUpRight size={15} />
              </span>
            </div>
            <div className="stat-value tnum">{formatMoney(totals.expense, currency, { masked })}</div>
            <div className="stat-foot">
              <Delta value={percentChange(totals.expense, prev.expense)} />
              <span>vs {formatMonth(prevMonth, 'short')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Net savings</span>
            <span className="stat-icon" style={{ color: totals.net >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              <TrendingUp size={15} />
            </span>
          </div>
          <div className="stat-value tnum">{formatMoney(totals.net, currency, { masked, signed: true })}</div>
          <div className="stat-foot">
            <span>{totals.net >= 0 ? 'Money kept this month' : 'Spending above income'}</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Previous month net</span>
          </div>
          <div className="stat-value tnum">{formatMoney(prev.net, currency, { masked, signed: true })}</div>
          <div className="stat-foot">
            <span>{formatMonth(prevMonth, 'short')} · income {formatMoney(prev.income, currency, { masked })}</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Savings goals</span>
            <span className="stat-icon" style={{ color: 'var(--accent)' }}>
              <Target size={15} />
            </span>
          </div>
          <div className="stat-value tnum">{goals.length}</div>
          <div className="stat-foot">
            <span>
              {formatMoney(goals.reduce((acc, goal) => acc + goal.saved_amount, 0), currency, { masked })} saved in total
            </span>
          </div>
        </div>
      </div>

      <div className="grid g-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Income versus expenses</h2>
              <p className="card-sub">Last six months, from your own entries</p>
            </div>
            <div className="legend">
              <span className="legend-row">
                <span className="dot" style={{ background: 'var(--accent)' }} /> Income
              </span>
              <span className="legend-row">
                <span className="dot" style={{ background: 'var(--muted-2)' }} /> Expenses
              </span>
            </div>
          </div>
          <div className="card-pad">
            {transactions.length === 0 ? (
              <EmptyState
                icon={<Receipt size={20} />}
                title="No history yet"
                text="Your income and expense curve appears as soon as you add your first transaction."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
                    <Plus />
                    Add transaction
                  </button>
                }
              />
            ) : (
              <TrendChart points={points} currency={currency} masked={masked} />
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Spending categories</h2>
              <p className="card-sub">{formatMonth(month)}</p>
            </div>
          </div>
          <div className="card-pad">
            {slices.length === 0 ? (
              <EmptyState
                icon={<Target size={20} />}
                title="Nothing spent yet"
                text="Log an expense and VAULT will break it down by category here."
              />
            ) : (
              <Donut slices={slices} total={totals.expense} currency={currency} masked={masked} />
            )}
          </div>
        </section>
      </div>

      <div className="grid g-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent transactions</h2>
              <p className="card-sub">Latest activity across all accounts</p>
            </div>
            <Link to="/transactions" className="link-btn">
              View all
            </Link>
          </div>
          <div className="card-pad">
            {recent.length === 0 ? (
              <EmptyState
                icon={<Receipt size={20} />}
                title="Your ledger is empty"
                text="Add income or an expense to see it appear here instantly."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
                    <Plus />
                    Add transaction
                  </button>
                }
              />
            ) : (
              <div className="tx-list">
                {recent.map((tx) => (
                  <div className="tx-row" key={tx.id}>
                    <span
                      className="tx-icon"
                      style={{
                        background: `${categoryColor(tx.category)}1f`,
                        color: categoryColor(tx.category),
                      }}
                    >
                      {tx.type === 'income' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div className="tx-main">
                      <div className="tx-desc">{tx.description || categoryLabel(tx.category)}</div>
                      <div className="tx-meta">
                        {categoryLabel(tx.category)} · {relativeDay(tx.occurred_on)}
                      </div>
                    </div>
                    <div
                      className="tx-amount tnum"
                      style={{ color: tx.type === 'income' ? 'var(--accent)' : 'var(--text)' }}
                    >
                      {tx.type === 'income' ? '+' : '−'}
                      {formatMoney(tx.amount, currency, { masked })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Savings goals</h2>
              <p className="card-sub">Progress towards what matters</p>
            </div>
            <Link to="/savings" className="link-btn">
              Manage
            </Link>
          </div>
          <div className="card-pad">
            {topGoals.length === 0 ? (
              <EmptyState
                icon={<Target size={20} />}
                title="No goals yet"
                text="Create a savings goal and VAULT tracks your progress and monthly pace automatically."
                action={
                  <Link to="/savings" className="btn btn-primary btn-sm">
                    <Plus />
                    Create goal
                  </Link>
                }
              />
            ) : (
              <div className="stack" style={{ gap: 18 }}>
                {topGoals.map((goal) => {
                  const progress = goalProgress(goal)
                  const days = daysUntil(goal.deadline)
                  return (
                    <div key={goal.id} className="stack" style={{ gap: 8 }}>
                      <div className="row-between">
                        <span className="budget-name">{goal.name}</span>
                        <span className="tx-meta" style={{ margin: 0 }}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} />
                      <div className="row-between">
                        <span className="tx-meta" style={{ margin: 0 }}>
                          {formatMoney(goal.saved_amount, currency, { masked })} of{' '}
                          {formatMoney(goal.target_amount, currency, { masked })}
                        </span>
                        {days !== null ? (
                          <Badge tone={days < 0 ? 'red' : days < 30 ? 'warn' : 'neutral'}>
                            {days < 0 ? `${Math.abs(days)}d late` : `${days}d left`}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">No deadline</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <TransactionModal
        open={open}
        onClose={() => setOpen(false)}
        currency={currency}
      />
    </div>
  )
}
