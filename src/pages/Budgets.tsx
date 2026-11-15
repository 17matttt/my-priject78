import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { budgetStatus, monthTotals } from '../lib/analytics'
import { currentMonthKey, formatMonth, monthKeyOf, shiftMonth, todayIso } from '../lib/format'
import BudgetModal from '../components/BudgetModal'
import { Icon } from '../components/Icon'
import { Badge, ConfirmDialog, EmptyState, Progress, SectionHead } from '../components/UI'

export default function Budgets() {
  const { data, money, deleteBudget } = useData()
  const [month, setMonth] = useState(currentMonthKey())
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const budget = data.budgets.find((b) => b.month === month)
  const status = useMemo(
    () => budgetStatus(budget, data.transactions, month),
    [budget, data.transactions, month],
  )

  const warnings = status.lines.filter((line) => line.state !== 'ok')
  const isCurrent = month === currentMonthKey()

  const history = useMemo(
    () =>
      [...data.budgets]
        .sort((a, b) => b.month.localeCompare(a.month))
        .map((b) => {
          const spent = monthTotals(data.transactions, b.month).expense
          return {
            month: b.month,
            budget: b.overall,
            spent,
            percent: b.overall > 0 ? (spent / b.overall) * 100 : 0,
          }
        }),
    [data.budgets, data.transactions],
  )

  const monthSpend = monthTotals(data.transactions, month).expense

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Pilotage</p>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">Plafonds mensuels, alertes à 80 % et dépassements suivis en direct.</p>
        </div>
        <div className="page-actions">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">
              <Icon name="chevron-left" size={17} />
            </button>
            <span className="month-label">{formatMonth(month)}</span>
            <button type="button" className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant">
              <Icon name="chevron-right" size={17} />
            </button>
            {!isCurrent ? (
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMonth(currentMonthKey())}>
                Aujourd'hui
              </button>
            ) : null}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditorOpen(true)}>
            <Icon name="plus" size={15} />
            <span>{budget ? 'Modifier' : 'Définir le budget'}</span>
          </button>
        </div>
      </header>

      {!budget ? (
        <section className="card">
          <EmptyState
            icon="chart"
            title={`Aucun budget pour ${formatMonth(month)}`}
            text={`Vous avez dépensé ${money(monthSpend)} ce mois-ci. Fixez une enveloppe globale et, si vous le souhaitez, des plafonds par catégorie.`}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setEditorOpen(true)}>
                <Icon name="plus" size={15} />
                Créer le budget
              </button>
            }
          />
        </section>
      ) : (
        <>
          <section className="card budget-hero">
            <div className="budget-hero-main">
              <div className="budget-hero-top">
                <div>
                  <span className="stat-label">Dépensé ce mois</span>
                  <div className="budget-hero-value tnum">{money(status.overallSpent)}</div>
                  <span className="muted">sur {money(status.overallBudget)} planifiés</span>
                </div>
                <div className="budget-hero-side">
                  <Badge tone={status.overallState === 'over' ? 'danger' : status.overallState === 'warn' ? 'warn' : 'ok'}>
                    {Math.round(status.overallPercent)} % utilisé
                  </Badge>
                  <span className={`budget-remaining ${status.overallRemaining < 0 ? 'neg' : 'pos'}`}>
                    {status.overallRemaining >= 0
                      ? `${money(status.overallRemaining)} restants`
                      : `${money(Math.abs(status.overallRemaining))} de dépassement`}
                  </span>
                </div>
              </div>
              <Progress percent={status.overallPercent} tone={status.overallState} />
              <div className="budget-hero-foot">
                <span>
                  {status.lines.length} catégorie{status.lines.length > 1 ? 's' : ''} plafonnée
                  {status.lines.length > 1 ? 's' : ''}
                </span>
                <span className="muted">{money(status.unallocated)} non répartis</span>
                <button type="button" className="link-sm" onClick={() => setConfirmOpen(true)}>
                  <Icon name="trash" size={13} />
                  Supprimer ce budget
                </button>
              </div>
            </div>
          </section>

          {warnings.length ? (
            <section className="card alert-card">
              <div className="alert-head">
                <Icon name="alert" size={17} />
                <strong>
                  {warnings.filter((w) => w.state === 'over').length > 0
                    ? 'Plafond dépassé'
                    : 'Seuil de vigilance atteint'}
                </strong>
              </div>
              <ul className="alert-list">
                {warnings.map((line) => (
                  <li key={line.category}>
                    <span className="alert-cat">{line.label}</span>
                    <span className={`state-${line.state}`}>
                      {Math.round(line.percent)} % ·{' '}
                      {line.remaining >= 0
                        ? `${money(line.remaining)} restants`
                        : `${money(Math.abs(line.remaining))} au-delà`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card">
            <SectionHead
              title="Plafonds par catégorie"
              subtitle="Mis à jour à chaque transaction"
              action={
                <button type="button" className="link-sm" onClick={() => setEditorOpen(true)}>
                  <Icon name="edit" size={13} />
                  Ajuster
                </button>
              }
            />
            {status.lines.length ? (
              <ul className="budget-lines">
                {status.lines.map((line) => (
                  <li key={line.category} className="budget-line">
                    <div className="budget-line-head">
                      <span className="budget-line-icon" style={{ color: line.color, background: `${line.color}14` }}>
                        <Icon name={line.icon} size={16} />
                      </span>
                      <span className="budget-line-label">{line.label}</span>
                      <span className="budget-line-amount tnum">
                        {money(line.spent)}
                        <span className="muted"> / {money(line.budget)}</span>
                      </span>
                    </div>
                    <Progress percent={line.percent} tone={line.state} />
                    <div className="budget-line-foot">
                      <span className={`state-${line.state}`}>{Math.round(line.percent)} %</span>
                      <span className="muted">
                        {line.remaining >= 0
                          ? `${money(line.remaining)} restants`
                          : `${money(Math.abs(line.remaining))} de dépassement`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="chart-empty">
                Aucun plafond par catégorie. Utilisez « Ajuster » pour en définir.
              </p>
            )}
          </section>
        </>
      )}

      <section className="card">
        <SectionHead title="Historique des budgets" subtitle="Mois enregistrés, du plus récent au plus ancien" />
        {history.length ? (
          <ul className="history-list">
            {history.map((row) => {
              const state = row.percent >= 100 ? 'over' : row.percent >= 80 ? 'warn' : 'ok'
              return (
                <li key={row.month}>
                  <button
                    type="button"
                    className={`history-row ${row.month === month ? 'active' : ''}`}
                    onClick={() => setMonth(row.month)}
                  >
                    <span className="history-month">{formatMonth(row.month)}</span>
                    <span className="history-bar">
                      <Progress percent={row.percent} tone={state} thin />
                    </span>
                    <span className="history-amount tnum">
                      {money(row.spent)}
                      <span className="muted"> / {money(row.budget)}</span>
                    </span>
                    <span className={`history-percent state-${state}`}>{Math.round(row.percent)} %</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="chart-empty">L'historique apparaîtra dès votre premier budget enregistré.</p>
        )}
      </section>

      <section className="card muted-card">
        <SectionHead title="Dépenses du mois sélectionné" subtitle={`${formatMonth(month)} · ${monthKeyOf(todayIso()) === month ? 'mois en cours' : 'mois clôturé'}`} />
        <div className="stat-inline">
          <span className="tnum strong">{money(monthSpend)}</span>
          <span className="muted">de dépenses enregistrées sur la période</span>
        </div>
      </section>

      <BudgetModal open={editorOpen} onClose={() => setEditorOpen(false)} month={month} initial={budget} />

      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer ce budget ?"
        message={`Le budget de ${formatMonth(month)} sera supprimé. Vos transactions restent intactes.`}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => {
          deleteBudget(month)
          setConfirmOpen(false)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
