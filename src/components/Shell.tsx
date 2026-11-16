import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  Download,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Mail,
  MonitorDown,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  notifications as buildNotifications,
  searchAll,
  tasksDueOn,
  unreadMail,
} from '../lib/insights'
import { useInstallPrompt } from '../lib/pwa'
import { Avatar, Badge, Btn, Field, Input, Modal, Select, Textarea } from './UI'
import { fmtDateShort, fmtTime, todayISO } from '../lib/date'
import { uid } from '../lib/format'
import { downloadText } from '../lib/download'
import type { CalEvent, EventCategory, Priority, Recurrence, Task } from '../types'

interface NavEntry {
  to: string
  label: string
  icon: ReactNode
}

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Command',
    items: [
      { to: '/', label: 'Overview', icon: <LayoutDashboard /> },
      { to: '/mail', label: 'Mail Center', icon: <Mail /> },
      { to: '/school', label: 'School', icon: <GraduationCap /> },
      { to: '/calendar', label: 'Calendar', icon: <CalendarDays /> },
    ],
  },
  {
    label: 'Execute',
    items: [
      { to: '/tasks', label: 'Tasks', icon: <ListChecks /> },
      { to: '/focus', label: 'Focus', icon: <Timer /> },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/documents', label: 'Documents', icon: <FolderOpen /> },
      { to: '/analytics', label: 'Analytics', icon: <TrendingUp /> },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: <SettingsIcon /> }],
  },
]

const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'class', label: 'Class' },
  { value: 'study', label: 'Study' },
  { value: 'training', label: 'Training' },
  { value: 'personal', label: 'Personal' },
  { value: 'exam', label: 'Exam' },
  { value: 'work', label: 'Work' },
]

export default function Shell() {
  const { state, set, upsert, clearDemo, updateProfile, exportState, saveStatus } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const { canInstall, installed, install, isIos } = useInstallPrompt()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickTab, setQuickTab] = useState<'task' | 'event'>('task')
  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [installNote, setInstallNote] = useState('')

  const bellRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const unread = unreadMail(state)
  const dueToday = tasksDueOn(state)
  const notifs = useMemo(() => buildNotifications(state), [state])
  const hits = useMemo(() => searchAll(state, query), [state, query])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        setQuery('')
        setCursor(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setBellOpen(false)
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (path: string) => {
    setPaletteOpen(false)
    setQuery('')
    navigate(path)
  }

  const commands = useMemo(() => {
    const pages = NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        id: `page-${item.to}`,
        kind: 'Navigate',
        title: item.label,
        sub: group.label,
        icon: item.icon,
        run: () => go(item.to),
      })),
    )
    const actions = [
      {
        id: 'action-task',
        kind: 'Action',
        title: 'New task',
        sub: 'Capture something to do',
        icon: <Plus />,
        run: () => {
          setPaletteOpen(false)
          setQuickTab('task')
          setQuickOpen(true)
        },
      },
      {
        id: 'action-event',
        kind: 'Action',
        title: 'New calendar event',
        sub: 'Block time in your day',
        icon: <CalendarDays />,
        run: () => {
          setPaletteOpen(false)
          setQuickTab('event')
          setQuickOpen(true)
        },
      },
      {
        id: 'action-focus',
        kind: 'Action',
        title: 'Start a focus session',
        sub: 'Open the concentration room',
        icon: <Timer />,
        run: () => go('/focus'),
      },
      {
        id: 'action-backup',
        kind: 'Action',
        title: 'Export JSON backup',
        sub: 'Download every stored record',
        icon: <Download />,
        run: () => {
          setPaletteOpen(false)
          downloadText(`vault-backup-${todayISO()}.json`, exportState())
        },
      },
      {
        id: 'action-install',
        kind: 'Action',
        title: 'Install VAULT',
        sub: installed ? 'Already running as an app' : 'Add VAULT to this computer',
        icon: <MonitorDown />,
        run: () => {
          setPaletteOpen(false)
          if (canInstall) void install()
          else navigate('/settings#install')
        },
      },
    ]
    const dataHits = hits.map((hit) => ({
      id: `hit-${hit.kind}-${hit.id}`,
      kind: hit.kind,
      title: hit.title,
      sub: hit.sub,
      icon: <Search />,
      run: () => go(hit.page),
    }))

    const q = query.trim().toLowerCase()
    const filteredPages = q
      ? pages.filter((entry) => entry.title.toLowerCase().includes(q) || entry.kind.toLowerCase().includes(q))
      : pages
    const filteredActions = q
      ? actions.filter((entry) => entry.title.toLowerCase().includes(q))
      : actions

    return [...dataHits, ...filteredActions, ...filteredPages]
  }, [hits, query, canInstall, installed, exportState, install, navigate])

  const firstName = state.profile.name.trim().split(/\s+/)[0] || 'there'
  const demoCount = [
    ...state.tasks,
    ...state.events,
    ...state.messages,
    ...state.documents,
    ...state.homework,
    ...state.grades,
  ].filter((item) => item.demo).length

  const handlePaletteKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => Math.min(commands.length - 1, value + 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => Math.max(0, value - 1))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      commands[cursor]?.run()
    }
    if (event.key === 'Escape') setPaletteOpen(false)
  }

  return (
    <div className="app" data-reduce={state.prefs.reduceMotion ? 'true' : 'false'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <div className="brand-name">VAULT</div>
            <div className="brand-sub">Personal OS</div>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const active = location.pathname === item.to
                const badge =
                  item.to === '/mail' ? unread.length : item.to === '/tasks' ? dueToday.length : 0
                return (
                  <button
                    key={item.to}
                    type="button"
                    className={`nav-item ${active ? 'is-active' : ''}`}
                    onClick={() => navigate(item.to)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {badge > 0 && <span className="nav-badge">{badge}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setQuery('')
              setPaletteOpen(true)
            }}
          >
            <Search />
            <span>Search everything</span>
            <span className="kbd">⌘K</span>
          </button>
          <div className="plan-card">
            <div className="row">
              <Sparkles size={14} color="#69d9ff" />
              <h4 style={{ flex: 1 }}>Desktop app</h4>
              <span className="badge badge--accent">{installed ? 'On' : 'PWA'}</span>
            </div>
            <p>
              {installed
                ? 'VAULT is running in its own window. Your data stays on this device.'
                : 'Install VAULT to launch it from your taskbar or dock, offline included.'}
            </p>
            {!installed && (
              <Btn
                variant="soft"
                size="sm"
                icon={<MonitorDown size={14} />}
                onClick={async () => {
                  if (canInstall) {
                    const ok = await install()
                    setInstallNote(ok ? 'Installed.' : '')
                  } else {
                    setInstallNote(
                      isIos
                        ? 'On iPhone or iPad, use Share → Add to Home Screen.'
                        : 'Use your browser menu → “Install VAULT” (Chrome or Edge, over HTTPS).',
                    )
                  }
                }}
              >
                Install VAULT
              </Btn>
            )}
            {installNote && <p style={{ color: '#bfefff' }}>{installNote}</p>}
          </div>
          <div className="row tiny dim" style={{ padding: '0 4px' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  saveStatus === 'error' ? 'var(--bad)' : saveStatus === 'saving' ? 'var(--warn)' : 'var(--good)',
              }}
            />
            {saveStatus === 'error'
              ? 'Storage unavailable'
              : saveStatus === 'saving'
                ? 'Saving locally…'
                : 'Saved on this device'}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search />
            <span>Search tasks, email, school, files…</span>
            <span className="kbd">⌘K</span>
          </button>

          <div className="top-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Quick add"
              title="Quick add"
              onClick={() => {
                setQuickTab('task')
                setQuickOpen(true)
              }}
            >
              <Plus />
            </button>

            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Notifications (${notifs.length})`}
                onClick={() => {
                  setBellOpen((open) => !open)
                  setMenuOpen(false)
                }}
              >
                <Bell />
                {notifs.length > 0 && <span className="dot" />}
              </button>
              {bellOpen && (
                <div className="popover" role="dialog" aria-label="Notification center">
                  <div className="popover-head">
                    <strong style={{ fontSize: 12.5 }}>Notifications</strong>
                    <span className="badge badge--accent">{notifs.length}</span>
                  </div>
                  <div className="popover-scroll">
                    {notifs.length === 0 && (
                      <p className="empty-text" style={{ padding: '10px 8px' }}>
                        Nothing needs your attention right now.
                      </p>
                    )}
                    {notifs.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        className="popover-item"
                        onClick={() => {
                          setBellOpen(false)
                          navigate(notif.page)
                        }}
                      >
                        <span className={`prio prio--${notif.tone === 'bad' ? 'high' : notif.tone === 'warn' ? 'medium' : 'low'}`} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="li-title">{notif.title}</span>
                          <span className="li-sub" style={{ display: 'block' }}>
                            {notif.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="tiny dim" style={{ padding: '8px 8px 2px', lineHeight: 1.5 }}>
                    Generated from your stored data and notification preferences.
                  </p>
                </div>
              )}
            </div>

            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="avatar"
                aria-label="Profile menu"
                onClick={() => {
                  setMenuOpen((open) => !open)
                  setBellOpen(false)
                }}
              >
                {state.profile.name.trim()
                  ? state.profile.name
                      .trim()
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'V'}
              </button>
              {menuOpen && (
                <div className="popover" style={{ width: 260 }} role="menu">
                  <div className="popover-head" style={{ gap: 10 }}>
                    <Avatar name={state.profile.name || 'Vault user'} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div className="li-title">{state.profile.name || 'Your profile'}</div>
                      <div className="li-sub">{state.profile.email || 'Local workspace'}</div>
                    </div>
                  </div>
                  <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); navigate('/settings') }}>
                    <SettingsIcon /> Settings &amp; connections
                  </button>
                  <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); navigate('/analytics') }}>
                    <TrendingUp /> Productivity analytics
                  </button>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      downloadText(`vault-backup-${todayISO()}.json`, exportState())
                    }}
                  >
                    <Download /> Export backup
                  </button>
                  <div className="menu-sep" />
                  <div className="tiny dim" style={{ padding: '6px 10px' }}>
                    Signed in locally as {firstName}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {state.demoMode && demoCount > 0 && (
          <div style={{ padding: '10px 26px 0' }}>
            <div className="banner">
              <CircleHelp />
              <span>
                <b>Demo workspace.</b> Every record tagged <span className="badge badge--demo">Demo</span> is sample
                content, not your information.
              </span>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearDemo()
                  updateProfile({ name: 'Your name', email: '', school: '', role: 'Personal workspace' })
                }}
              >
                Clear demo data
              </Btn>
            </div>
          </div>
        )}

        <Outlet />

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {[
            { to: '/', label: 'Overview', icon: <LayoutDashboard /> },
            { to: '/mail', label: 'Mail', icon: <Mail /> },
            { to: '/tasks', label: 'Tasks', icon: <ListChecks /> },
            { to: '/calendar', label: 'Calendar', icon: <CalendarDays /> },
          ].map((item) => (
            <button
              key={item.to}
              type="button"
              className={`mobile-nav-item ${location.pathname === item.to ? 'is-active' : ''}`}
              onClick={() => navigate(item.to)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button type="button" className="mobile-nav-item" onClick={() => setPaletteOpen(true)}>
            <Search />
            More
          </button>
        </nav>
      </div>

      {paletteOpen && (
        <div className="palette-overlay" onClick={() => setPaletteOpen(false)} role="presentation">
          <div className="palette" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Command palette">
            <div className="palette-input-row">
              <Search size={17} color="#8993a8" />
              <input
                className="palette-input"
                autoFocus
                placeholder="Search or jump to…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setCursor(0)
                }}
                onKeyDown={handlePaletteKey}
                aria-label="Search VAULT"
              />
              <button type="button" className="icon-btn" onClick={() => setPaletteOpen(false)} aria-label="Close search">
                <X />
              </button>
            </div>
            <div className="palette-list">
              {commands.length === 0 && (
                <p className="empty-text" style={{ padding: '18px 12px' }}>
                  No match for “{query}”. Try a task name, an email sender or a page.
                </p>
              )}
              {commands.map((command, index) => (
                <div key={command.id}>
                  {(index === 0 || commands[index - 1].kind !== command.kind) && (
                    <div className="palette-group">{command.kind}</div>
                  )}
                  <button
                    type="button"
                    className={`palette-item ${index === cursor ? 'is-active' : ''}`}
                    onMouseEnter={() => setCursor(index)}
                    onClick={command.run}
                  >
                    {command.icon}
                    <span className="palette-item-main">
                      <span className="palette-item-title">{command.title}</span>
                      <span className="palette-item-sub">{command.sub}</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <div className="palette-foot">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}

      <QuickAdd
        open={quickOpen}
        tab={quickTab}
        onTab={setQuickTab}
        onClose={() => setQuickOpen(false)}
        onSaved={() => setQuickOpen(false)}
        upsert={upsert}
        state={state}
        set={set}
      />
    </div>
  )
}

function QuickAdd({
  open,
  tab,
  onTab,
  onClose,
  onSaved,
  upsert,
}: {
  open: boolean
  tab: 'task' | 'event'
  onTab: (tab: 'task' | 'event') => void
  onClose: () => void
  onSaved: () => void
  upsert: (key: 'tasks' | 'events', item: Task | CalEvent) => void
  state: unknown
  set: unknown
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Personal')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState(todayISO())
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [notes, setNotes] = useState('')
  const [eventCategory, setEventCategory] = useState<EventCategory>('personal')
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('19:00')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTitle('')
      setNotes('')
      setLocation('')
      setError('')
    }
  }, [open])

  const submit = () => {
    if (!title.trim()) {
      setError('Give it a name first.')
      return
    }
    if (tab === 'task') {
      upsert('tasks', {
        id: uid('task'),
        title: title.trim(),
        notes: notes.trim(),
        priority,
        due: due || null,
        category,
        done: false,
        completedAt: null,
        recurrence,
        createdAt: new Date().toISOString(),
      })
    } else {
      if (end <= start) {
        setError('The end time must be after the start time.')
        return
      }
      upsert('events', {
        id: uid('event'),
        title: title.trim(),
        start: `${due}T${start}`,
        end: `${due}T${end}`,
        category: eventCategory,
        location: location.trim(),
        notes: notes.trim(),
        reminder: 30,
        source: 'vault',
      })
    }
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick add"
      sub="Saved to this device immediately."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check size={15} />} onClick={submit}>
            Save {tab === 'task' ? 'task' : 'event'}
          </Btn>
        </>
      }
    >
      <div className="quick-tabs">
        <button type="button" className={`chip ${tab === 'task' ? 'is-on' : ''}`} onClick={() => onTab('task')}>
          Task
        </button>
        <button type="button" className={`chip ${tab === 'event' ? 'is-on' : ''}`} onClick={() => onTab('event')}>
          Calendar event
        </button>
      </div>

      <div className="form-grid">
        <Field label={tab === 'task' ? 'Task' : 'Event title'} className="full">
          <Input
            autoFocus
            value={title}
            placeholder={tab === 'task' ? 'Revise chapter 4' : 'Football training'}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        {tab === 'task' ? (
          <>
            <Field label="Category">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {['School', 'Personal', 'Admin', 'Health', 'Sport', 'Work'].map((option) => (
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
            <Field label="Repeats">
              <Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}>
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Category">
              <Select
                value={eventCategory}
                onChange={(event) => setEventCategory(event.target.value as EventCategory)}
              >
                {EVENT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
            </Field>
            <Field label="Start">
              <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
            </Field>
            <Field label="End">
              <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
            </Field>
            <Field label="Location" className="full">
              <Input
                value={location}
                placeholder="Room 204, city library…"
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
          </>
        )}

        <Field label="Notes (optional)" className="full">
          <Textarea
            value={notes}
            placeholder="Anything useful to remember"
            onChange={(event) => setNotes(event.target.value)}
            style={{ minHeight: 70 }}
          />
        </Field>
      </div>

      {error && <p className="error-text">{error}</p>}
      {tab === 'event' && (
        <p className="hint">
          Reminders are stored with the event ({fmtDateShort(due)} · {fmtTime(start)}). VAULT shows them in your
          notification center.
        </p>
      )}
    </Modal>
  )
}
