import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
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
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { shortDate } from '../lib/format'
import type { Client, ClientStatus, ClientType } from '../types'

const TYPES: ClientType[] = ['Buyer', 'Seller', 'Investor', 'Tenant']

type Form = {
  name: string
  email: string
  phone: string
  type: ClientType
  status: ClientStatus
  city: string
  budget: string
  deals: string
}

const blank: Form = {
  name: '',
  email: '',
  phone: '',
  type: 'Buyer',
  status: 'lead',
  city: '',
  budget: '',
  deals: '0',
}

const STATUS_TONE: Record<ClientStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  lead: 'warning',
  closed: 'neutral',
}

export function Clients() {
  const { data, money, addClient, updateClient, deleteClient } = useApp()
  const [filter, setFilter] = useState<'all' | ClientStatus>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.clients.filter((client) => {
      if (filter !== 'all' && client.status !== filter) return false
      if (!needle) return true
      return `${client.name} ${client.email} ${client.city} ${client.type}`
        .toLowerCase()
        .includes(needle)
    })
  }, [data.clients, filter, query])

  const totalBudget = visible.reduce((sum, client) => sum + client.budget, 0)

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setError('')
    setOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditing(client)
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      status: client.status,
      city: client.city,
      budget: String(client.budget),
      deals: String(client.deals),
    })
    setError('')
    setOpen(true)
  }

  const submit = () => {
    if (form.name.trim().length < 2) {
      setError('Enter the client’s full name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid email address.')
      return
    }
    const budget = Number(form.budget)
    const deals = Number(form.deals)
    if (!Number.isFinite(budget) || budget < 0) {
      setError('Budget must be a positive number.')
      return
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      type: form.type,
      status: form.status,
      city: form.city.trim() || 'Unassigned',
      budget: Number.isFinite(budget) ? budget : 0,
      deals: Number.isFinite(deals) ? deals : 0,
    }
    if (editing) updateClient(editing.id, payload)
    else addClient(payload)
    setOpen(false)
    setEditing(null)
    setError('')
  }

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        subtitle="Buyers, sellers and investors working with the agency."
        actions={
          <Btn icon={<Plus size={16} />} onClick={openCreate}>
            Add client
          </Btn>
        }
      />

      <Panel tone="glass" className="toolbar-panel" title="Client book" subtitle={`${visible.length} contacts · ${money(totalBudget, true)} combined budget`}>
        <div className="toolbar">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: data.clients.length },
              { value: 'active', label: 'Active', count: data.clients.filter((c) => c.status === 'active').length },
              { value: 'lead', label: 'Leads', count: data.clients.filter((c) => c.status === 'lead').length },
              { value: 'closed', label: 'Closed', count: data.clients.filter((c) => c.status === 'closed').length },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, city or type…" />
        </div>

        {visible.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Budget</th>
                  <th>Deals</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={client.name} hue={client.hue} size={34} />
                        <div>
                          <strong>{client.name}</strong>
                          <small>{client.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{client.type}</td>
                    <td>{client.city}</td>
                    <td className="cell-strong">{money(client.budget, true)}</td>
                    <td>{client.deals}</td>
                    <td>{shortDate(client.joinedAt)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[client.status]}>{client.status}</Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn sm"
                          aria-label={`Edit ${client.name}`}
                          onClick={() => openEdit(client)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn sm danger"
                          aria-label={`Delete ${client.name}`}
                          onClick={() => setPendingDelete(client)}
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
            icon={<UserRound size={22} />}
            title="No clients yet"
            text="Add your first buyer or seller to start tracking the relationship."
            action={
              <Btn icon={<Plus size={16} />} onClick={openCreate}>
                Add client
              </Btn>
            }
          />
        )}
      </Panel>

      <Modal
        open={open}
        title={editing ? 'Edit client' : 'Add client'}
        subtitle="Contact details and acquisition budget."
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={submit}>{editing ? 'Save changes' : 'Add client'}</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Full name" hint={error || undefined}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 555 0142"
            />
          </Field>
          <Field label="City">
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Lisbon"
            />
          </Field>
          <Field label="Client type">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
            >
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Budget">
            <input
              className="input"
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="450000"
            />
          </Field>
          <Field label="Completed deals">
            <input
              className="input"
              type="number"
              min="0"
              value={form.deals}
              onChange={(e) => setForm({ ...form, deals: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete client"
        message={pendingDelete ? `${pendingDelete.name} will be removed from the client book.` : ''}
        onConfirm={() => pendingDelete && deleteClient(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
