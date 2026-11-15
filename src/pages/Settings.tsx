import { useEffect, useMemo, useState } from 'react'
import { Download, LogOut, ShieldCheck, Trash2, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Badge, ConfirmDialog, Field, PageHead, useToast } from '../components/UI'
import { CURRENCIES, DEFAULT_CURRENCY, categoryLabel } from '../lib/constants'
import { formatDate, formatMoney } from '../lib/format'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadFile(name: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Settings() {
  const { user, mode, signOut } = useAuth()
  const { profile, transactions, saveProfile, clearAllData, deleteAccount } = useData()
  const notify = useToast()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [privacy, setPrivacy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.full_name ?? '')
    setCurrency(profile.currency || DEFAULT_CURRENCY)
    setPrivacy(profile.privacy_mode)
  }, [profile])

  const dirty = useMemo(() => {
    if (!profile) return false
    return (
      name !== (profile.full_name ?? '') ||
      currency !== profile.currency ||
      privacy !== profile.privacy_mode
    )
  }, [profile, name, currency, privacy])

  const save = async () => {
    setSaving(true)
    try {
      await saveProfile({ full_name: name.trim() || null, currency, privacy_mode: privacy })
      notify('Preferences saved.', 'ok')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save your profile.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    if (transactions.length === 0) {
      notify('There is nothing to export yet.', 'info')
      return
    }
    const header = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency']
    const rows = [...transactions]
      .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))
      .map((tx) => [
        tx.occurred_on,
        tx.type,
        categoryLabel(tx.category),
        tx.description ?? '',
        tx.type === 'expense' ? -tx.amount : tx.amount,
        currency,
      ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    downloadFile(`vault-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    notify(`Exported ${transactions.length} transactions.`, 'ok')
  }

  const runClear = async () => {
    setBusy(true)
    try {
      await clearAllData()
      notify('All financial data cleared.', 'ok')
      setConfirmClear(false)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not clear your data.', 'err')
    } finally {
      setBusy(false)
    }
  }

  const runDelete = async () => {
    setBusy(true)
    try {
      const result = await deleteAccount()
      notify(
        result.authRemoved
          ? 'Your account and data were deleted.'
          : 'Your data was deleted. Remove the sign-in record in your Supabase dashboard to finish.',
        result.authRemoved ? 'ok' : 'info',
      )
      setConfirmDelete(false)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete your account.', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow="Preferences"
        title="Settings"
        sub="Your profile, currency, privacy and data — all under your control."
      />

      {mode === 'local' ? (
        <div className="banner">
          <ShieldCheck size={16} />
          <span>
            This build runs in <strong>device-local mode</strong>: your account and data are stored in
            this browser only. Add the Supabase environment variables to enable cloud accounts and
            cross-device sync.
          </span>
        </div>
      ) : null}

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Profile</h2>
            <p className="card-sub">How VAULT addresses you</p>
          </div>
          <Badge tone={mode === 'cloud' ? 'lime' : 'neutral'}>
            {mode === 'cloud' ? 'Cloud account' : 'Device-local'}
          </Badge>
        </div>
        <div className="card-pad">
          <div className="form-grid">
            <Field label="Display name" htmlFor="set-name">
              <input
                id="set-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                maxLength={60}
              />
            </Field>
            <Field label="Email" htmlFor="set-email">
              <input id="set-email" className="input" value={user?.email ?? ''} readOnly disabled />
            </Field>
          </div>

          <div className="settings-row" style={{ marginTop: 18 }}>
            <div>
              <div className="settings-label">Default currency</div>
              <div className="settings-desc">
                Used for every amount, chart and export in the app.
              </div>
            </div>
            <select
              className="select"
              style={{ width: 200 }}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-label="Default currency"
            >
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} — {option.symbol} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Privacy mode</div>
              <div className="settings-desc">
                Hide every amount behind dots. Totals stay accurate, screens stay private.
              </div>
            </div>
            <button
              type="button"
              className={`switch ${privacy ? 'on' : ''}`}
              role="switch"
              aria-checked={privacy}
              aria-label="Privacy mode"
              onClick={() => setPrivacy((value) => !value)}
            />
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Data</h2>
            <p className="card-sub">
              {transactions.length} transactions ·{' '}
              {transactions.length > 0
                ? `latest ${formatDate(
                    [...transactions].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))[0]
                      .occurred_on,
                  )}`
                : 'nothing recorded yet'}
            </p>
          </div>
        </div>
        <div className="card-pad">
          <div className="settings-row">
            <div>
              <div className="settings-label">Export as CSV</div>
              <div className="settings-desc">
                A spreadsheet-ready file of every transaction in {currency}.
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={exportCsv}>
              <Download />
              Export CSV
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Clear financial data</div>
              <div className="settings-desc">
                Deletes all transactions, budgets and goals. Your account stays open.
              </div>
            </div>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmClear(true)}>
              Clear data
            </button>
          </div>
        </div>
      </section>

      <section className="card danger-zone">
        <div className="card-head">
          <div>
            <h2 className="card-title">Account</h2>
            <p className="card-sub">Session and permanent removal</p>
          </div>
        </div>
        <div className="card-pad">
          <div className="settings-row">
            <div>
              <div className="settings-label">Sign out</div>
              <div className="settings-desc">End this session on this device.</div>
            </div>
            <button type="button" className="btn btn-quiet" onClick={() => void signOut()}>
              <LogOut />
              Sign out
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Delete account</div>
              <div className="settings-desc">
                Permanently removes your profile, transactions, budgets and goals.
              </div>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Delete account
            </button>
          </div>
        </div>
      </section>

      <div className="row" style={{ gap: 8, color: 'var(--muted-2)', fontSize: 11.5 }}>
        <User size={13} />
        <span>
          Signed in as {user?.email} · {formatMoney(0, currency)} sample formatting in {currency}
        </span>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all financial data?"
        text="Every transaction, budget and savings goal will be permanently deleted. Your profile and login stay intact."
        confirmLabel="Clear everything"
        busy={busy}
        onConfirm={runClear}
        onClose={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        text="This removes your profile and all financial data. This action cannot be undone."
        confirmLabel="Delete account"
        busy={busy}
        onConfirm={runDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
