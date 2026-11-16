import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Download,
  GraduationCap,
  HardDrive,
  Info,
  KeyRound,
  Laptop,
  Link2,
  Mail,
  MonitorDown,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Upload,
  UserRound,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Btn, Field, Input, Modal, PageHead, Panel, Toggle } from '../components/UI'
import { downloadText, readFileText, toCsv } from '../lib/download'
import { useInstallPrompt } from '../lib/pwa'
import { fmtDateShort, todayISO } from '../lib/date'
import { bytes } from '../lib/format'
import type { ConnectionId, VaultState } from '../types'

const CONNECTIONS: {
  id: ConnectionId
  label: string
  detail: string
  requirement: string
  icon: typeof Mail
}[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    detail: 'Read, archive and compose mail from the Mail Center.',
    requirement:
      'Requires a Google OAuth client (client ID + secret) and a server route that exchanges the authorization code. VAULT has no server in this local-first build, so tokens cannot be stored safely — the Mail Center therefore works with messages you add yourself.',
    icon: Mail,
  },
  {
    id: 'gcal',
    label: 'Google Calendar',
    detail: 'Two-way sync of events with the VAULT calendar.',
    requirement:
      'Requires Google Calendar OAuth scopes and a backend to refresh tokens. Until that is configured, the calendar uses events and weekly classes stored on this device.',
    icon: CalendarDays,
  },
  {
    id: 'ecoledirecte',
    label: 'ÉcoleDirecte',
    detail: 'Grades, homework and timetable import.',
    requirement:
      'ÉcoleDirecte exposes no public API for third-party apps. Authorized access goes through a partner agreement; there is no supported endpoint to call. Use the manual import on the School page instead — never paste school passwords into any app.',
    icon: GraduationCap,
  },
]

export default function Settings() {
  const { state, set, updateProfile, updatePrefs, resetAll, clearDemo, exportState, importState, saveStatus } = useApp()
  const { canInstall, installed, install, isIos } = useInstallPrompt()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [profile, setProfile] = useState(state.profile)
  const [saved, setSaved] = useState(false)
  const [connectInfo, setConnectInfo] = useState<ConnectionId | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [importMessage, setImportMessage] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    setProfile(state.profile)
  }, [state.profile])

  const demoCount = useMemo(
    () =>
      state.tasks.filter((entry) => entry.demo).length +
      state.events.filter((entry) => entry.demo).length +
      state.messages.filter((entry) => entry.demo).length +
      state.grades.filter((entry) => entry.demo).length +
      state.homework.filter((entry) => entry.demo).length +
      state.classes.filter((entry) => entry.demo).length +
      state.documents.filter((entry) => entry.demo).length +
      state.focusSessions.filter((entry) => entry.demo).length,
    [state],
  )

  const storageSize = useMemo(() => {
    try {
      return bytes(new Blob([JSON.stringify(state)]).size)
    } catch {
      return '—'
    }
  }, [state])

  const saveProfile = () => {
    updateProfile({
      name: profile.name.trim() || 'Your name',
      email: profile.email.trim(),
      school: profile.school.trim(),
      role: profile.role.trim(),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const exportJson = () => {
    downloadText(`vault-backup-${todayISO()}.json`, exportState())
  }

  const exportCsv = () => {
    const rows: (string | number)[][] = [['type', 'title', 'detail', 'date', 'value', 'status']]
    for (const task of state.tasks) {
      rows.push(['task', task.title, task.category, task.due || '', task.priority, task.done ? 'done' : 'open'])
    }
    for (const grade of state.grades) {
      rows.push(['grade', grade.title, grade.subject, grade.date, `${grade.score}/${grade.outOf}`, `coef ${grade.coefficient}`])
    }
    for (const item of state.homework) {
      rows.push(['homework', item.title, item.subject, item.due, '', item.done ? 'done' : 'open'])
    }
    for (const session of state.focusSessions) {
      rows.push(['focus', session.label, session.mode, session.startedAt.slice(0, 10), `${session.minutes} min`, ''])
    }
    for (const message of state.messages) {
      rows.push(['mail', message.subject, message.fromName, message.date.slice(0, 10), '', message.folder])
    }
    downloadText(`vault-export-${todayISO()}.csv`, toCsv(rows), 'text/csv')
  }

  const importJson = async (file: File) => {
    try {
      const raw = await readFileText(file)
      setImportMessage(importState(raw))
    } catch {
      setImportMessage({ ok: false, message: 'This file could not be read.' })
    }
  }

  const toggleNotification = (key: keyof VaultState['prefs']['notifications'], value: boolean) => {
    updatePrefs({ notifications: { ...state.prefs.notifications, [key]: value } })
  }

  const setConnection = (id: ConnectionId, patch: Partial<VaultState['connections'][ConnectionId]>) => {
    set((current) => ({
      ...current,
      connections: { ...current.connections, [id]: { ...current.connections[id], ...patch } },
    }))
  }

  return (
    <div className="page">
      <PageHead title="Settings" sub="Profile, connections, appearance and your data" eyebrow="Control">
        <Badge tone={saveStatus === 'error' ? 'bad' : 'good'} dot>
          {saveStatus === 'error' ? 'Storage error' : 'Saved locally'}
        </Badge>
      </PageHead>

      <div className="settings-grid">
        <Panel title="Profile" sub="Used for greetings and exports" delay={20}>
          <div className="form-grid">
            <Field label="Full name">
              <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="School or organisation">
              <Input value={profile.school} onChange={(event) => setProfile({ ...profile, school: event.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Workspace label">
              <Input value={profile.role} onChange={(event) => setProfile({ ...profile, role: event.target.value })} placeholder="Personal workspace" />
            </Field>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <Btn variant="primary" onClick={saveProfile} icon={<Check size={14} />}>
              Save profile
            </Btn>
            {saved && <span className="saved-note">Profile updated</span>}
          </div>
        </Panel>

        <Panel title="Appearance" sub="Applied instantly" delay={50}>
          <div className="stack" style={{ gap: 4 }}>
            <Toggle
              checked={state.prefs.reduceMotion}
              onChange={(value) => updatePrefs({ reduceMotion: value })}
              label="Reduce motion"
            />
            <Toggle
              checked={state.prefs.weekStartsMonday}
              onChange={(value) => updatePrefs({ weekStartsMonday: value })}
              label="Week starts on Monday"
            />
            <Toggle
              checked={state.prefs.compact}
              onChange={(value) => updatePrefs({ compact: value })}
              label="Compact spacing"
            />
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Reduce motion disables ambient drift and panel transitions — useful on low-power laptops.
          </p>
        </Panel>

        <Panel title="Notifications" sub="In-app alert center" delay={80}>
          <div className="stack" style={{ gap: 4 }}>
            <Toggle checked={state.prefs.notifications.tasks} onChange={(value) => toggleNotification('tasks', value)} label="Task deadlines and overdue items" />
            <Toggle checked={state.prefs.notifications.school} onChange={(value) => toggleNotification('school', value)} label="Tests and homework due" />
            <Toggle checked={state.prefs.notifications.mail} onChange={(value) => toggleNotification('mail', value)} label="Unread mail" />
            <Toggle checked={state.prefs.notifications.focus} onChange={(value) => toggleNotification('focus', value)} label="Focus goal reminders" />
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Notifications are generated from your stored data inside the app. Desktop notifications require installing VAULT as an app.
          </p>
        </Panel>

        <Panel title="Desktop app" sub="Install VAULT on this computer" delay={110}>
          <div className="install-box">
            <span className="install-icon"><MonitorDown size={18} /></span>
            <div>
              <div className="install-title">{installed ? 'VAULT is installed' : canInstall ? 'Ready to install' : 'Installation not offered here'}</div>
              <p className="install-text">
                {installed
                  ? 'You are running VAULT in its own window. Launch it from your taskbar, dock or start menu.'
                  : canInstall
                    ? 'Add VAULT to your taskbar or dock and open it in a dedicated window that works offline.'
                    : isIos
                      ? 'On iPad or iPhone, use Share → Add to Home Screen.'
                      : 'Your browser has not offered an install prompt. In Chrome or Edge, open the address-bar menu and choose "Install VAULT". The app still works in a normal tab.'}
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <Btn variant="primary" icon={<Download size={14} />} disabled={!canInstall} onClick={() => void install()}>
              {installed ? 'Installed' : 'Install VAULT'}
            </Btn>
            <span className="hint" style={{ margin: 0 }}>Windows · macOS · Linux · ChromeOS</span>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            No Windows .exe installer is bundled. The installable PWA is the supported desktop build and is verified in this browser;
            a native installer would have to be built and signed separately.
          </p>
        </Panel>

        <Panel title="Connections" sub="Real integrations require credentials" delay={140} className="span-2">
          <div className="stack" style={{ gap: 8 }}>
            {CONNECTIONS.map((entry) => {
              const connection = state.connections[entry.id]
              const Icon = entry.icon
              return (
                <div key={entry.id} className="conn-card">
                  <span className="conn-logo"><Icon size={16} /></span>
                  <div className="conn-body">
                    <div className="conn-top">
                      <span className="conn-name">{entry.label}</span>
                      <Badge tone={connection.status === 'connected' ? 'good' : connection.status === 'unavailable' ? 'warn' : 'neutral'}>
                        {connection.status === 'connected' ? 'Connected' : connection.status === 'unavailable' ? 'Unavailable' : 'Not connected'}
                      </Badge>
                    </div>
                    <p className="conn-note">{entry.detail}</p>
                    {connection.status === 'connected' && connection.account && (
                      <p className="conn-note dim">
                        {connection.account} · since {connection.connectedAt ? fmtDateShort(connection.connectedAt.slice(0, 10)) : 'today'}
                      </p>
                    )}
                  </div>
                  <div className="conn-actions">
                    {connection.status === 'connected' ? (
                      <Btn
                        variant="ghost"
                        size="sm"
                        icon={<Unplug size={13} />}
                        onClick={() => setConnection(entry.id, { status: 'disconnected', account: '', connectedAt: null, note: '' })}
                      >
                        Disconnect
                      </Btn>
                    ) : (
                      <Btn variant="soft" size="sm" icon={<Link2 size={13} />} onClick={() => setConnectInfo(entry.id)}>
                        How to connect
                      </Btn>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            <Info size={11} /> VAULT never asks for passwords. Anything marked “Connected” here is a local label you control — no remote account is queried.
          </p>
        </Panel>

        <Panel title="Your data" sub="Stored in this browser only" delay={170}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="metric-row">
              <span className="dim tiny">Storage used</span>
              <span className="strong tiny">{storageSize}</span>
            </div>
            <div className="metric-row">
              <span className="dim tiny">Records</span>
              <span className="strong tiny">
                {state.tasks.length + state.events.length + state.messages.length + state.grades.length + state.documents.length}
              </span>
            </div>
            <div className="metric-row">
              <span className="dim tiny">Demo entries</span>
              <span className="strong tiny">{demoCount}</span>
            </div>
            <div className="metric-row">
              <span className="dim tiny">Last change</span>
              <span className="strong tiny">{fmtDateShort(state.updatedAt.slice(0, 10))}</span>
            </div>
          </div>

          <div className="stack" style={{ gap: 8, marginTop: 14 }}>
            <Btn variant="soft" size="sm" icon={<Download size={13} />} onClick={exportJson}>
              Export JSON backup
            </Btn>
            <Btn variant="soft" size="sm" icon={<HardDrive size={13} />} onClick={exportCsv}>
              Export CSV
            </Btn>
            <Btn variant="soft" size="sm" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
              Import JSON backup
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void importJson(file)
              }}
            />
            {importMessage && (
              <p className={importMessage.ok ? 'saved-note' : 'error-text'}>{importMessage.message}</p>
            )}
          </div>
        </Panel>

        <Panel title="Demo data" sub="Clearly marked sample content" delay={200}>
          <p className="hint" style={{ marginTop: 0 }}>
            VAULT starts with sample content so the interface is explorable. Demo records always carry a “Demo” tag and are never mixed silently into your own entries.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <Btn variant="soft" size="sm" icon={<Sparkles size={13} />} disabled={demoCount === 0} onClick={clearDemo}>
              {demoCount === 0 ? 'No demo data' : `Remove ${demoCount} demo entries`}
            </Btn>
          </div>
        </Panel>

        <Panel title="Security" sub="How your data is handled" delay={230}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="sec-row">
              <ShieldCheck size={14} />
              <span>Data never leaves this device. There is no VAULT server, account or telemetry.</span>
            </div>
            <div className="sec-row">
              <KeyRound size={14} />
              <span>No passwords are requested or stored. File contents live in IndexedDB, metadata in localStorage.</span>
            </div>
            <div className="sec-row">
              <Laptop size={14} />
              <span>Clearing site data or using another browser/profile starts an empty VAULT. Export a backup first.</span>
            </div>
          </div>
        </Panel>

        <Panel title="Danger zone" sub="Irreversible local actions" delay={260}>
          <p className="hint" style={{ marginTop: 0 }}>
            Resetting deletes every task, event, message, grade, document and focus session stored in this browser.
          </p>
          <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setResetOpen(true)}>
            Reset all data
          </Btn>
        </Panel>
      </div>

      <Modal
        open={Boolean(connectInfo)}
        onClose={() => setConnectInfo(null)}
        title={connectInfo ? `Connect ${CONNECTIONS.find((entry) => entry.id === connectInfo)?.label}` : ''}
        sub="What a real integration requires"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConnectInfo(null)}>
              Close
            </Btn>
            <Btn
              variant="soft"
              icon={<AlertTriangle size={13} />}
              onClick={() => {
                if (connectInfo) setConnection(connectInfo, { status: 'unavailable', note: 'Awaiting credentials' })
                setConnectInfo(null)
              }}
            >
              Mark as awaiting setup
            </Btn>
          </>
        }
      >
        <p className="hint" style={{ marginTop: 0 }}>
          {connectInfo ? CONNECTIONS.find((entry) => entry.id === connectInfo)?.requirement : ''}
        </p>
        <p className="hint">
          VAULT will not pretend a connection works. Once credentials exist, the same interface can attach a real provider without changing your data.
        </p>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => {
          setResetOpen(false)
          setResetText('')
        }}
        title="Reset VAULT"
        sub="This cannot be undone"
        footer={
          <>
            <Btn
              variant="ghost"
              onClick={() => {
                setResetOpen(false)
                setResetText('')
              }}
            >
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={resetText !== 'RESET'}
              onClick={() => {
                resetAll()
                setResetOpen(false)
                setResetText('')
              }}
            >
              Delete everything
            </Btn>
          </>
        }
      >
        <p className="hint" style={{ marginTop: 0 }}>
          Type <strong>RESET</strong> to confirm. Export a JSON backup first if you may want this data back.
        </p>
        <Field label="Confirmation">
          <Input value={resetText} onChange={(event) => setResetText(event.target.value)} placeholder="RESET" />
        </Field>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <Btn variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={exportJson}>
            Export backup
          </Btn>
          <Btn variant="ghost" size="sm" icon={<UserRound size={13} />} onClick={() => setResetOpen(false)}>
            Keep my data
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
