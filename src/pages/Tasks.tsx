import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Plus, Trash2, User } from 'lucide-react'
import {
  Badge,
  Btn,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { shortDate } from '../lib/format'
import type { Task, TaskPriority, TaskStatus } from '../types'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'warning' | 'danger'> = {
  Low: 'neutral',
  Medium: 'warning',
  High: 'danger',
}

const blank = {
  title: '',
  assignee: 'Amina Rahman',
  due: new Date().toISOString().slice(0, 10),
  priority: 'Medium' as TaskPriority,
  status: 'todo' as TaskStatus,
  category: 'Listings',
}

export function Tasks() {
  const { data, addTask, setTaskStatus, deleteTask } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const tasks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.tasks.filter((task) =>
      needle
        ? `${task.title} ${task.assignee} ${task.category}`.toLowerCase().includes(needle)
        : true,
    )
  }, [data.tasks, query])

  const submit = () => {
    if (form.title.trim().length < 3) {
      setError('Give the task a title of at least 3 characters.')
      return
    }
    addTask({ ...form, title: form.title.trim() })
    setOpen(false)
    setForm(blank)
    setError('')
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Tasks"
        subtitle="Everything the team owes the pipeline this week."
        actions={
          <Btn icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            New task
          </Btn>
        }
      />

      <Panel tone="glass" className="toolbar-panel" title="Board" subtitle={`${tasks.length} tasks tracked`}>
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search tasks or assignees…" />
          <Segmented
            value="all"
            onChange={() => undefined}
            options={[
              { value: 'all', label: 'All tasks', count: data.tasks.length },
              { value: 'open', label: 'Open', count: data.tasks.filter((t) => t.status !== 'done').length },
            ]}
          />
        </div>

        <div className="kanban">
          {COLUMNS.map((column) => {
            const items = tasks.filter((task) => task.status === column.key)
            return (
              <div className="kanban-col" key={column.key}>
                <header className="kanban-head">
                  <h4>{column.label}</h4>
                  <span>{items.length}</span>
                </header>
                {items.length ? (
                  items.map((task) => (
                    <article className="task-card" key={task.id}>
                      <div className="task-top">
                        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                        <button
                          className="icon-btn sm danger"
                          aria-label={`Delete ${task.title}`}
                          onClick={() => setPendingDelete(task)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h5>{task.title}</h5>
                      <div className="task-meta">
                        <span>
                          <User size={13} /> {task.assignee}
                        </span>
                        <span>
                          <CalendarDays size={13} /> {shortDate(task.due)}
                        </span>
                      </div>
                      <div className="task-moves">
                        {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                          <button
                            key={c.key}
                            className="task-move"
                            onClick={() => setTaskStatus(task.id, c.key)}
                          >
                            {c.key === 'done' ? <CheckCircle2 size={13} /> : null}
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="kanban-empty">Nothing here</p>
                )}
              </div>
            )
          })}
        </div>
        {!tasks.length ? (
          <EmptyState
            icon={<CheckCircle2 size={22} />}
            title="No tasks match"
            text="Clear the search to see the full board again."
            action={
              <Btn variant="soft" onClick={() => setQuery('')}>
                Clear search
              </Btn>
            }
          />
        ) : null}
      </Panel>

      <Modal
        open={open}
        title="New task"
        subtitle="Assign work to the operations team."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>Create task</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Title" wide hint={error || undefined}>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Prepare valuation pack"
            />
          </Field>
          <Field label="Assignee">
            <select
              className="input"
              value={form.assignee}
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
            >
              {data.team.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              className="input"
              value={form.due}
              onChange={(e) => setForm({ ...form, due: e.target.value })}
            />
          </Field>
          <Field label="Priority">
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
            >
              {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {['Listings', 'Moderation', 'Clients', 'Finance', 'Support'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete task"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed from the board.` : ''}
        onConfirm={() => pendingDelete && deleteTask(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
