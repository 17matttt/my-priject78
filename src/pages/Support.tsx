import { useMemo, useState } from 'react'
import { CheckCheck, Inbox, Mail, Plus, Trash2 } from 'lucide-react'
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
import { ticketStats } from '../lib/analytics'
import { shortDate } from '../lib/format'
import type { Ticket, TicketPriority, TicketStatus } from '../types'

const PRIORITY_TONE: Record<TicketPriority, 'neutral' | 'warning' | 'danger' | 'info'> = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
}

const blank = {
  subject: '',
  requester: '',
  email: '',
  priority: 'Medium' as TicketPriority,
  status: 'open' as TicketStatus,
  category: 'Listings',
  message: '',
}

export function Support() {
  const { data, addTicket, setTicketStatus, deleteTicket } = useApp()
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Ticket | null>(null)

  const stats = ticketStats(data.tickets)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.tickets.filter((ticket) => {
      if (filter !== 'all' && ticket.status !== filter) return false
      if (!needle) return true
      return `${ticket.subject} ${ticket.requester} ${ticket.category}`.toLowerCase().includes(needle)
    })
  }, [data.tickets, filter, query])

  const selected = data.tickets.find((t) => t.id === selectedId) ?? visible[0] ?? null

  const submit = () => {
    if (form.subject.trim().length < 4) {
      setError('Enter a subject of at least 4 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid requester email.')
      return
    }
    addTicket({
      ...form,
      subject: form.subject.trim(),
      requester: form.requester.trim() || 'Unknown',
      message: form.message.trim() || 'No message provided.',
    })
    setOpen(false)
    setForm(blank)
    setError('')
  }

  return (
    <>
      <PageHeader
        eyebrow="Customer care"
        title="Support"
        subtitle="Incoming conversations from owners and clients."
        actions={
          <Btn icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            New ticket
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-light">
          <p className="stat-label">Open</p>
          <strong className="stat-value">{stats.open}</strong>
          <p className="stat-hint">Awaiting first reply</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Pending</p>
          <strong className="stat-value">{stats.pending}</strong>
          <p className="stat-hint">Waiting on the customer</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Resolved</p>
          <strong className="stat-value">{stats.resolved}</strong>
          <p className="stat-hint">Closed conversations</p>
        </div>
      </div>

      <Panel tone="glass" className="toolbar-panel" title="Inbox" subtitle={`${visible.length} conversations`}>
        <div className="toolbar">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: data.tickets.length },
              { value: 'open', label: 'Open', count: stats.open },
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'resolved', label: 'Resolved', count: stats.resolved },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search subject or requester…" />
        </div>

        {visible.length ? (
          <div className="support-layout">
            <ul className="ticket-list">
              {visible.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    className={`ticket-item ${selected?.id === ticket.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(ticket.id)}
                  >
                    <div className="ticket-item-top">
                      <strong>{ticket.subject}</strong>
                      <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
                    </div>
                    <p>{ticket.requester}</p>
                    <div className="ticket-item-foot">
                      <span>{ticket.category}</span>
                      <span>{shortDate(ticket.createdAt)}</span>
                      <span className={`ticket-status ticket-${ticket.status}`}>{ticket.status}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {selected ? (
              <article className="ticket-detail">
                <header>
                  <div>
                    <h4>{selected.subject}</h4>
                    <p>
                      <Mail size={14} /> {selected.requester} · {selected.email}
                    </p>
                  </div>
                  <Badge tone={PRIORITY_TONE[selected.priority]}>{selected.priority}</Badge>
                </header>
                <p className="ticket-message">{selected.message}</p>
                <div className="ticket-actions">
                  <Btn
                    size="sm"
                    variant={selected.status === 'open' ? 'primary' : 'soft'}
                    onClick={() => setTicketStatus(selected.id, 'open')}
                  >
                    Open
                  </Btn>
                  <Btn
                    size="sm"
                    variant={selected.status === 'pending' ? 'primary' : 'soft'}
                    onClick={() => setTicketStatus(selected.id, 'pending')}
                  >
                    Pending
                  </Btn>
                  <Btn
                    size="sm"
                    variant={selected.status === 'resolved' ? 'primary' : 'soft'}
                    icon={<CheckCheck size={15} />}
                    onClick={() => setTicketStatus(selected.id, 'resolved')}
                  >
                    Resolve
                  </Btn>
                  <button
                    className="icon-btn sm danger"
                    aria-label={`Delete ${selected.subject}`}
                    onClick={() => setPendingDelete(selected)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<Inbox size={22} />}
            title="Inbox zero"
            text="No conversations match this filter right now."
          />
        )}
      </Panel>

      <Modal
        open={open}
        title="New ticket"
        subtitle="Log a conversation received outside the platform."
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>Create ticket</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Subject" hint={error || undefined}>
            <input
              className="input"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Listing photos not loading"
            />
          </Field>
          <Field label="Category">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {['Listings', 'Billing', 'Account', 'Technical', 'Moderation'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Requester">
            <input
              className="input"
              value={form.requester}
              onChange={(e) => setForm({ ...form, requester: e.target.value })}
              placeholder="Leila Mansour"
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="leila@example.com"
            />
          </Field>
          <Field label="Priority">
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
            >
              {(['Low', 'Medium', 'High', 'Urgent'] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Message" wide>
            <textarea
              className="input textarea"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe the request…"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete ticket"
        message={pendingDelete ? `“${pendingDelete.subject}” will be removed from the inbox.` : ''}
        onConfirm={() => pendingDelete && deleteTicket(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
