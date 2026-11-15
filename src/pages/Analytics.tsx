import { useMemo, useState } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Badge, EmptyState, MonthNav, PageHead, Progress } from '../components/UI'
import { Donut, MonthlyBars, RateLine, type DonutSlice, type TrendPoint } from '../components/Charts'
import {
  categoryBreakdown,
  lastMonths,
  monthlySeries,
  percentChange,
  savingsRate,
  totalsFor,
} from '../lib/analytics'
import {
  currentMonthKey,
  formatCompact,
  formatMoney,
  formatMonth,
  formatMonthShort,  formatPercent,
  shiftMonth,
} from '../lib/format'
import { DEFAULT_CURRENCY, categoryColor, categoryLabel } from '../lib/constants'

export default function Analytics() {
  const { profile, transactions, loading } = useData()

  const currency = profile?.currency ?? DEFAULT_CURRENCY
  const masked = profile?.privacy_mode ?? false

  const [month, setMonth] = useState(currentMonthKey())

  const months = useMemo(() => lastMonths(6, month), [month])
  const series = useMemo<TrendPoint[]>(() => {
    const points = monthlySeries(transactions, months)
    return points.map((point) => ({
      label: formatMonthShort(point.month),
      income: point.income,
      expense: point.expense,
    }))
  }, [transactions, months])

  const current = useMemo(() => totalsFor(transactions, month), [transactions, month])
  const previousMonth = shiftMonth(month, -1)
  const previous = useMemo(() => totalsFor(transactions, previousMonth), [transactions, previousMonth])

  const breakdown = useMemo(
    () => categoryBreakdown(transactions, month, 'expense'),
    [transactions, month],
  )

  const slices = useMemo<DonutSlice[]>(
    () =>
      breakdown.slice(0, 7).map((slice) => ({
        label: categoryLabel(slice.category),
        value: slice.total,
        color: categoryColor(slice.category),
      })),
    [breakdown],
  )

  const rateNow = savingsRate(current.income, current.expense)
  const rateBefore = savingsRate(previous.income, previous.expense)

  const rateValues = useMemo(() => {
    const points = monthlySeries(transactions, months)
    return points.map((point) => savingsRate(point.income, point.expense))
  }, [transactions, months])

  const comparisons = [
    { label: 'Income', now: current.income, before: previous.income, good: 'up' as const },
    { label: 'Expenses', now: current.expense, before: previous.expense, good: 'down' as const },
    { label: 'Net saved', now: current.net, before: previous.net, good: 'up' as const },
  ]

  const hasData = transactions.length > 0

  return (
    <div className="stack">
      <PageHead
        eyebrow="Insight"
        title="Analytics"
        sub="Six-month trends, category concentration and the rate you actually save."
        actions={
          <MonthNav
            label={formatMonth(month)}
            onPrev={() => setMonth(shiftMonth(month, -1))}
            onNext={() => setMonth(shiftMonth(month, 1))}
            nextDisabled={month >= currentMonthKey()}
            onReset={() => setMonth(currentMonthKey())}
          />
        }
      />

      {loading ? (
        <div className="card skeleton" style={{ height: 240 }} />
      ) : !hasData ? (
        <section className="card">
          <div className="card-pad">
            <EmptyState
              icon={<BarChart3 size={20} />}
              title="Analytics appear with your first transaction"
              text="Record income and expenses and VAULT builds the monthly comparison, category breakdown and savings rate automatically."
            />
          </div>
        </section>
      ) : (
        <>
          <div className="grid g-3">
            <div className="stat">
              <div className="stat-top">
                <span className="stat-label">Income · {formatMonthShort(month)}</span>
              </div>
              <div className="stat-value tnum" style={{ color: 'var(--accent)' }}>
                {formatMoney(current.income, currency, { masked })}
              </div>
              <div className="stat-foot">
                <span>vs {formatMoney(previous.income, currency, { masked })} previous</span>
              </div>
            </div>

            <div className="stat">
              <div className="stat-top">
                <span className="stat-label">Expenses · {formatMonthShort(month)}</span>
              </div>
              <div className="stat-value tnum">
                {formatMoney(current.expense, currency, { masked })}
              </div>
              <div className="stat-foot">
                <span>vs {formatMoney(previous.expense, currency, { masked })} previous</span>
              </div>
            </div>

            <div className="stat">
              <div className="stat-top">
                <span className="stat-label">Savings rate</span>
                <span className="stat-icon lime">
                  <TrendingUp size={15} />
                </span>
              </div>
              <div className="stat-value tnum">{formatPercent(rateNow, 1)}</div>
              <div className="stat-foot">
                <span>
                  {previous.income > 0 || previous.expense > 0
                    ? `previous month ${formatPercent(rateBefore, 1)}`
                    : 'no previous month data'}
                </span>
              </div>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Income vs expenses</h2>
                <p className="card-sub">Last six months · hover a bar for exact figures</p>
              </div>
              <div className="row" style={{ gap: 14 }}>
                <span className="row" style={{ gap: 6, fontSize: 11.5, color: 'var(--muted)' }}>
                  <span className="dot" style={{ background: 'var(--accent)' }} />
                  Income
                </span>
                <span className="row" style={{ gap: 6, fontSize: 11.5, color: 'var(--muted)' }}>
                  <span className="dot" style={{ background: '#4a4f5c' }} />
                  Expenses
                </span>
              </div>
            </div>
            <div className="card-pad">
              <MonthlyBars points={series} currency={currency} masked={masked} height={250} />
            </div>
          </section>

          <div className="grid g-2">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Where it went</h2>
                  <p className="card-sub">{formatMonth(month)} spending by category</p>
                </div>
              </div>
              <div className="card-pad">
                <Donut
                  slices={slices}
                  total={current.expense}
                  currency={currency}
                  masked={masked}
                  caption="Spent this month"
                />

                {breakdown.length > 0 ? (
                  <div className="stack" style={{ gap: 12, marginTop: 20 }}>
                    {breakdown.slice(0, 6).map((slice) => (
                      <div key={slice.category}>
                        <div className="row-between" style={{ marginBottom: 6 }}>
                          <span className="row" style={{ gap: 8, fontSize: 12.5 }}>
                            <span
                              className="dot"
                              style={{ background: categoryColor(slice.category), width: 8, height: 8 }}
                            />
                            {categoryLabel(slice.category)}
                            <span style={{ color: 'var(--muted-2)' }}>· {slice.count}</span>
                          </span>
                          <span className="tnum" style={{ fontSize: 12.5 }}>
                            {formatMoney(slice.total, currency, { masked })}
                            <span style={{ color: 'var(--muted-2)', marginLeft: 8 }}>
                              {formatPercent(slice.share, 0)}
                            </span>
                          </span>
                        </div>
                        <Progress value={slice.share} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tx-meta" style={{ marginTop: 16 }}>
                    No expenses recorded in {formatMonth(month)}.
                  </p>
                )}
              </div>
            </section>

            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2 className="card-title">Month over month</h2>
                    <p className="card-sub">
                      {formatMonthShort(month)} against {formatMonthShort(previousMonth)}
                    </p>
                  </div>
                </div>
                <div className="card-pad">
                  <div className="stack" style={{ gap: 4 }}>
                    {comparisons.map((row) => {
                      const change = percentChange(row.now, row.before)
                      const positive = change === null ? null : change >= 0
                      const good = positive === null ? null : row.good === 'up' ? positive : !positive
                      return (
                        <div className="settings-row" key={row.label} style={{ padding: '13px 0' }}>
                          <div>
                            <div className="settings-label">{row.label}</div>
                            <div className="settings-desc tnum">
                              {formatMoney(row.before, currency, { masked })} →{' '}
                              {formatMoney(row.now, currency, { masked })}
                            </div>
                          </div>
                          {change === null ? (
                            <Badge tone="neutral">New</Badge>
                          ) : (
                            <Badge tone={good ? 'lime' : 'red'}>
                              {change >= 0 ? '+' : '−'}
                              {Math.abs(change).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="row-between" style={{ marginTop: 16 }}>
                    <span className="tx-meta" style={{ margin: 0 }}>
                      Net this month
                    </span>
                    <span
                      className="tnum"
                      style={{
                        fontWeight: 600,
                        color: current.net >= 0 ? 'var(--accent)' : 'var(--danger)',
                      }}
                    >
                      {formatMoney(current.net, currency, { masked, signed: true })}
                    </span>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div>
                    <h2 className="card-title">Savings rate evolution</h2>
                    <p className="card-sub">Share of income kept, by month</p>
                  </div>
                </div>
                <div className="card-pad">
                  <RateLine
                    values={rateValues}
                    labels={months.map((key) => formatMonthShort(key))}
                    height={180}
                  />
                  <div className="row-between" style={{ marginTop: 10 }}>
                    <span className="tx-meta" style={{ margin: 0 }}>
                      Six-month average
                    </span>
                    <span className="tnum" style={{ fontSize: 12.5 }}>
                      {formatPercent(
                        rateValues.length > 0
                          ? rateValues.reduce((acc, value) => acc + value, 0) / rateValues.length
                          : 0,
                        1,
                      )}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <p className="tx-meta" style={{ textAlign: 'center' }}>
            All figures are computed from your recorded transactions — largest monthly income{' '}
            {formatCompact(
              Math.max(...series.map((point) => point.income), 0),
              currency,
              masked,
            )}
            .
          </p>
        </>
      )}
    </div>
  )
}
