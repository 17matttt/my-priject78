import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { totalsFor } from '../lib/analytics'
import { categoriesFor, categoryById, paymentLabel, recurrenceLabel } from '../lib/constants'
import {
  RANGES,
  formatDate,
  parseAmount,
  rangeStart,
  relativeDay,
  todayIso,
  type RangeKey,
} from '../lib/format'
import type { Transaction } from '../lib/types'
import { Icon } from '../components/Icon'
import TransactionModal from '../components/TransactionModal'
import { Badge, ConfirmDialog, EmptyState, InfoRow, Modal } from '../components/UI'

type TypeFilter = 'all' | 'income' | 'expense'

export default function Transactions() {
  const { data, money, deleteTransaction } = useData()
  const [searchParams] = useSearchParams()

  const [term, setTerm] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [period, setPeriod] = useState<RangeKey | 'all'>('all')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [detail, setDetail] = useState<Transaction | null>(null)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setTerm(q)
  }, [searchParams])

  useEffect(() => {
    setLimit(50)
  }, [term, category, type, period, min, max])

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()
    const minValue = parseAmount(min)
    const maxValue = parseAmount(max)
    const from = period === 'all' ? null : rangeStart(period)
    const to = todayIso()

    return data.transactions
      .filter((tx) => {
        if (type !== 'all' && tx.type !== type) return false
        if (category !== 'all' && tx.category !== category) return false
        if (from && (tx.date < from || tx.date > to)) return false
        if (minValue > 0 && tx.amount < minValue) return false
        if (maxValue > 0 && tx.amount > maxValue) return false
        if (needle) {
          const cat = categoryById(tx.category)
          const hay = `${tx.name} ${cat.label} ${tx.notes ?? ''}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [data.transactions, term, category, type, period, min, max])

  const summary = useMemo(() => {
    const totals = totalsFor(filtered, '0000-01-01', '9999-12-31')
    return { ...totals, count: filtered.length }
  }, [filtered])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of filtered.slice(0, limit)) {
      const list = map.get(tx.date) ?? []
      list.push(tx)
      map.set(tx.date, list)
    }
    return [...map.entries()]
  }, [filtered, limit])

  const hasFilters = Boolean(term || category !== 'all' || type !== 'all' || period !== 'all' || min || max)

  const resetFilters = () => {
    setTerm('')
    setCategory('all')
    setType('all')
    setPeriod('all')
    setMin('')
    setMax('')
  }

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setDetail(null)
    setFormOpen(true)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Journal</p>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">
            {data.transactions.length} opération{data.transactions.length > 1 ? 's' : ''} enregistrée
            {data.transactions.length > 1 ? 's' : ''} localement.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={15} />
            <span>Nouvelle transaction</span>
          </button>
        </div>
      </header>

      <section className="card">
        <div className="toolbar">
          <div className="search-field search-field-inline">
            <Icon name="search" size={16} />
            <input
              className="search-input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Rechercher un libellé, une note…"
              aria-label="Rechercher une transaction"
            />
            {term ? (
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => setTerm('')} aria-label="Effacer">
                <Icon name="x" size={14} />
              </button>
            ) : null}
          </div>

          <div className="filters">
            <select className="select select-sm" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Type">
              <option value="all">Tous les types</option>
              <option value="income">Revenus</option>
              <option value="expense">Dépenses</option>
            </select>

            <select className="select select-sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
              <option value="all">Toutes catégories</option>
              {[...categoriesFor('expense'), ...categoriesFor('income')].map((c) => (
                <option key={`${c.type}-${c.id}`} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="select select-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as RangeKey | 'all')}
              aria-label="Période"
            >
              <option value="all">Toute période</option>
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <div className="amount-range">
              <input
                className="input input-sm"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="Min €"
                aria-label="Montant minimum"
              />
              <span className="dash">–</span>
              <input
                className="input input-sm"
                inputMode="decimal"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Max €"
                aria-label="Montant maximum"
              />
            </div>

            {hasFilters ? (
              <button type="button" className="btn btn-quiet btn-sm" onClick={resetFilters}>
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        <div className="summary-strip">
          <span className="summary-item">
            <span className="muted">Résultats</span>
            <span className="tnum strong">{summary.count}</span>
          </span>
          <span className="summary-item">
            <span className="muted">Revenus</span>
            <span className="tnum pos">+{money(summary.income)}</span>
          </span>
          <span className="summary-item">
            <span className="muted">Dépenses</span>
            <span className="tnum neg">−{money(summary.expense)}</span>
          </span>
          <span className="summary-item">
            <span className="muted">Net</span>
            <span className={`tnum ${summary.net >= 0 ? 'pos' : 'neg'}`}>{money(summary.net)}</span>
          </span>
        </div>
      </section>

      {data.transactions.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="receipt"
            title="Votre journal est vide"
            text="Chaque transaction alimente vos budgets, vos analyses et vos objectifs. Ajoutez la première pour démarrer."
            action={
              <button type="button" className="btn btn-primary" onClick={openNew}>
                <Icon name="plus" size={15} />
                Ajouter une transaction
              </button>
            }
          />
        </section>
      ) : filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="search"
            title="Aucun résultat"
            text="Aucune transaction ne correspond à ces filtres. Essayez d'élargir la période ou de réinitialiser."
            action={
              <button type="button" className="btn btn-quiet" onClick={resetFilters}>
                Réinitialiser les filtres
              </button>
            }
          />
        </section>
      ) : (
        <section className="card card-flush">
          {grouped.map(([date, list]) => {
            const dayTotals = totalsFor(list, '0000-01-01', '9999-12-31')
            return (
              <div key={date} className="tx-group">
                <div className="tx-group-head">
                  <span className="tx-group-date">{relativeDay(date)}</span>
                  <span className="tx-group-meta">
                    {formatDate(date, 'long')} · {list.length} opération{list.length > 1 ? 's' : ''} ·{' '}
                    <span className={dayTotals.net >= 0 ? 'pos' : 'neg'}>{money(dayTotals.net)}</span>
                  </span>
                </div>
                <ul className="tx-list">
                  {list.map((tx) => {
                    const cat = categoryById(tx.category)
                    return (
                      <li key={tx.id} className="tx-row tx-row-click" onClick={() => setDetail(tx)}>
                        <span className="tx-icon" style={{ color: cat.color, background: `${cat.color}14` }}>
                          <Icon name={cat.icon} size={16} />
                        </span>
                        <span className="tx-main">
                          <span className="tx-title">
                            {tx.name}
                            {tx.recurrence !== 'none' ? (
                              <span className="tx-repeat" title={recurrenceLabel(tx.recurrence)}>
                                <Icon name="repeat" size={12} />
                              </span>
                            ) : null}
                          </span>
                          <span className="tx-meta">
                            {cat.label} · {paymentLabel(tx.paymentMethod)}
                            {tx.notes ? ` · ${tx.notes}` : ''}
                          </span>
                        </span>
                        <span className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'}`}>
                          {tx.type === 'income' ? '+' : '−'}
                          {money(tx.amount)}
                        </span>
                        <span className="tx-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(tx)
                            }}
                            aria-label={`Modifier ${tx.name}`}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setToDelete(tx)
                            }}
                            aria-label={`Supprimer ${tx.name}`}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          {filtered.length > limit ? (
            <div className="load-more">
              <button type="button" className="btn btn-quiet" onClick={() => setLimit((v) => v + 50)}>
                Afficher plus ({filtered.length - limit} restantes)
              </button>
            </div>
          ) : null}
        </section>
      )}

      <TransactionModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        initial={editing}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        subtitle="Détail de la transaction"
        footer={
          detail ? (
            <>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  setToDelete(detail)
                  setDetail(null)
                }}
              >
                Supprimer
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(detail)}>
                Modifier
              </button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="detail-stack">
            <div className={`detail-amount ${detail.type === 'income' ? 'pos' : 'neg'}`}>
              {detail.type === 'income' ? '+' : '−'}
              {money(detail.amount)}
            </div>
            <div className="detail-badges">
              <Badge tone={detail.type === 'income' ? 'ok' : 'muted'}>
                {detail.type === 'income' ? 'Revenu' : 'Dépense'}
              </Badge>
              <Badge>{categoryById(detail.category).label}</Badge>
              {detail.recurrence !== 'none' ? <Badge tone="accent">{recurrenceLabel(detail.recurrence)}</Badge> : null}
            </div>
            <div className="info-list">
              <InfoRow label="Date" value={formatDate(detail.date, 'long')} />
              <InfoRow label="Moyen de paiement" value={paymentLabel(detail.paymentMethod)} />
              <InfoRow label="Catégorie" value={categoryById(detail.category).label} />
              <InfoRow label="Notes" value={detail.notes || '—'} />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cette transaction ?"
        message={
          toDelete
            ? `« ${toDelete.name} » (${money(toDelete.amount)}) sera définitivement supprimée et retirée de vos budgets et analyses.`
            : ''
        }
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => {
          if (toDelete) deleteTransaction(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
