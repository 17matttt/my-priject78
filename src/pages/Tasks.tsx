import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  Circle,
  Clock,
  ListChecks,
  Pencil,
  Plus,
  Repeat,
  Search,
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
  Progress,
  Segmented,
  Select,
  Textarea,
} from '../components/UI'
import { addDays, fmtDateShort, isoDate, monthMatrix, monthName, relativeDay, todayISO, weekdayShort } from '../lib/date'
import { uid } from '../lib/format'
import type { Priority, Recurrence, Task } from '../types'

type View = 'list' | 'board' | 'calendar'
type Filter = 'open' | 'today' | 'overdue' | 'done' | 'all'

const CATEGORIES = ['School', 'Personal', 'Admin', 'Health', 'Sport', 'Work']

const PRIORITY_LABEL: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

function nextDue(due: string | null, recurrence: Recurrence): string | null {
  if (!due || recurrence === 'none') return null
  const base = new Date(`${due}T12:00:00`)
  if (recurrence === 'daily') return isoDate(addDays(base, 1))
  if (recurrence === 'weekly') return isoDate(addDays(base, 7))
  const next = new Date(base)
  next.setMonth(next.getMonth() + 1)
  return isoDate(next)
}

export default function Tasks() {
  const { state, upsert, remove } = useApp()
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<Filter>('open')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [cursor, setCursor] = useState(() => new Date())

  const tasks = state.tasks
  const today = todayISO()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks
      .filter((task) => {
        if (filter === 'open' && task.done) return false
        if (filter === 'done' && !task.done) return false
        if (filter === 'today' && task.due !== today) return false
        if (filter === 'overdue' && (task.done || !task.due || task.due >= today)) return false
        if (category !== 'all' && task.category !== category) return false
        if (priority !== 'all' && task.priority !== priority) return false
        if (q && !`${task.title} ${task.notes} ${task.category}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        if (!a.due && !b.due) return b.createdAt.localeCompare(a.createdAt)
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due.localeCompare(b.due)
      })
  }, [tasks, filter, query, category, priority, today])

  const openCount = tasks.filter((task) => !task.done).length
  const doneCount = tasks.filter((task) => task.done).length
  const overdue = tasks.filter((task) => !task.done && task.due && task.due < today).length
  const completion = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

  const toggle = (task: Task) => {
    const nowDone = !task.done
    upsert('tasks', {
      ...task,
      done: nowDone,
      completedAt: nowDone ? new Date().toISOString() : null,
    })
    if (nowDone && task.recurrence !== 'none') {
      const due = nextDue(task.due, task.recurrence)
      if (due) {
        upsert('tasks', {
          ...task,
          id: uid('task'),
          due,
          done: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
        })
      }
    }
  }

  const startEdit = (task: Task | null) => {
    setEditing(task)
    setFormOpen(true)
  }

  const boardColumns: { key: Priority; title: string }[] = [
    { key: 'high', title: 'High priority' },
    { key: 'medium', title: 'Medium priority' },
    { key: 'low', title: 'Low priority' },
  ]

  const matrix = monthMatrix(cursor.getFullYear(), cursor.getMonth())
  const byDate = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.due) continue
    byDate.set(task.due, [...(byDate.get(task.due) || []), task])
  }

  return (
    <div className="page">
      <PageHead
        title="Tasks"
        sub={`${openCount} open · ${doneCount} completed · ${overdue} overdue`}
        eyebrow="Execute"
      >
        <Segmented
          value={view}
          label="Task view"
          onChange={setView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => startEdit(null)}>
          New task
        </Btn>
      </PageHead>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="panel stat">
          <div className="stat-top">Open</div>
          <div className="stat-value">{openCount}</div>
          <div className="stat-hint">Everything still waiting</div>
        </div>
        <div className="panel stat">
          <div className="stat-top">Due today</div>
          <div className="stat-value">{tasks.filter((task) => !task.done && task.due === today).length}</div>
          <div className="stat-hint">{fmtDateShort(today)}</div>
        </div>
        <div className="panel stat">
          <div className="stat-top">Overdue</div>
          <div className="stat-value">{overdue}</div>
          <div className="stat-hint">{overdue > 0 ? 'Needs a decision today' : 'Nothing slipping'}</div>
        </div>
        <div className="panel stat">
          <div className="stat-top">Completion</div>
          <div className="stat-value">{completion}%</div>
          <Progress value={completion} tone={completion > 70 ? 'good' : 'accent'} />
        </div>
      </div>

      <Panel
        title="Your queue"
        sub="Filters apply to every view"
        action={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 6, position: 'relative' }}>
              <Search size={14} color="#8993a8" />
              <Input
                value={query}
                placeholder="Search tasks"
                onChange={(event) => setQuery(event.target.value)}
                style={{ width: 190 }}
                aria-label="Search tasks"
              />
            </div>
            <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category filter">
              <option value="all">All categories</option>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Priority filter">
              <option value="all">Any priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        }
      >
        <div className="chip-scroll" style={{ marginBottom: 12 }}>
          {(
            [
              ['open', 'Open'],
              ['today', 'Today'],
              ['overdue', 'Overdue'],
              ['done', 'Completed'],
              ['all', 'All'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Chip>
          ))}
        </div>

        {tasks.length === 0 && (
          <EmptyState
            icon={<ListChecks />}
            title="No tasks yet"
            text="Capture the next thing you need to do. Tasks appear on your overview and calendar automatically."
            action={
              <Btn variant="primary" icon={<Plus size={15} />} onClick={() => startEdit(null)}>
                Create your first task
              </Btn>
            }
          />
        )}

        {tasks.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={<Search />}
            title="Nothing matches"
            text="No task matches these filters. Clear the search or switch back to Open."
            action={
              <Btn
                variant="soft"
                onClick={() => {
                  setFilter('all')
                  setQuery('')
                  setCategory('all')
                  setPriority('all')
                }}
              >
                Reset filters
              </Btn>
            }
          />
        )}

        {filtered.length > 0 && view === 'list' && (
          <div className="stack" style={{ gap: 6 }}>
            {filtered.map((task) => {
              const late = !task.done && task.due && task.due < today
              return (
                <div key={task.id} className="list-item" style={{ alignItems: 'center' }}>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => toggle(task)}
                    aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  >
                    {task.done ? <Check size={16} color="#5be3b1" /> : <Circle size={16} />}
                  </button>
                  <span className="li-main">
                    <span
                      className="li-title"
                      style={{
                        textDecoration: task.done ? 'line-through' : undefined,
                        opacity: task.done ? 0.55 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {task.title}
                      {task.demo && <span className="badge badge--demo">Demo</span>}
                    </span>
                    <span className="li-sub" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{task.category}</span>
                      {task.due && <span>{relativeDay(task.due)}</span>}
                      {task.recurrence !== 'none' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Repeat size={11} /> {task.recurrence}
                        </span>
                      )}
                      {task.notes && <span style={{ opacity: 0.75 }}>{task.notes}</span>}
                    </span>
                  </span>
                  {late && <Badge tone="bad">Overdue</Badge>}
                  <Badge tone={task.priority === 'high' ? 'bad' : task.priority === 'medium' ? 'warn' : 'neutral'}>
                    {PRIORITY_LABEL[task.priority]}
                  </Badge>
                  <div className="row" style={{ gap: 2 }}>
                    <button type="button" className="icon-btn" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`}>
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => remove('tasks', task.id)}
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filtered.length > 0 && view === 'board' && (
          <div className="kanban">
            {boardColumns.map((column) => {
              const items = filtered.filter((task) => task.priority === column.key)
              return (
                <div key={column.key} className="kanban-col">
                  <div className="kanban-head">
                    <span>{column.title}</span>
                    <span className="badge">{items.length}</span>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    {items.length === 0 && <p className="empty-text">Nothing here.</p>}
                    {items.map((task) => (
                      <div key={task.id} className="kanban-card">
                        <div className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
                          <strong style={{ flex: 1, fontSize: 12.5, fontWeight: 550 }}>{task.title}</strong>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => toggle(task)}
                            aria-label={`Toggle ${task.title}`}
                          >
                            {task.done ? <Check size={14} color="#5be3b1" /> : <Circle size={14} />}
                          </button>
                        </div>
                        <div className="row tiny dim" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className="badge">{task.category}</span>
                          {task.due && (
                            <span className="row" style={{ gap: 3 }}>
                              <Clock size={11} /> {relativeDay(task.due)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'calendar' && (
          <div>
            <div className="cal-head">
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Previous month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  ‹
                </button>
                <strong style={{ fontSize: 13 }}>
                  {monthName(cursor.getMonth())} {cursor.getFullYear()}
                </strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Next month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  ›
                </button>
              </div>
              <span className="tiny dim">Tasks plotted by due date</span>
            </div>
            <div className="cal-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="cal-dow">
                  {day}
                </div>
              ))}
              {matrix.flat().map((date) => {
                const key = isoDate(date)
                const dayTasks = byDate.get(key) || []
                const outside = date.getMonth() !== cursor.getMonth()
                return (
                  <div key={key} className={`cal-cell ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''}`}>
                    <div className="cal-num">{date.getDate()}</div>
                    {dayTasks.slice(0, 2).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={`cal-pill cal-pill--${task.done ? 'done' : task.priority}`}
                        onClick={() => startEdit(task)}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 2 && <span className="cal-more">+{dayTasks.length - 2}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Panel>

      <TaskForm
        open={formOpen}
        task={editing}
        onClose={() => setFormOpen(false)}
        onSave={(task) => {
          upsert('tasks', task)
          setFormOpen(false)
        }}
        onDelete={(id) => {
          remove('tasks', id)
          setFormOpen(false)
        }}
      />
    </div>
  )
}

function TaskForm({
  open,
  task,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  task: Task | null
  onClose: () => void
  onSave: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('School')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState(todayISO())
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [error, setError] = useState('')
  const [loadedId, setLoadedId] = useState<string | null>(null)

  if (open && (loadedId !== (task?.id || 'new'))) {
    setLoadedId(task?.id || 'new')
    setTitle(task?.title || '')
    setNotes(task?.notes || '')
    setCategory(task?.category || 'School')
    setPriority(task?.priority || 'medium')
    setDue(task?.due || todayISO())
    setRecurrence(task?.recurrence || 'none')
    setError('')
  }
  if (!open && loadedId !== null) setLoadedId(null)

  const submit = () => {
    if (!title.trim()) {
      setError('A task needs a title.')
      return
    }
    if (title.trim().length > 120) {
      setError('Keep the title under 120 characters.')
      return
    }
    onSave({
      id: task?.id || uid('task'),
      title: title.trim(),
      notes: notes.trim(),
      category,
      priority,
      due: due || null,
      done: task?.done || false,
      completedAt: task?.completedAt || null,
      recurrence,
      createdAt: task?.createdAt || new Date().toISOString(),
      demo: task?.demo,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      sub={task ? 'Changes save to this device instantly.' : 'Due dates feed your calendar and overview.'}
      footer={
        <>
          {task && (
            <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => onDelete(task.id)}>
              Delete
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check size={15} />} onClick={submit}>
            {task ? 'Save changes' : 'Add task'}
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Title" className="full">
          <Input
            autoFocus
            value={title}
            placeholder="Revise the biology chapter"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>
        <Field label="Repeats" hint={recurrence !== 'none' ? 'Completing it creates the next occurrence.' : undefined}>
          <Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}>
            <option value="none">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Field>
        <Field label="Notes (optional)" className="full">
          <Textarea
            value={notes}
            placeholder="Pages 40–58, ask the teacher about exercise 3"
            onChange={(event) => setNotes(event.target.value)}
            style={{ minHeight: 84 }}
          />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="hint" style={{ marginTop: 8 }}>
        <CalendarDays size={12} /> {due ? fmtDateShort(due) : 'No due date'} · {weekdayShort(new Date(`${due || todayISO()}T12:00:00`).getDay())}
      </p>
    </Modal>
  )
}
