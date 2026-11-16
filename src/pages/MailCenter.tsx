import { useMemo, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  Plus,
  Search,
  Send,
  Star,
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
  Select,
  Textarea,
} from '../components/UI'
import { fmtDateShort, fmtTime } from '../lib/date'
import { bytes, uid } from '../lib/format'
import { unreadMail } from '../lib/insights'
import type { Attachment, MailMessage } from '../types'

type Folder = 'inbox' | 'sent' | 'archive' | 'starred'

const FOLDER_LABEL: Record<Folder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  archive: 'Archive',
  starred: 'Important',
}

export default function MailCenter() {
  const { state, upsert, remove } = useApp()
  const [folder, setFolder] = useState<Folder>('inbox')
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [draft, setDraft] = useState<{ to: string; subject: string; body: string; replyTo?: string } | null>(null)

  const unread = unreadMail(state)
  const labels = useMemo(() => {
    const set = new Set<string>()
    for (const message of state.messages) message.labels.forEach((entry) => set.add(entry))
    return [...set].sort()
  }, [state.messages])

  const messages = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.messages
      .filter((message) => {
        if (folder === 'starred') return message.starred
        if (folder !== 'inbox' && message.folder !== folder) return false
        if (folder === 'inbox' && message.folder === 'sent') return false
        return true
      })
      .filter((message) => (label === 'all' ? true : message.labels.includes(label)))
      .filter((message) =>
        q ? `${message.subject} ${message.fromName} ${message.body} ${message.fromEmail}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [state.messages, folder, query, label])

  const selected = state.messages.find((message) => message.id === selectedId) || messages[0] || null

  const patch = (message: MailMessage, changes: Partial<MailMessage>) => {
    upsert('messages', { ...message, ...changes })
  }

  const openMessage = (message: MailMessage) => {
    setSelectedId(message.id)
    if (!message.read) patch(message, { read: true })
  }

  const gmail = state.connections.gmail
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''

  const connectGmail = () => {
    if (!clientId) {
      window.location.hash = 'connections'
      return
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/mail`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  return (
    <div className="page">
      <PageHead
        title="Mail Center"
        sub={unread.length > 0 ? `${unread.length} unread · ${state.messages.length} stored` : `${state.messages.length} messages stored`}
        eyebrow="Command"
      >
        <Btn
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => {
            setDraft(null)
            setComposeOpen(true)
          }}
        >
          Compose
        </Btn>
      </PageHead>

      {gmail.status !== 'connected' && (
        <div className="banner" style={{ marginBottom: 14 }}>
          <Mail size={14} />
          <span>
            <b>Gmail is not connected.</b> Messages below are stored on this device only. Connecting Gmail requires an
            OAuth client ID configured for this deployment.
          </span>
          <Btn size="sm" variant="soft" onClick={connectGmail}>
            {clientId ? 'Connect Gmail' : 'Connection details'}
          </Btn>
        </div>
      )}

      <div className="mail-layout">
        <Panel
          title={
            <div className="chip-scroll">
              {(['inbox', 'sent', 'archive', 'starred'] as Folder[]).map((entry) => (
                <Chip
                  key={entry}
                  active={folder === entry}
                  onClick={() => {
                    setFolder(entry)
                    setSelectedId(null)
                  }}
                  count={entry === 'inbox' ? unread.length : undefined}
                >
                  {FOLDER_LABEL[entry]}
                </Chip>
              ))}
            </div>
          }
          flush
        >
          <div style={{ padding: '0 14px 10px', display: 'grid', gap: 8 }}>
            <div className="row" style={{ gap: 6 }}>
              <Search size={14} color="#8993a8" />
              <Input
                value={query}
                placeholder="Search mail"
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search mail"
              />
            </div>
            <Select value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Filter by label">
              <option value="all">All labels</option>
              {labels.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </div>

          <div className="mail-list">
            {messages.length === 0 && (
              <EmptyState
                icon={<Inbox />}
                title={`${FOLDER_LABEL[folder]} is empty`}
                text={
                  folder === 'sent'
                    ? 'Messages you compose are kept here on this device.'
                    : 'Nothing matches this folder and filter yet.'
                }
                action={
                  <Btn variant="soft" onClick={() => { setQuery(''); setLabel('all') }}>
                    Clear filters
                  </Btn>
                }
              />
            )}
            {messages.map((message) => (
              <button
                key={message.id}
                type="button"
                className={`mail-row ${selected?.id === message.id ? 'is-active' : ''} ${message.read ? '' : 'is-unread'}`}
                onClick={() => openMessage(message)}
              >
                <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                  <span className="mail-from">
                    {message.folder === 'sent' ? `To: ${message.to}` : message.fromName}
                  </span>
                  <span className="mail-date">{fmtDateShort(message.date.slice(0, 10))}</span>
                </div>
                <div className="mail-subject">
                  {message.subject}
                  {message.demo && <span className="badge badge--demo" style={{ marginLeft: 6 }}>Demo</span>}
                </div>
                <div className="mail-preview">{message.body.replace(/\s+/g, ' ').slice(0, 96)}</div>
                <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {message.starred && <Star size={11} color="#ffb454" fill="#ffb454" />}
                  {message.attachments.length > 0 && (
                    <span className="row tiny dim" style={{ gap: 3 }}>
                      <Paperclip size={10} /> {message.attachments.length}
                    </span>
                  )}
                  {message.labels.slice(0, 2).map((entry) => (
                    <span key={entry} className="badge">
                      {entry}
                    </span>
                  ))}
                  {!message.read && <span className="badge badge--accent">New</span>}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title={selected ? selected.subject : 'No message selected'}
          sub={selected ? `${selected.fromName} · ${selected.fromEmail}` : 'Choose a message to read it'}
          action={
            selected && (
              <div className="row" style={{ gap: 2 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Toggle important"
                  onClick={() => patch(selected, { starred: !selected.starred })}
                >
                  <Star size={15} fill={selected.starred ? '#ffb454' : 'none'} color={selected.starred ? '#ffb454' : 'currentColor'} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={selected.read ? 'Mark unread' : 'Mark read'}
                  onClick={() => patch(selected, { read: !selected.read })}
                >
                  {selected.read ? <Mail size={15} /> : <MailOpen size={15} />}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Archive"
                  onClick={() => patch(selected, { folder: 'archive' })}
                >
                  <Archive size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Delete message"
                  onClick={() => {
                    remove('messages', selected.id)
                    setSelectedId(null)
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          }
        >
          {!selected ? (
            <EmptyState
              icon={<MailOpen />}
              title="Your reading pane"
              text="Select a message on the left to read it, reply, forward or archive it."
            />
          ) : (
            <div className="stack">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div className="tiny dim">
                    {selected.folder === 'sent' ? 'Sent' : `From ${selected.fromName}`} ·{' '}
                    {fmtDateShort(selected.date.slice(0, 10))} at {fmtTime(selected.date)}
                  </div>
                  <div className="tiny dim">To {selected.to}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Btn
                    size="sm"
                    variant="soft"
                    icon={<CornerUpLeft size={13} />}
                    onClick={() => {
                      setDraft({
                        to: selected.fromEmail,
                        subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
                        body: `\n\n---\n${selected.fromName} wrote:\n${selected.body}`,
                        replyTo: selected.id,
                      })
                      setComposeOpen(true)
                    }}
                  >
                    Reply
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon={<CornerUpRight size={13} />}
                    onClick={() => {
                      setDraft({
                        to: '',
                        subject: selected.subject.startsWith('Fwd:') ? selected.subject : `Fwd: ${selected.subject}`,
                        body: `\n\n--- Forwarded message ---\n${selected.body}`,
                      })
                      setComposeOpen(true)
                    }}
                  >
                    Forward
                  </Btn>
                </div>
              </div>

              <div className="mail-body">{selected.body}</div>

              {selected.attachments.length > 0 && (
                <div>
                  <div className="label">Attachments</div>
                  <div className="stack" style={{ gap: 4 }}>
                    {selected.attachments.map((attachment) => (
                      <div key={attachment.id} className="list-item">
                        <span className="li-icon">
                          <Paperclip size={13} />
                        </span>
                        <span className="li-main">
                          <span className="li-title">{attachment.name}</span>
                          <span className="li-sub">{bytes(attachment.size)}</span>
                        </span>
                        <Badge>{attachment.type || 'file'}</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="hint">
                    Attachment contents belong to the connected mailbox. Local messages store metadata only.
                  </p>
                </div>
              )}

              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {selected.labels.map((entry) => (
                  <Badge key={entry} tone="violet">
                    {entry}
                  </Badge>
                ))}
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => patch(selected, { folder: selected.folder === 'archive' ? 'inbox' : 'archive' })}
                >
                  {selected.folder === 'archive' ? 'Move to inbox' : 'Archive message'}
                </Btn>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <ComposeModal
        open={composeOpen}
        draft={draft}
        onClose={() => setComposeOpen(false)}
        onSave={(message) => {
          upsert('messages', message)
          setFolder('sent')
          setSelectedId(message.id)
          setComposeOpen(false)
        }}
      />
    </div>
  )
}

function ComposeModal({
  open,
  draft,
  onClose,
  onSave,
}: {
  open: boolean
  draft: { to: string; subject: string; body: string; replyTo?: string } | null
  onClose: () => void
  onSave: (message: MailMessage) => void
}) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  if (open && !loaded) {
    setLoaded(true)
    setTo(draft?.to || '')
    setSubject(draft?.subject || '')
    setBody(draft?.body || '')
    setAttachments([])
    setError('')
  }
  if (!open && loaded) setLoaded(false)

  const submit = () => {
    if (!to.trim() || !to.includes('@')) {
      setError('Enter a valid recipient address.')
      return
    }
    if (!subject.trim()) {
      setError('Add a subject.')
      return
    }
    onSave({
      id: uid('mail'),
      fromName: 'You',
      fromEmail: 'me@local.vault',
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      date: new Date().toISOString(),
      folder: 'sent',
      read: true,
      starred: false,
      labels: draft?.replyTo ? ['Replies'] : ['Drafts'],
      attachments,
      threadId: draft?.replyTo || uid('thread'),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={draft?.replyTo ? 'Reply' : 'Compose message'}
      sub="Saved to your local Sent folder. Delivery requires a connected mailbox."
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Send size={14} />} onClick={submit}>
            Save to Sent
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="To" className="full">
          <Input value={to} placeholder="name@example.com" onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="Subject" className="full">
          <Input value={subject} placeholder="Subject" onChange={(event) => setSubject(event.target.value)} />
        </Field>
        <Field label="Message" className="full">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            style={{ minHeight: 190 }}
            placeholder="Write your message…"
          />
        </Field>
        <Field label="Attachments" className="full" hint="Files are recorded by name; connect a mailbox to send them.">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn--soft btn--sm" style={{ cursor: 'pointer' }}>
              <Paperclip size={13} /> Add files
              <input
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  const files = Array.from(event.target.files || [])
                  setAttachments((current) => [
                    ...current,
                    ...files.map((file) => ({
                      id: uid('att'),
                      name: file.name,
                      size: file.size,
                      type: file.type.split('/')[1] || 'file',
                    })),
                  ])
                  event.target.value = ''
                }}
              />
            </label>
            {attachments.map((attachment) => (
              <span key={attachment.id} className="badge badge--accent">
                {attachment.name}
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== attachment.id))}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="hint row" style={{ gap: 6, marginTop: 8 }}>
        <ArrowLeft size={12} /> replies keep the original subject <ArrowRight size={12} />
      </p>
    </Modal>
  )
}
