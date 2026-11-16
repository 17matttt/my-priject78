import { useMemo, useState } from 'react'
import { BarChart3, Download, TrendingDown, TrendingUp } from 'lucide-react'
import { Btn, PageHeader, Panel, Segmented } from '../components/UI'
import { AreaChart, BarChart, Donut } from '../components/Charts'
import { useApp } from '../context/AppContext'
import {
  currentMonth,
  growth,
  kindSplit,
  previousMonth,
  propertyStats,
  revenueSeries,
  statusSplit,
  topAgents,
} from '../lib/analytics'
import { downloadFile } from '../lib/export'
import { shortDate } from '../lib/format'

export function Reports() {
  const { data, money } = useApp()
  const [range, setRange] = useState<'6' | '9' | '12'>('9')

  const series = useMemo(() => revenueSeries(data, Number(range)), [data, range])
  const month = currentMonth(data)
  const prev = previousMonth(data)
  const revenueGrowth = growth(month.income, prev.income)
  const spendGrowth = growth(month.expense, prev.expense)
  const stats = propertyStats(data)
  const kinds = kindSplit(data.properties)
  const statuses = statusSplit(data.properties)
  const agents = topAgents(data)

  const exportReport = () => {
    const rows = [
      ['Month', 'Income', 'Expenses', 'Net'],
      ...series.map((point) => [
        point.label,
        String(point.income),
        String(point.expense),
        String(point.net),
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadFile('vantage-revenue-report.csv', csv, 'text/csv')
  }

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Reports"
        subtitle="Revenue, portfolio composition and agent performance."
        actions={
          <Btn variant="dark" icon={<Download size={16} />} onClick={exportReport}>
            Export CSV
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-4">
        <div className="stat-card stat-light">
          <p className="stat-label">Revenue this month</p>
          <strong className="stat-value">{money(month.income, true)}</strong>
          <p className={`stat-delta ${revenueGrowth >= 0 ? 'up' : 'down'}`}>
            {revenueGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(revenueGrowth).toFixed(1)}% vs last month
          </p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Expenses this month</p>
          <strong className="stat-value">{money(month.expense, true)}</strong>
          <p className={`stat-delta ${spendGrowth <= 0 ? 'up' : 'down'}`}>
            {spendGrowth <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(spendGrowth).toFixed(1)}% vs last month
          </p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Net result</p>
          <strong className="stat-value">{money(month.net, true)}</strong>
          <p className="stat-hint">Income minus expenses</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Portfolio value</p>
          <strong className="stat-value">{money(stats.portfolioValue, true)}</strong>
          <p className="stat-hint">{stats.total} properties tracked</p>
        </div>
      </div>

      <Panel
        tone="glass"
        title="Revenue evolution"
        subtitle="Monthly income against expenses"
        actions={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: '6M' },
              { value: '9', label: '9M' },
              { value: '12', label: '12M' },
            ]}
          />
        }
      >
        <BarChart
          data={series.map((point) => ({ label: point.label, a: point.income, b: point.expense }))}
          format={(value) => money(value, true)}
          height={260}
        />
      </Panel>

      <div className="split-2">
        <Panel tone="glass" title="Net cashflow" subtitle="Income minus expenses per month">
          <AreaChart
            data={series.map((point) => ({ label: point.label, value: point.net }))}
            format={(value) => money(value, true)}
            height={230}
            color="#0f9e90"
          />
        </Panel>
        <Panel tone="glass" title="Portfolio by type" subtitle="Share of listings">
          <Donut slices={kinds} centerLabel="Listings" centerValue={String(stats.total)} />
        </Panel>
      </div>

      <div className="split-2">
        <Panel tone="glass" title="Moderation pipeline" subtitle="Current listing status">
          <Donut
            slices={statuses}
            centerLabel="Approved"
            centerValue={`${Math.round((stats.approved / (stats.total || 1)) * 100)}%`}
          />
        </Panel>
        <Panel tone="glass" title="Agent leaderboard" subtitle="Commission volume">
          <ul className="rank-list compact">
            {agents.slice(0, 5).map((agent, index) => (
              <li key={agent.name}>
                <span className="rank-num">{index + 1}</span>
                <div className="rank-main">
                  <strong>{agent.name}</strong>
                  <small>{agent.deals} deals</small>
                </div>
                <div className="rank-bar">
                  <span style={{ width: `${Math.max(8, (agent.revenue / (agents[0]?.revenue || 1)) * 100)}%` }} />
                </div>
                <strong className="rank-value">{money(agent.revenue, true)}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel tone="glass" title="Monthly detail" subtitle="Full breakdown for the selected range">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Net</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((point) => (
                <tr key={point.key}>
                  <td className="cell-strong">{point.label}</td>
                  <td>{money(point.income)}</td>
                  <td>{money(point.expense)}</td>
                  <td className={point.net >= 0 ? 'cell-positive' : 'cell-negative'}>
                    {money(point.net)}
                  </td>
                  <td>
                    {point.income > 0 ? `${((point.net / point.income) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          <BarChart3 size={14} /> Generated {shortDate(new Date().toISOString())} from{' '}
          {data.properties.length} listings and {data.finance.length} ledger entries.
        </p>
      </Panel>
    </>
  )
}
