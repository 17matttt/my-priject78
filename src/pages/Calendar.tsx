import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { agendaBetween, type AgendaItem } from '../lib/analytics'
import { EVENT_KINDS } from '../lib/constants'
import {
  currentMonthKey,
  formatDate,
  formatMonth,
  shiftMonth,
  todayIso,
} from '../lib/format'
import type { CalendarEvent } from '../lib/types'
import EventModal from '../components/EventModal'
import { Icon } from '../components/Icon'
import { Badge, ConfirmDialog, SectionHead } from '../components/UI'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function buildGrid(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  const first = new Date(year, monthIndex - 1, 1)
  const daysInMonth = new Date(year, monthIndex, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function CalendarPage() {
  const { data, money, toggleEventPaid, deleteEvent } = useData()
  const [month, setMonth] = useState(currentMonthKey())
  const [selected, setSelected] = useState(todayIso())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null)

  const grid = useMemo(() => buildGrid(month), [month])

  const items = useMemo(() => {
    const [year, monthIndex] = month.split('-').map(Number)
    const lastDay = new Date(year, monthIndex, 0).getDate()
    return agendaBetween(data, `${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`)
  }, [data, month])

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>()
    for (const item of items) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  const monthTotals = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const item of items) {
      if (item.kind === 'income') inflow += item.amount ?? 0
      else if (item.amount) outflow += item.amount
    }
    return { inflow, outflow }
  }, [items])

  const selectedItems = byDate.get(selected) ?? []
  const today = todayIso()

  const openNew = (date?: string) => {
    setEditing(
      date
        ? ({
            id: '',
            title: '',
            date,
            amount: null,
            kind: 'bill',
            paid: false,
            notes: '',
            createdAt: '',
          } as CalendarEvent)
        : null,
    )
    setFormOpen(true)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Planning</p>
          <h1 className="page-title">Calendrier financier</h1>
          <p className="page-sub">Factures, revenus récurrents, abonnements et versements d’épargne.</p>
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
            {month !== currentMonthKey() ? (
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  setMonth(currentMonthKey())
                  setSelected(todayIso())
                }}
              >
                Aujourd'hui
              </button>
            ) : null}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openNew(selected)}>
            <Icon name="plus" size={15} />
            <span>Ajouter un événement</span>
          </button>
        </div>
      </header>

      <div className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-head">
            <div className="calendar-kpis">
              <span className="summary-item">
                <span className="muted">Entrées prévues</span>
                <span className="tnum pos">+{money(monthTotals.inflow)}</span>
              </span>
              <span className="summary-item">
                <span className="muted">Sorties prévues</span>
                <span className="tnum neg">−{money(monthTotals.outflow)}</span>
              </span>
              <span className="summary-item">
                <span className="muted">Événements</span>
                <span className="tnum strong">{items.length}</span>
              </span>
            </div>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
            {grid.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="calendar-cell calendar-cell-empty" />
              const dayItems = byDate.get(date) ?? []
              const dayNumber = Number(date.slice(-2))
              const isToday = date === today
              const isSelected = date === selected
              const unpaid = dayItems.some((i) => !i.paid && i.source === 'event')
              return (
                <button
                  key={date}
                  type="button"
                  className={`calendar-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span className="calendar-day">
                    {dayNumber}
                    {unpaid ? <span className="calendar-dot" /> : null}
                  </span>
                  <span className="calendar-items">
                    {dayItems.slice(0, 2).map((item) => (
                      <span key={item.id} className={`calendar-chip ${item.paid ? 'is-paid' : ''}`} style={{ borderColor: `${item.color}55` }}>
                        <span className="calendar-chip-dot" style={{ background: item.color }} />
                        {item.title.length > 14 ? `${item.title.slice(0, 13)}…` : item.title}
                      </span>
                    ))}
                    {dayItems.length > 2 ? <span className="calendar-more">+{dayItems.length - 2}</span> : null}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            {EVENT_KINDS.map((kind) => (
              <span key={kind.id} className="legend-item">
                <span className="legend-dot" style={{ background: kind.color }} />
                {kind.label}
              </span>
            ))}
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#C9A7FF' }} />
              Abonnement
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#8FB8FF' }} />
              Récurrence
            </span>
          </div>
        </section>

        <aside className="card calendar-side">
          <SectionHead
            title={formatDate(selected, 'long')}
            subtitle={`${selectedItems.length} élément${selectedItems.length > 1 ? 's' : ''} ce jour`}
            action={
              <button type="button" className="link-sm" onClick={() => openNew(selected)}>
                <Icon name="plus" size={13} />
                Ajouter
              </button>
            }
          />

          {selectedItems.length === 0 ? (
            <div className="calendar-empty">
              <Icon name="calendar" size={20} />
              <p>Aucun événement ce jour.</p>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => openNew(selected)}>
                Ajouter un événement
              </button>
            </div>
          ) : (
            <ul className="agenda-list">
              {selectedItems.map((item) => {
                const isEvent = item.source === 'event'
                return (
                  <li key={item.id} className={`agenda-item ${item.paid ? 'is-paid' : ''}`}>
                    <span className="tx-icon" style={{ color: item.color, background: `${item.color}14` }}>
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="tx-main">
                      <span className="tx-title">{item.title}</span>
                      <span className="tx-meta">
                        {eventKindLabel(item)}
                        {item.amount !== null ? ` · ${money(item.amount)}` : ''}
                      </span>
                    </span>
                    <span className="agenda-actions">
                      {isEvent ? (
                        <>
                          <button
                            type="button"
                            className={`btn btn-xs ${item.paid ? 'btn-quiet' : 'btn-primary'}`}
                            onClick={() => toggleEventPaid(item.refId)}
                          >
                            {item.paid ? 'Rouvrir' : 'Marquer payé'}
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-sm"
                            onClick={() => {
                              const ev = data.events.find((e) => e.id === item.refId)
                              if (ev) {
                                setEditing(ev)
                                setFormOpen(true)
                              }
                            }}
                            aria-label="Modifier l'événement"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-sm"
                            onClick={() => {
                              const ev = data.events.find((e) => e.id === item.refId)
                              if (ev) setToDelete(ev)
                            }}
                            aria-label="Supprimer l'événement"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </>
                      ) : (
                        <Badge tone={item.paid ? 'ok' : 'muted'}>{item.paid ? 'Réglé' : 'Prévu'}</Badge>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>

      <section className="card">
        <SectionHead title="Tout le mois" subtitle={`${items.length} échéance${items.length > 1 ? 's' : ''} sur ${formatMonth(month)}`} />
        {items.length ? (
          <ul className="flow-list">
            {items.map((item) => (
              <li key={item.id}>
                <span className="flow-icon" style={{ color: item.color }}>
                  <Icon name={item.icon} size={14} />
                </span>
                <span className="flow-main">
                  <span className="flow-title">{item.title}</span>
                  <span className="flow-meta">
                    {formatDate(item.date, 'long')} · {eventKindLabel(item)}
                    {item.paid ? ' · réglé' : ''}
                  </span>
                </span>
                <span className={`tnum ${item.kind === 'income' ? 'pos' : ''}`}>
                  {item.amount !== null ? money(item.amount) : '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="chart-empty">
            Aucune échéance sur {formatMonth(month)}. Ajoutez vos factures, revenus ou versements d’épargne.
          </p>
        )}
      </section>

      <EventModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        initial={editing && editing.id ? editing : null}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cet événement ?"
        message={toDelete ? `« ${toDelete.title} » sera retiré du calendrier.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => {
          if (toDelete) deleteEvent(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function eventKindLabel(item: AgendaItem): string {
  if (item.source === 'subscription') return 'Abonnement'
  if (item.kind === 'recurring') return 'Transaction récurrente'
  if (item.source === 'goal') return 'Échéance d’épargne'
  const kind = EVENT_KINDS.find((k) => k.id === item.kind)
  return kind ? kind.label : 'Événement'
}
