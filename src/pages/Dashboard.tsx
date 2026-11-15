import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  balanceSeries,
  budgetStatus,
  categoryBreakdown,
  flowSeries,
  goalProjection,
  monthlyComparison,
  netWorth,
  savingsRate,
  totalsFor,
  upcomingBills,
} from '../lib/analytics'
import { categoryById, paymentLabel } from '../lib/constants'
import {
  RANGES,
  currentMonthKey,
  formatDate,
  formatMonth,
  rangeStart,
  relativeDay,
  todayIso,
  type RangeKey,
} from '../lib/format'
import { AreaChart, BarsChart, CategoryBars } from '../components/Charts'
import { Icon } from '../components/Icon'
import TransactionModal from '../components/TransactionModal'
import { EmptyState, Progress, SectionHead, Segmented, StatCard } from '../components/UI'

export default function Dashboard() {
  const { data, money, hasData } = useData()
  const [range, setRange] = useState<RangeKey>('30d')
  const [txOpen, setTxOpen] = useState(false)

  const today = todayIso()
  const month = currentMonthKey()
  const from = rangeStart(range)

  const totals = useMemo(() => totalsFor(data.transactions, from, today), [data.transactions, from, today])
  const comparison = useMemo(() => monthlyComparison(data.transactions, month), [data.transactions, month])
  const balance = useMemo(() => balanceSeries(data.transactions, range), [data.transactions, range])
  const flow = useMemo(() => flowSeries(data.transactions, range), [data.transactions, range])
  const cats = useMemo(() => categoryBreakdown(data.transactions, from, today), [data.transactions, from, today])
  const budget = useMemo(
    () => budgetStatus(data.budgets.find((b) => b.month === month), data.transactions, month),
    [data.budgets, data.transactions, month],
  )
  const bills = useMemo(() => upcomingBills(data, 21).slice(0, 5), [data])
  const recent = useMemo(
    () => [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [data.transactions],
  )
  const goals = useMemo(() => data.goals.slice(0, 3), [data.goals])

  const rate = savingsRate(totals.income, totals.expense)
  const balanceNow = netWorth(data.transactions)

  if (!hasData) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <p className="eyebrow">{formatDate(today, 'long')}</p>
            <h1 className="page-title">Votre tableau de bord</h1>
            <p className="page-sub">Ajoutez votre première opération pour voir vos chiffres prendre vie.</p>
          </div>
        </header>
        <div className="card">
          <EmptyState
            icon="wallet"
            title="Aucune donnée pour l'instant"
            text="VAULT calcule tout localement, sans compte ni connexion bancaire. Commencez par une transaction, ou explorez avec des données de démonstration clairement identifiées."
            action={
              <div className="empty-actions">
                <button type="button" className="btn btn-primary" onClick={() => setTxOpen(true)}>
                  <Icon name="plus" size={15} />
                  Ajouter une transaction
                </button>
                <Link to="/reglages" className="btn btn-quiet">
                  Charger la démonstration
                </Link>
              </div>
            }
          />
        </div>
        <TransactionModal open={txOpen} onClose={() => setTxOpen(false)} />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatDate(today, 'long')}</p>
          <h1 className="page-title">
            {data.profile.name ? `Bonjour, ${data.profile.name}` : 'Vue d’ensemble'}
          </h1>
          <p className="page-sub">Votre situation financière, calculée à partir de vos données.</p>
        </div>
        <div className="page-actions">
          <Segmented
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onChange={setRange}
            size="sm"
          />
          <button type="button" className="btn btn-primary" onClick={() => setTxOpen(true)}>
            <Icon name="plus" size={15} />
            <span>Transaction</span>
          </button>
        </div>
      </header>

      <div className="grid-4">
        <StatCard
          label="Solde total"
          value={money(balanceNow)}
          icon="wallet"
          accent
          meta={`${data.transactions.length} opérations enregistrées`}
        />
        <StatCard
          label="Revenus"
          value={money(totals.income)}
          icon="arrow-down-right"
          delta={{ value: comparison.incomeChange, suffix: 'vs mois dernier' }}
        />
        <StatCard
          label="Dépenses"
          value={money(totals.expense)}
          icon="arrow-up-right"
          delta={{ value: comparison.expenseChange, suffix: 'vs mois dernier' }}
        />
        <StatCard
          label="Épargne nette"
          value={money(totals.net)}
          icon="piggy"
          meta={`Taux d'épargne ${rate.toFixed(0)} %`}
        />
      </div>

      <div className="grid-main">
        <section className="card span-2">
          <SectionHead
            title="Évolution du solde"
            subtitle={`Sur ${RANGES.find((r) => r.id === range)?.label.toLowerCase()}`}
            action={<span className="pill">{money(balanceNow)}</span>}
          />
          <AreaChart
            points={balance.map((p) => ({ label: p.label, value: p.value }))}
            formatValue={(v) => money(v)}
            height={230}
          />
        </section>

        <section className="card">
          <SectionHead title="Revenus / dépenses" subtitle="Comparaison par période" />
          <BarsChart
            points={flow.map((p) => ({ label: p.label, income: p.income, expense: p.expense }))}
            formatValue={(v) => money(v)}
            height={230}
          />
          <div className="legend">
            <span className="legend-item">
              <span className="legend-dot income" /> Revenus
            </span>
            <span className="legend-item">
              <span className="legend-dot expense" /> Dépenses
            </span>
          </div>
        </section>
      </div>

      <div className="grid-main">
        <section className="card">
          <SectionHead
            title="Répartition des dépenses"
            subtitle={`${cats.length} catégorie${cats.length > 1 ? 's' : ''} sur la période`}
            action={
              <Link to="/analyses" className="link-sm">
                Détail
                <Icon name="arrow-right" size={13} />
              </Link>
            }
          />
          {cats.length ? (
            <CategoryBars slices={cats.slice(0, 6)} formatValue={(v) => money(v)} />
          ) : (
            <div className="chart-empty">Aucune dépense sur cette période</div>
          )}
        </section>

        <section className="card">
          <SectionHead
            title="Budget du mois"
            subtitle={formatMonth(month)}
            action={
              <Link to="/budgets" className="link-sm">
                Gérer
                <Icon name="arrow-right" size={13} />
              </Link>
            }
          />
          {budget.overallBudget > 0 ? (
            <div className="budget-mini">
              <div className="budget-mini-top">
                <span className="tnum strong">{money(budget.overallSpent)}</span>
                <span className="muted">sur {money(budget.overallBudget)}</span>
              </div>
              <Progress percent={budget.overallPercent} tone={budget.overallState} />
              <div className="budget-mini-foot">
                <span className={`state-${budget.overallState}`}>
                  {Math.round(budget.overallPercent)} % utilisé
                </span>
                <span className="muted">
                  {budget.overallRemaining >= 0
                    ? `${money(budget.overallRemaining)} restants`
                    : `${money(Math.abs(budget.overallRemaining))} de dépassement`}
                </span>
              </div>
              <ul className="mini-lines">
                {budget.lines.slice(0, 3).map((line) => (
                  <li key={line.category}>
                    <span className="mini-line-icon" style={{ color: line.color }}>
                      <Icon name={line.icon} size={14} />
                    </span>
                    <span className="mini-line-label">{line.label}</span>
                    <span className={`mini-line-value state-${line.state}`}>{Math.round(line.percent)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon="chart"
              title="Aucun budget défini"
              text="Fixez une enveloppe mensuelle pour suivre vos dépenses catégorie par catégorie."
              action={
                <Link to="/budgets" className="btn btn-quiet btn-sm">
                  Créer un budget
                </Link>
              }
            />
          )}
        </section>
      </div>

      <div className="grid-main">
        <section className="card">
          <SectionHead
            title="Transactions récentes"
            subtitle="Les derniers mouvements"
            action={
              <Link to="/transactions" className="link-sm">
                Tout voir
                <Icon name="arrow-right" size={13} />
              </Link>
            }
          />
          {recent.length ? (
            <ul className="tx-list">
              {recent.map((tx) => {
                const cat = categoryById(tx.category)
                return (
                  <li key={tx.id} className="tx-row">
                    <span className="tx-icon" style={{ color: cat.color, background: `${cat.color}14` }}>
                      <Icon name={cat.icon} size={16} />
                    </span>
                    <span className="tx-main">
                      <span className="tx-title">{tx.name}</span>
                      <span className="tx-meta">
                        {cat.label} · {formatDate(tx.date)} · {paymentLabel(tx.paymentMethod)}
                      </span>
                    </span>
                    <span className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'}`}>
                      {tx.type === 'income' ? '+' : '−'}
                      {money(tx.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="chart-empty">Aucune transaction enregistrée</div>
          )}
        </section>

        <section className="card">
          <SectionHead
            title="Prochaines échéances"
            subtitle="21 jours à venir"
            action={
              <Link to="/calendrier" className="link-sm">
                Calendrier
                <Icon name="arrow-right" size={13} />
              </Link>
            }
          />
          {bills.length ? (
            <ul className="bill-list">
              {bills.map((bill) => (
                <li key={bill.id} className="bill-row">
                  <span className="bill-date">
                    <span className="bill-day">{bill.date.slice(8, 10)}</span>
                    <span className="bill-month">{formatMonth(bill.date.slice(0, 7), 'short')}</span>
                  </span>
                  <span className="bill-main">
                    <span className="bill-title">{bill.title}</span>
                    <span className="bill-meta">{relativeDay(bill.date)}</span>
                  </span>
                  {bill.amount !== null ? (
                    <span className="bill-amount tnum">−{money(bill.amount)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="chart-empty">Aucune échéance dans les 3 prochaines semaines</div>
          )}
        </section>
      </div>

      <section className="card">
        <SectionHead
          title="Objectifs d'épargne"
          subtitle={`${data.goals.length} objectif${data.goals.length > 1 ? 's' : ''} en cours`}
          action={
            <Link to="/epargne" className="link-sm">
              Gérer
              <Icon name="arrow-right" size={13} />
            </Link>
          }
        />
        {goals.length ? (
          <div className="goal-mini-grid">
            {goals.map((goal) => {
              const proj = goalProjection(goal)
              return (
                <div key={goal.id} className="goal-mini">
                  <div className="goal-mini-head">
                    <span className="goal-mini-icon">
                      <Icon name={goal.icon} size={16} />
                    </span>
                    <span className="goal-mini-name">{goal.name}</span>
                    <span className="goal-mini-percent tnum">{Math.round(proj.percent)} %</span>
                  </div>
                  <Progress percent={proj.percent} tone={proj.percent >= 100 ? 'accent' : 'ok'} />
                  <div className="goal-mini-foot">
                    <span className="tnum">{money(goal.saved)}</span>
                    <span className="muted">sur {money(goal.target)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="target"
            title="Aucun objectif"
            text="Créez un objectif pour visualiser votre progression vers une cible concrète."
            action={
              <Link to="/epargne" className="btn btn-quiet btn-sm">
                Créer un objectif
              </Link>
            }
          />
        )}
      </section>

      <TransactionModal open={txOpen} onClose={() => setTxOpen(false)} />
    </div>
  )
}
