import { useMemo, useState } from 'react'
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react'
import {
  Avatar,
  Badge,
  Btn,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
  Toggle,
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { userStats } from '../lib/analytics'
import { shortDate } from '../lib/format'
import type { AdminRole, AdminUser, Permission, UserStatus } from '../types'

const ROLES: AdminRole[] = ['Super Admin', 'Admin', 'Moderator', 'Agent', 'Analyst']
const PERMISSIONS: Permission[] = ['properties', 'moderation', 'users', 'finance', 'support', 'settings']

type Form = {
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  department: string
  permissions: Permission[]
  twoFactor: boolean
}

const blank: Form = {
  name: '',
  email: '',
  role: 'Agent',
  status: 'invited',
  department: 'Sales',
  permissions: ['properties'],
  twoFactor: false,
}

const STATUS_TONE: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
}

export function Users() {
  const { data, addUser, updateUser, deleteUser, setUserStatus } = useApp()
  const [filter, setFilter] = useState<'all' | UserStatus>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)

  const stats = userStats(data)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.users.filter((user) => {
      if (filter !== 'all' && user.status !== filter) return false
      if (!needle) return true
      return `${user.name} ${user.email} ${user.role} ${user.department}`
        .toLowerCase()
        .includes(needle)
    })
  }, [data.users, filter, query])

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setError('')
    setOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      permissions: user.permissions,
      twoFactor: user.twoFactor,
    })
    setError('')
    setOpen(true)
  }

  const submit = () => {
    if (form.name.trim().length < 2) {
      setError('Enter the team member’s full name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid work email address.')
      return
    }
    const payload = { ...form, name: form.name.trim(), email: form.email.trim() }
    if (editing) updateUser(editing.id, payload)
    else addUser(payload)
    setOpen(false)
    setEditing(null)
    setError('')
  }

  const togglePermission = (permission: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Access control"
        title="Users & Access"
        subtitle="Team accounts, roles and workspace permissions."
        actions={
          <Btn icon={<Plus size={16} />} onClick={openCreate}>
            Invite user
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-light">
          <span className="stat-icon" style={{ background: '#31C48D22', color: '#1E9E6E' }}>
            <UserCheck size={19} />
          </span>
          <p className="stat-label">Active accounts</p>
          <strong className="stat-value">{stats.active}</strong>
          <p className="stat-hint">{stats.admins} with admin rights</p>
        </div>
        <div className="stat-card stat-light">
          <span className="stat-icon" style={{ background: '#F2A93B22', color: '#B87B12' }}>
            <KeyRound size={19} />
          </span>
          <p className="stat-label">Pending invites</p>
          <strong className="stat-value">{stats.invited}</strong>
          <p className="stat-hint">Awaiting first sign-in</p>
        </div>
        <div className="stat-card stat-light">
          <span className="stat-icon" style={{ background: '#E5484D22', color: '#C13237' }}>
            <UserX size={19} />
          </span>
          <p className="stat-label">Suspended</p>
          <strong className="stat-value">{stats.suspended}</strong>
          <p className="stat-hint">Access revoked</p>
        </div>
      </div>

      <Panel tone="glass" className="toolbar-panel" title="Workspace members" subtitle={`${visible.length} accounts`}>
        <div className="toolbar">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: stats.total },
              { value: 'active', label: 'Active', count: stats.active },
              { value: 'invited', label: 'Invited', count: stats.invited },
              { value: 'suspended', label: 'Suspended', count: stats.suspended },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or role…" />
        </div>

        {visible.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Permissions</th>
                  <th>Last active</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={user.name} hue={user.hue} size={34} />
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={user.role === 'Super Admin' ? 'accent' : 'neutral'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>{user.department}</td>
                    <td>
                      <div className="perm-row">
                        {user.permissions.slice(0, 3).map((p) => (
                          <span className="perm-chip" key={p}>
                            {p}
                          </span>
                        ))}
                        {user.permissions.length > 3 ? (
                          <span className="perm-chip">+{user.permissions.length - 3}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{shortDate(user.lastActive)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn sm"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn sm"
                          aria-label={`${user.status === 'suspended' ? 'Activate' : 'Suspend'} ${user.name}`}
                          onClick={() =>
                            setUserStatus(user.id, user.status === 'suspended' ? 'active' : 'suspended')
                          }
                        >
                          {user.status === 'suspended' ? <UserCheck size={15} /> : <UserX size={15} />}
                        </button>
                        <button
                          className="icon-btn sm danger"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => setPendingDelete(user)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="No accounts match"
            text="Try another search term or filter."
            action={
              <Btn variant="soft" onClick={() => setQuery('')}>
                Clear search
              </Btn>
            }
          />
        )}
      </Panel>

      <Modal
        open={open}
        title={editing ? 'Edit member' : 'Invite member'}
        subtitle={editing ? 'Update role and permissions.' : 'Send access to a new team account.'}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>{editing ? 'Save changes' : 'Send invite'}</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Full name" hint={error || undefined}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Noor Haddad"
            />
          </Field>
          <Field label="Work email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="noor@vantage.estate"
            />
          </Field>
          <Field label="Role">
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {['Sales', 'Moderation', 'Finance', 'Support', 'Engineering', 'Leadership'].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
            >
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <Field label="Permissions" wide>
            <div className="perm-picker">
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className={`perm-option ${form.permissions.includes(permission) ? 'is-on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </Field>
          <div className="field-wide">
            <Toggle
              checked={form.twoFactor}
              onChange={(next) => setForm({ ...form, twoFactor: next })}
              label="Require two-factor authentication"
              description="Enforce an authenticator code at every sign-in."
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove member"
        message={pendingDelete ? `${pendingDelete.name} will lose access to the workspace.` : ''}
        confirmLabel="Remove"
        onConfirm={() => pendingDelete && deleteUser(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
