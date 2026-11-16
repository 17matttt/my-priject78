import { useEffect, useState } from 'react'
import { Building2, Download, Globe2, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Avatar, Badge, Btn, Field, PageHeader, Panel } from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { downloadFile } from '../lib/export'
import type { CompanySettings } from '../types'

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

export function Settings() {
  const { data, updateSettings, resetDemo, clearWorkspace } = useApp()
  const [form, setForm] = useState<CompanySettings>(data.settings)
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  useEffect(() => {
    setForm(data.settings)
  }, [data.settings])

  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings)

  const save = () => {
    updateSettings(form)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

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
        eyebrow="Workspace"
        title="Settings"
        subtitle="Company profile, preferences and data controls."
        actions={
          <>
            <Btn variant="ghost" icon={<Download size={16} />} onClick={exportBackup}>
              Export JSON
            </Btn>
            <Btn icon={<Save size={16} />} onClick={save} disabled={!dirty && !saved}>
              {saved ? 'Saved' : 'Save changes'}
            </Btn>
          </>
        }
      />

      <div className="settings-grid">
        <Panel tone="glass" title="Company profile" subtitle="Shown across the admin workspace">
          <div className="profile-head">
            <Avatar name={form.name || 'Vantage Estate'} hue={168} size={54} />
            <div>
              <strong>{form.name || 'Vantage Estate'}</strong>
              <span>{form.legalName || 'Legal entity not set'}</span>
            </div>
            <Badge tone="accent">
              <ShieldCheck size={13} /> Verified
            </Badge>
          </div>
          <div className="form-grid">
            <Field label="Display name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vantage Estate"
              />
            </Field>
            <Field label="Legal name">
              <input
                className="input"
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                placeholder="Vantage Estate Group SARL"
              />
            </Field>
            <Field label="Contact email">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hello@vantage.estate"
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 1 84 88 20 10"
              />
            </Field>
            <Field label="Head office" wide>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="18 Rue de la Paix, 75002 Paris"
              />
            </Field>
          </div>
        </Panel>

        <div className="settings-col">
          <Panel tone="glass" title="Regional" subtitle="Currency and timezone">
            <div className="form-grid">
              <Field label="Currency">
                <select
                  className="input"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value as CompanySettings['currency'] })
                  }
                >
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="GBP">GBP — Pound (£)</option>
                  <option value="AED">AED — Dirham (د.إ)</option>
                </select>
              </Field>
              <Field label="Timezone">
                <select
                  className="input"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  {[
                    'Europe/Paris',
                    'Europe/London',
                    'Europe/Lisbon',
                    'America/New_York',
                    'Asia/Dubai',
                  ].map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="muted-note">
              <Globe2 size={13} /> Amounts are formatted with the selected currency everywhere.
            </p>
          </Panel>

          <Panel tone="glass" title="Notifications" subtitle="What lands in your inbox">
            <Toggle
              label="Email alerts"
              desc="New listings, approvals and client messages."
              on={form.emailAlerts}
              onChange={() => setForm({ ...form, emailAlerts: !form.emailAlerts })}
            />
            <Toggle
              label="Push notifications"
              desc="Real-time alerts in the admin console."
              on={form.pushAlerts}
              onChange={() => setForm({ ...form, pushAlerts: !form.pushAlerts })}
            />
            <Toggle
              label="Weekly digest"
              desc="Performance summary every Monday."
              on={form.weeklyDigest}
              onChange={() => setForm({ ...form, weeklyDigest: !form.weeklyDigest })}
            />
          </Panel>
        </div>
      </div>

      <div className="split-2">
        <Panel tone="glass" title="Security" subtitle="Access and visibility">
          <Toggle
            label="Require two-factor authentication"
            desc="Every staff sign-in needs a second factor."
            on={form.twoFactorRequired}
            onChange={() => setForm({ ...form, twoFactorRequired: !form.twoFactorRequired })}
          />
          <Toggle
            label="Public agency profile"
            desc="Show the agency page to clients."
            on={form.publicProfile}
            onChange={() => setForm({ ...form, publicProfile: !form.publicProfile })}
          />
          <Toggle
            label="Auto-approve trusted owners"
            desc="Skip moderation for verified accounts."
            on={form.autoApprove}
            onChange={() => setForm({ ...form, autoApprove: !form.autoApprove })}
          />
          <Toggle
            label="Maintenance mode"
            desc="Pause public traffic while working."
            on={form.maintenanceMode}
            onChange={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
          />
        </Panel>

        <Panel tone="glass" title="Data & account" subtitle="Backups and destructive actions">
          <div className="danger-zone">
            <div className="danger-item">
              <span className="danger-icon safe">
                <Download size={18} />
              </span>
              <div>
                <h4>Export backup</h4>
                <p>Download every record as a JSON file.</p>
              </div>
              <Btn variant="soft" onClick={exportBackup}>
                Export
              </Btn>
            </div>
            <div className="danger-item">
              <span className="danger-icon">
                <Upload size={18} />
              </span>
              <div>
                <h4>Restore demo data</h4>
                <p>Bring back the sample workspace.</p>
              </div>
              <Btn variant="soft" onClick={() => setConfirm('reset')}>
                Restore
              </Btn>
            </div>
            <div className="danger-item">
              <span className="danger-icon warning">
                <Trash2 size={18} />
              </span>
              <div>
                <h4>Clear workspace</h4>
                <p>Delete all data in this browser.</p>
              </div>
              <Btn variant="danger" onClick={() => setConfirm('clear')}>
                Clear
              </Btn>
            </div>
            <div className="danger-item">
              <span className="danger-icon">
                <Building2 size={18} />
              </span>
              <div>
                <h4>Workspace ID</h4>
                <p>Local persistence namespace.</p>
              </div>
              <code className="code-chip">vantage-estate</code>
            </div>
          </div>
        </Panel>
      </div>

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
