import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Database,
  Download,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Badge, Btn, PageHeader, Panel } from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { downloadFile } from '../lib/export'
import { plural, relativeTime } from '../lib/format'

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string
  desc: string
  on: boolean
  onChange: () => void
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-text">
        <span className="toggle-label">{label}</span>
        <span className="toggle-desc">{desc}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`toggle ${on ? 'is-on' : ''}`}
        onClick={onChange}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  )
}

export function System() {
  const { data, updateSettings, resetDemo, clearWorkspace } = useApp()
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  const records = useMemo(
    () =>
      data.properties.length +
      data.users.length +
      data.clients.length +
      data.team.length +
      data.tasks.length +
      data.tickets.length +
      data.announcements.length +
      data.finance.length +
      data.invoices.length,
    [data],
  )

  const health = [
    { label: 'API', value: 'Operational', tone: 'success' as const },
    { label: 'Database', value: 'Operational', tone: 'success' as const },
    { label: 'Storage', value: 'Operational', tone: 'success' as const },
    {
      label: 'Email delivery',
      value: data.settings.emailAlerts ? 'Operational' : 'Paused',
      tone: data.settings.emailAlerts ? ('success' as const) : ('warning' as const),
    },
  ]

  const exportBackup = () => {
    downloadFile(
      `vantage-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="System"
        subtitle="Platform health, data footprint and environment controls."
        actions={
          <Btn variant="dark" icon={<Download size={16} />} onClick={exportBackup}>
            Backup JSON
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-dark">
          <p className="stat-label">Records stored</p>
          <strong className="stat-value">{records}</strong>
          <p className="stat-hint">{plural(data.activity.length, 'activity entry', 'activity entries')}</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Environment</p>
          <strong className="stat-value">Production</strong>
          <p className="stat-hint">Local persistence adapter</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Last write</p>
          <strong className="stat-value">
            {data.activity[0] ? relativeTime(data.activity[0].at) : '—'}
          </strong>
          <p className="stat-hint">Auto-saved on every change</p>
        </div>
      </div>

      <div className="split-2">
        <Panel tone="glass" title="Service health" subtitle="Live component status">
          <ul className="health-list">
            {health.map((item) => (
              <li key={item.label}>
                <span className="health-name">
                  <Gauge size={15} /> {item.label}
                </span>
                <Badge tone={item.tone}>{item.value}</Badge>
              </li>
            ))}
          </ul>
          <div className="kv">
            <span>Version</span>
            <strong>v{data.version}.0.0</strong>
          </div>
          <div className="kv">
            <span>Currency</span>
            <strong>{data.settings.currency}</strong>
          </div>
          <div className="kv">
            <span>Timezone</span>
            <strong>{data.settings.timezone}</strong>
          </div>
        </Panel>

        <Panel tone="glass" title="Environment controls" subtitle="Applies to every admin session">
          <Toggle
            label="Maintenance mode"
            desc="Show a maintenance notice to non-admin users."
            on={data.settings.maintenanceMode}
            onChange={() => updateSettings({ maintenanceMode: !data.settings.maintenanceMode })}
          />
          <Toggle
            label="Auto-approve listings"
            desc="Skip moderation for trusted owners."
            on={data.settings.autoApprove}
            onChange={() => updateSettings({ autoApprove: !data.settings.autoApprove })}
          />
          <Toggle
            label="Require two-factor auth"
            desc="Enforce 2FA for every staff account."
            on={data.settings.twoFactorRequired}
            onChange={() => updateSettings({ twoFactorRequired: !data.settings.twoFactorRequired })}
          />
        </Panel>
      </div>

      <Panel tone="glass" title="Data management" subtitle="Backups and destructive actions">
        <div className="danger-zone">
          <div className="danger-item">
            <span className="danger-icon">
              <Database size={18} />
            </span>
            <div>
              <h4>Restore demo dataset</h4>
              <p>Replace current data with the curated sample workspace.</p>
            </div>
            <Btn variant="soft" icon={<RefreshCw size={15} />} onClick={() => setConfirm('reset')}>
              Restore
            </Btn>
          </div>
          <div className="danger-item">
            <span className="danger-icon warning">
              <Trash2 size={18} />
            </span>
            <div>
              <h4>Clear workspace</h4>
              <p>Remove every property, client and record. This cannot be undone.</p>
            </div>
            <Btn variant="danger" onClick={() => setConfirm('clear')}>
              Clear
            </Btn>
          </div>
          <div className="danger-item">
            <span className="danger-icon safe">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h4>Encrypted at rest</h4>
              <p>Data is stored locally in this browser profile only.</p>
            </div>
            <Badge tone="success">Enabled</Badge>
          </div>
        </div>
      </Panel>

      <p className="muted-note">
        <AlertTriangle size={13} /> Data lives in this browser. Export a JSON backup before switching
        devices.
      </p>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Restore demo data"
        message="Your current records will be replaced with the sample workspace."
        confirmLabel="Restore demo"
        onConfirm={resetDemo}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Clear all data"
        message="Every property, client, invoice and task will be deleted permanently."
        confirmLabel="Delete everything"
        onConfirm={clearWorkspace}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}
