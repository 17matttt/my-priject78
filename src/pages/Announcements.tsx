import { useMemo, useState } from 'react'
import { Megaphone, Pencil, Pin, Plus, Send, Trash2 } from 'lucide-react'
import {
  Avatar,
  Badge,
  Btn,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  Segmented,
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { shortDate } from '../lib/format'
import type { Announcement, AnnouncementStatus } from '../types'

const TONE: Record<AnnouncementStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  scheduled: 'warning',
  draft: 'neutral',
}

const blank = {
  title: '',
  body: '',
  audience: 'All staff',
  status: 'draft' as AnnouncementStatus,
  date: new Date().toISOString().slice(0, 10),
}

export function Announcements() {
  const { data, addAnnouncement, updateAnnouncement, deleteAnnouncement, togglePinned } = useApp()
  const [filter, setFilter] = useState<'all' | AnnouncementStatus>('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null)

  const visible = useMemo(() => {
    const list = data.announcements.filter((a) => filter === 'all' || a.status === filter)
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [data.announcements, filter])

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setError('')
    setOpen(true)
  }

  const openEdit = (item: Announcement) => {
    setEditing(item)
    setForm({
      title: item.title,
      body: item.body,
      audience: item.audience,
      status: item.status,
      date: item.date.slice(0, 10),
    })
    setError('')
    setOpen(true)
  }

  const submit = () => {
    if (form.title.trim().length < 4) {
      setError('Enter a title of at least 4 characters.')
      return
    }
    if (form.body.trim().length < 10) {
      setError('Write at least 10 characters of content.')
      return
    }
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      status: form.status,
      date: new Date(form.date).toISOString(),
      author: editing?.author ?? data.team[0]?.name ?? 'Administrator',
      pinned: editing?.pinned ?? false,
    }
    if (editing) updateAnnouncement(editing.id, payload)
    else addAnnouncement(payload)
    setOpen(false)
    setEditing(null)
    setError('')
  }

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Announcements"
        subtitle="Broadcast updates to staff, agents and owners."
        actions={
          <Btn icon={<Plus size={16} />} onClick={openCreate}>
            New announcement
          </Btn>
        }
      />

      <Panel
        tone="glass"
        title="Broadcasts"
        subtitle={`${visible.length} messages`}
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: data.announcements.length },
              { value: 'published', label: 'Published' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'draft', label: 'Drafts' },
            ]}
          />
        }
      >
        {visible.length ? (
          <ul className="announce-list">
            {visible.map((item) => (
              <li key={item.id} className={`announce-card ${item.pinned ? 'is-pinned' : ''}`}>
                <header>
                  <div className="announce-head">
                    {item.pinned ? <Pin size={14} className="pin-icon" /> : null}
                    <h4>{item.title}</h4>
                  </div>
                  <Badge tone={TONE[item.status]}>{item.status}</Badge>
                </header>
                <p>{item.body}</p>
                <footer>
                  <div className="announce-meta">
                    <Avatar name={item.author} hue={item.author.length * 41} size={26} />
                    <span>{item.author}</span>
                    <span className="dot-sep">·</span>
                    <span>{item.audience}</span>
                    <span className="dot-sep">·</span>
                    <span>{shortDate(item.date)}</span>
                  </div>
                  <div className="row-actions">
                    {item.status !== 'published' ? (
                      <Btn
                        size="sm"
                        variant="soft"
                        icon={<Send size={14} />}
                        onClick={() =>
                          updateAnnouncement(item.id, {
                            title: item.title,
                            body: item.body,
                            audience: item.audience,
                            status: 'published',
                            date: new Date().toISOString(),
                            author: item.author,
                            pinned: item.pinned,
                          })
                        }
                      >
                        Publish
                      </Btn>
                    ) : null}
                    <button
                      className="icon-btn sm"
                      aria-label={item.pinned ? 'Unpin' : 'Pin'}
                      onClick={() => togglePinned(item.id)}
                    >
                      <Pin size={15} />
                    </button>
                    <button
                      className="icon-btn sm"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn sm danger"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </footer>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Megaphone size={22} />}
            title="Nothing announced yet"
            text="Publish an update so everyone knows what changed."
            action={
              <Btn icon={<Plus size={16} />} onClick={openCreate}>
                New announcement
              </Btn>
            }
          />
        )}
      </Panel>

      <Modal
        open={open}
        title={editing ? 'Edit announcement' : 'New announcement'}
        subtitle="Choose who receives it and when."
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>{editing ? 'Save changes' : 'Create'}</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Title" wide hint={error || undefined}>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="New moderation guidelines"
            />
          </Field>
          <Field label="Audience">
            <select
              className="input"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              {['All staff', 'Agents', 'Moderators', 'Owners', 'Clients'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AnnouncementStatus })}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Message" wide>
            <textarea
              className="input textarea"
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write the announcement…"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete announcement"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed permanently.` : ''}
        onConfirm={() => pendingDelete && deleteAnnouncement(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
