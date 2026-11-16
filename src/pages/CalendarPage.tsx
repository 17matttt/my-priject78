import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Badge,
  Btn,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Panel,
  Segmented,
  Select,
  Textarea,
} from '../components/UI'
import { CATEGORY_LABELS, agendaFor, type AgendaItem } from '../lib/insights'
import {
  addDays,
  fmtDateLong,
  fmtTime,
  isoDate,
  monthMatrix,
  monthName,
  startOfDay,
  startOfWeek,
  todayISO,
  weekdayShort,
} from '../lib/date'
import { uid } from '../lib/format'
import type { CalEvent, EventCategory } from '../types'

type View = 'month' | 'week' | 'day'

const CATEGORY_ORDER: EventCategory[] = ['class', 'study', 'exam', 'training', 'work', 'personal']

export default function CalendarPage() {
  const { state, upsert, remove } = useApp()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [selected, setSelected] = useState(todayISO())
  const [hidden, setHidden] = useState<EventCategory[]>([])
  const [showClasses, setShowClasses] = useState(true)
  const [showTasks, setShowTasks] = useState(true)
  const [showHomework, setShowHomework] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalEvent | null>(null)
  const [formDate, setFormDate] = useState(todayISO())

  const today = todayISO()

  const visible = (item: AgendaItem) => {
    if (item.kind === 'class') return showClasses
    if (item.kind === 'task') return showTasks
    if (item.kind === 'homework') return showHomework
    return !hidden.includes(item.category as EventCategory)
  }

  const dayItems = useMemo(() => {
    const date = new Date(`${selected}T12:00:00`)
    return agendaFor(state, date).filter(visible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, selected, hidden, showClasses, showTasks, showHomework])

  const openNew = (date: string) => {
    setEditing(null)
    setFormDate(date)
    setFormOpen(true)
  }

  const openEdit = (item: AgendaItem) => {
    if (item.kind !== 'event') return
    const event = state.events.find((entry) => entry.id === item.id)
    if (!event) return
    setEditing(event)
    setFormDate(event.start.slice(0, 10))
    setFormOpen(true)
  }

  const weekStart = startOfWeek(new Date(`${selected}T12:00:00`), state.prefs.weekStartsMonday)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const matrix = monthMatrix(cursor.getFullYear(), cursor.getMonth())

  const shift = (direction: number) => {
    if (view === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1))
    } else if (view === 'week') {
      const next = addDays(new Date(`${selected}T12:00:00`), direction * 7)
      setSelected(isoDate(next))
      setCursor(startOfDay(next))
    } else {
      const next = addDays(new Date(`${selected}T12:00:00`), direction)
      setSelected(isoDate(next))
      setCursor(startOfDay(next))
    }
  }

  const conflict = useMemo(() => {
    const timed = dayItems.filter((item) => item.kind === 'event' || item.kind === 'class')
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        const a = timed[i]
        const b = timed[j]
        if (!a.end || !b.end) continue
        if (a.start < b.end && b.start < a.end) return `${a.title} overlaps ${b.title}`
      }
    }
    return ''
  }, [dayItems])

  const countFor = (date: Date) => agendaFor(state, date).filter(visible).length

  return (
    <div className="page">
      <PageHead title="Calendar" sub="Classes, events, deadlines and tasks in one timeline" eyebrow="Command">
        <Segmented
          value={view}
          label="Calendar view"
          onChange={setView}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' },
          ]}
        />
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => openNew(selected)}>
          New event
        </Btn>
      </PageHead>

      <div className="chip-scroll" style={{ marginBottom: 14 }}>
        <Chip active={showClasses} onClick={() => setShowClasses((value) => !value)}>
          Classes
        </Chip>
        {CATEGORY_ORDER.filter((category) => category !== 'class').map((category) => (
          <Chip
            key={category}
            active={!hidden.includes(category)}
            onClick={() =>
              setHidden((current) =>
                current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category],
              )
            }
          >
            {CATEGORY_LABELS[category]}
          </Chip>
        ))}
        <Chip active={showHomework} onClick={() => setShowHomework((value) => !value)}>
          Homework
        </Chip>
        <Chip active={showTasks} onClick={() => setShowTasks((value) => !value)}>
          Tasks
        </Chip>
      </div>

      <div className="split" style={{ alignItems: 'start' }}>
        <Panel
          title={
            <div className="row" style={{ gap: 4 }}>
              <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous">
                <ChevronLeft />
              </button>
              <span style={{ minWidth: 150, textAlign: 'center' }}>
                {view === 'month'
                  ? `${monthName(cursor.getMonth())} ${cursor.getFullYear()}`
                  : view === 'week'
                    ? `${monthName(weekDays[0].getMonth())} ${weekDays[0].getDate()} – ${monthName(weekDays[6].getMonth())} ${weekDays[6].getDate()}`
                    : fmtDateLong(selected)}
              </span>
              <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next">
                <ChevronRight />
              </button>
            </div>
          }
          action={
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => {
                setCursor(startOfDay(new Date()))
                setSelected(today)
              }}
            >
              Today
            </Btn>
          }
        >
          {view === 'month' && (
            <div className="cal-grid">
              {weekDays.map((day) => (
                <div key={`dow-${day.getDay()}`} className="cal-dow">
                  {weekdayShort(day.getDay())}
                </div>
              ))}
              {matrix.flat().map((date) => {
                const key = isoDate(date)
                const total = countFor(date)
                const outside = date.getMonth() !== cursor.getMonth()
                return (
                  <button
                    type="button"
                    key={key}
                    className={`cal-cell ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${key === selected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelected(key)
                      setCursor(startOfDay(date))
                    }}
                    onDoubleClick={() => openNew(key)}
                  >
                    <div className="cal-num">{date.getDate()}</div>
                    {total > 0 && (
                      <div className="cal-dots">
                        {Array.from({ length: Math.min(total, 3) }, (_, index) => (
                          <span key={index} className="cal-dot" />
                        ))}
                        {total > 3 && <span className="cal-more">{total}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="week-grid">
              {weekDays.map((day) => {
                const key = isoDate(day)
                const items = agendaFor(state, day).filter(visible)
                return (
                  <div key={key} className={`week-col ${key === today ? 'is-today' : ''}`}>
                    <button
                      type="button"
                      className="week-head"
                      onClick={() => {
                        setSelected(key)
                        setView('day')
                      }}
                    >
                      <span>{weekdayShort(day.getDay())}</span>
                      <strong>{day.getDate()}</strong>
                    </button>
                    {items.length === 0 && <span className="tiny dim">—</span>}
                    {items.map((item) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        className={`cal-pill cal-pill--${item.category}`}
                        onClick={() => openEdit(item)}
                        title={`${fmtTime(item.start)} ${item.title}`}
                      >
                        {fmtTime(item.start)} {item.title}
                      </button>
                    ))}
                    <button type="button" className="tiny dim" style={{ textAlign: 'left' }} onClick={() => openNew(key)}>
                      + add
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'day' && (
            <div>
              {dayItems.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="Nothing planned"
                  text="This day is completely free. Add an event or let VAULT suggest a focus block."
                  action={
                    <Btn variant="primary" icon={<Plus size={15} />} onClick={() => openNew(selected)}>
                      Add event
                    </Btn>
                  }
                />
              ) : (
                <div className="timeline">
                  {dayItems.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className={`tl-row tl-row--${item.category}`}>
                      <span className="tl-time">{fmtTime(item.start)}</span>
                      <span className="tl-body">
                        <span className="li-title" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {item.title}
                          {item.demo && <span className="badge badge--demo">Demo</span>}
                        </span>
                        <span className="li-sub">
                          {item.subtitle}
                          {item.end ? ` · until ${fmtTime(item.end)}` : ''}
                        </span>
                      </span>
                      <Badge tone={item.kind === 'task' ? 'neutral' : item.kind === 'homework' ? 'warn' : 'accent'}>
                        {item.kind === 'event' || item.kind === 'class'
                          ? CATEGORY_LABELS[item.category as EventCategory]
                          : item.kind}
                      </Badge>
                      {item.kind === 'event' && (
                        <button type="button" className="icon-btn" onClick={() => openEdit(item)} aria-label="Edit event">
                          <Clock />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="stack">
          <Panel
            title={fmtDateLong(selected)}
            sub={`${dayItems.length} item${dayItems.length === 1 ? '' : 's'} · ${selected === today ? 'today' : weekdayShort(new Date(`${selected}T12:00:00`).getDay())}`}
            action={
              <Btn size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => openNew(selected)}>
                Add
              </Btn>
            }
          >
            {conflict && (
              <div className="banner" style={{ marginBottom: 10 }}>
                <AlertTriangle size={14} />
                <span>Scheduling conflict: {conflict}</span>
              </div>
            )}
            {dayItems.length === 0 && <p className="empty-text">No items scheduled. Double-click a day in the month view to add one.</p>}
            <div className="stack" style={{ gap: 6 }}>
              {dayItems.map((item) => (
                <div key={`side-${item.kind}-${item.id}`} className="list-item">
                  <span className="li-main">
                    <span className="li-title">{item.title}</span>
                    <span className="li-sub" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span>{fmtTime(item.start)}</span>
                      {item.location && (
                        <span className="row" style={{ gap: 2 }}>
                          <MapPin size={11} /> {item.location}
                        </span>
                      )}
                    </span>
                  </span>
                  {item.kind === 'homework' && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Mark homework done"
                      onClick={() => {
                        const homework = state.homework.find((entry) => entry.id === item.id)
                        if (homework) upsert('homework', { ...homework, done: !homework.done })
                      }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {item.kind === 'event' && (
                    <button type="button" className="icon-btn" aria-label="Edit" onClick={() => openEdit(item)}>
                      <Clock size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Sources" sub="What feeds this calendar">
            <div className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tiny">School timetable</span>
                <Badge tone={state.classes.length ? 'accent' : 'neutral'}>{state.classes.length} slots</Badge>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tiny">Vault events</span>
                <Badge tone="accent">{state.events.length}</Badge>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tiny">Homework deadlines</span>
                <Badge tone="warn">{state.homework.filter((entry) => !entry.done).length}</Badge>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tiny">Google Calendar</span>
                <Badge tone={state.connections.gcal.status === 'connected' ? 'good' : 'neutral'}>
                  {state.connections.gcal.status === 'connected' ? 'Synced' : 'Not connected'}
                </Badge>
              </div>
              <p className="hint">
                Google Calendar sync requires OAuth credentials. Connect it in Settings → Connections; until then every
                event here is stored on this device.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      <EventForm
        open={formOpen}
        event={editing}
        date={formDate}
        onClose={() => setFormOpen(false)}
        onSave={(event) => {
          upsert('events', event)
          setSelected(event.start.slice(0, 10))
          setFormOpen(false)
        }}
        onDelete={(id) => {
          remove('events', id)
          setFormOpen(false)
        }}
      />
    </div>
  )
}

function EventForm({
  open,
  event,
  date,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  event: CalEvent | null
  date: string
  onClose: () => void
  onSave: (event: CalEvent) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EventCategory>('personal')
  const [day, setDay] = useState(date)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [reminder, setReminder] = useState(30)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(event?.title || '')
    setCategory(event?.category || 'personal')
    setDay(event ? event.start.slice(0, 10) : date)
    setStart(event ? event.start.slice(11, 16) : '09:00')
    setEnd(event ? event.end.slice(11, 16) : '10:00')
    setLocation(event?.location || '')
    setNotes(event?.notes || '')
    setReminder(event?.reminder ?? 30)
    setError('')
  }, [open, event, date])

  const submit = () => {
    if (!title.trim()) {
      setError('Give the event a title.')
      return
    }
    if (end <= start) {
      setError('The end time must be after the start time.')
      return
    }
    onSave({
      id: event?.id || uid('event'),
      title: title.trim(),
      start: `${day}T${start}`,
      end: `${day}T${end}`,
      category,
      location: location.trim(),
      notes: notes.trim(),
      reminder,
      source: event?.source || 'vault',
      demo: event?.demo,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      sub="Appears in your calendar, overview timeline and intelligence."
      footer={
        <>
          {event && (
            <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => onDelete(event.id)}>
              Delete
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check size={15} />} onClick={submit}>
            {event ? 'Save changes' : 'Add event'}
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Title" className="full">
          <Input
            autoFocus
            value={title}
            placeholder="Mathematics exam"
            onChange={(input) => setTitle(input.target.value)}
          />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(input) => setCategory(input.target.value as EventCategory)}>
            {CATEGORY_ORDER.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={day} onChange={(input) => setDay(input.target.value)} />
        </Field>
        <Field label="Start">
          <Input type="time" value={start} onChange={(input) => setStart(input.target.value)} />
        </Field>
        <Field label="End">
          <Input type="time" value={end} onChange={(input) => setEnd(input.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={location} placeholder="Room 204" onChange={(input) => setLocation(input.target.value)} />
        </Field>
        <Field label="Reminder">
          <Select value={String(reminder)} onChange={(input) => setReminder(Number(input.target.value))}>
            <option value="0">No reminder</option>
            <option value="10">10 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </Select>
        </Field>
        <Field label="Notes (optional)" className="full">
          <Textarea
            value={notes}
            onChange={(input) => setNotes(input.target.value)}
            placeholder="Chapters 1–4, calculator allowed"
            style={{ minHeight: 70 }}
          />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}
