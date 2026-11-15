import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import {
  balanceSeries,
  categoryBreakdown,
  monthlyComparison,
  monthlyHistory,
  savingsRate,
  totalsFor,
} from '../lib/analytics'
import { categoryById } from '../lib/constants'
import {
  RANGES,
  daysBetween,
  formatPercent,
  rangeStart,
  todayIso,
  type RangeKey,
} from '../lib/format'
import { AreaChart, BarsChart, CategoryBars, DonutChart } from '../components/Charts'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, Segmented } from '../components/UI'

export default function Analytics() {
  const { data, money } = useData()
  const [range, setRange] = useState<RangeKey>('6m')

  const from = rangeStart(range)
  const to = todayIso()

  const view = useMemo(() => {
    const totals = totalsFor(data.transactions, from, to)
    const rate = savingsRate(totals.income, totals.expense)
    const days = Math.max(1, daysBetween(from, to) + 1)
    const cats = categoryBreakdown(data.transactions, from, to, 'expense')
    const incomeCats = categoryBreakdown(data.transactions, from, to, 'income')
    const history = monthlyHistory(data.transactions, 12)
    const balance = balanceSeries(data.transactions, range)
    const comparison = monthlyComparison(data.transactions, todayIso().slice(0, 7))
    const biggest = data.transactions
      .filter((t) => t.type === 'expense' && t.date >= from && t.date <= to)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
    const monthsTracked = history.filter((h) => h.income > 0 || h.expense > 0).length
    const avgIncome = monthsTracked ? history.reduce((s, h) => s + h.income, 0) / monthsTracked : 0
    const avgExpense = monthsTracked ? history.reduce((s, h) => s + h.expense, 0) / monthsTracked : 0
    return {
      totals,
      rate,
      avgDaily: totals.expense / days,
      cats,
      incomeCats,
      history,
      balance,
      comparison,
      biggest,
      avgIncome,
      avgExpense,
      monthsTracked,
    }
  }, [data.transactions, from, to, range])

  const hasData = data.transactions.length > 0

  if (!hasData) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Analyses</p>
            <h1 className="page-title">Votre évolution financière</h1>
            <p className="page-sub">Les graphiques apparaissent dès la première transaction enregistrée.</p>
          </div>
        </header>
        <EmptyState
          icon="chart"
          title="Aucune donnée à analyser"
          text="Ajoutez vos revenus et dépenses pour visualiser vos tendances mensuelles, votre taux d’épargne et vos postes de dépense."
        />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Analyses</p>
          <h1 className="page-title">Votre évolution financière</h1>
          <p className="page-sub">Tendances, répartition et comparaisons calculées sur vos données réelles.</p>
        </div>
      </header>

      <Segmented
        value={range}
        onChange={(value) => setRange(value as RangeKey)}
        options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
      />

      <section className="grid grid-4">
        <div className="card kpi">
          <span className="stat-label">Revenus</span>
          <span className="kpi-value tnum pos">{money(view.totals.income)}</span>
          <span className="stat-foot muted">{view.monthsTracked} mois analysés</span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Dépenses</span>
          <span className="kpi-value tnum neg">{money(view.totals.expense)}</span>
          <span className="stat-foot muted">{money(view.avgDaily)} / jour en moyenne</span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Épargne nette</span>
          <span className="kpi-value tnum">{money(view.totals.net)}</span>
          <span className="stat-foot muted">Revenus − dépenses</span>
        </div>
        <div className="card kpi">
          <span className="stat-label">Taux d’épargne</span>
          <span className="kpi-value tnum">{formatPercent(view.rate, 1)}</span>
          <span className="stat-foot muted">Part des revenus non dépensée</span>
        </div>
      </section>

      <section className="card">
        <SectionHead
          title="Évolution du solde"
          subtitle={`Cumul net sur la période · ${RANGES.find((r) => r.id === range)?.label}`}
        />
        <AreaChart
          points={view.balance.map((p) => ({ label: p.label, value: p.value }))}
          formatValue={(v) => money(v)}
          height={240}
        />
      </section>

      <section className="grid grid-main">
        <div className="card">
          <SectionHead title="Revenus et dépenses" subtitle="12 derniers mois" />
          <BarsChart
            points={view.history.map((h) => ({ label: h.label, income: h.income, expense: h.expense }))}
            formatValue={(v) => money(v)}
            height={230}
          />
          <div className="legend">
            <span className="legend-item">
              <i className="legend-dot" style={{ background: 'var(--accent)' }} />
              Revenus
            </span>
            <span className="legend-item">
              <i className="legend-dot" style={{ background: '#8FB8FF' }} />
              Dépenses
            </span>
          </div>
        </div>

        <div className="card">
          <SectionHead title="Répartition des dépenses" subtitle="Sur la période sélectionnée" />
          {view.cats.length ? (
            <>
              <DonutChart
                slices={view.cats.slice(0, 7).map((c) => ({ id: c.id, label: c.label, value: c.value, color: c.color }))}
                centerLabel={money(view.totals.expense)}
                formatValue={(v) => money(v)}
              />
              <CategoryBars slices={view.cats.slice(0, 5)} formatValue={(v) => money(v)} />
            </>
          ) : (
            <p className="hint">Aucune dépense sur cette période.</p>
          )}
        </div>
      </section>

      <section className="grid grid-main">
        <div className="card">
          <SectionHead title="Moyennes mensuelles" subtitle={`Basées sur ${view.monthsTracked} mois d’activité`} />
          <div className="summary-strip">
            <div className="summary-item">
              <span className="stat-label">Revenu moyen</span>
              <span className="kpi-value tnum pos">{money(view.avgIncome)}</span>
            </div>
            <div className="summary-item">
              <span className="stat-label">Dépense moyenne</span>
              <span className="kpi-value tnum neg">{money(view.avgExpense)}</span>
            </div>
            <div className="summary-item">
              <span className="stat-label">Solde moyen</span>
              <span className="kpi-value tnum">{money(view.avgIncome - view.avgExpense)}</span>
            </div>
          </div>
          <div className="divider" />
          <SectionHead title="Comparaison mensuelle" subtitle={`${view.comparison.prevMonthLabel} → mois en cours`} />
          <ul className="info-list">
            <li className="info-row">
              <span>Revenus</span>
              <span className="tnum">{money(view.comparison.current.income)}</span>
            </li>
            <li className="info-row">
              <span>Dépenses</span>
              <span className="tnum">{money(view.comparison.current.expense)}</span>
            </li>
            <li className="info-row">
              <span>Variation des dépenses</span>
              <span className={`tnum ${(view.comparison.expenseChange ?? 0) > 0 ? 'neg' : 'pos'}`}>
                {view.comparison.expenseChange === null
                  ? '—'
                  : `${view.comparison.expenseChange > 0 ? '+' : ''}${formatPercent(view.comparison.expenseChange, 1)}`}
              </span>
            </li>
            <li className="info-row">
              <span>Variation des revenus</span>
              <span className={`tnum ${(view.comparison.incomeChange ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                {view.comparison.incomeChange === null
                  ? '—'
                  : `${view.comparison.incomeChange > 0 ? '+' : ''}${formatPercent(view.comparison.incomeChange, 1)}`}
              </span>
            </li>
          </ul>
        </div>

        <div className="card">
          <SectionHead title="Plus grosses dépenses" subtitle="Sur la période sélectionnée" />
          {view.biggest.length ? (
            <ul className="tx-list">
              {view.biggest.map((t) => {
                const cat = categoryById(t.category)
                return (
                  <li key={t.id} className="tx-row">
                    <span className="tx-icon" style={{ color: cat.color, background: `${cat.color}1A` }}>
                      <Icon name={cat.icon} size={16} />
                    </span>
                    <div className="tx-main">
                      <span className="tx-title">{t.name}</span>
                      <span className="tx-meta">{cat.label}</span>
                    </div>
                    <span className="tnum neg">−{money(t.amount)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="hint">Aucune dépense sur cette période.</p>
          )}
          {view.incomeCats.length ? (
            <>
              <div className="divider" />
              <SectionHead title="Sources de revenus" subtitle="Répartition des entrées" />
              <CategoryBars slices={view.incomeCats.slice(0, 4)} formatValue={(v) => money(v)} />
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
