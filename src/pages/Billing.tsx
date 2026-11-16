import { useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Download, Receipt, Trash2 } from 'lucide-react'
import {
  Badge,
  Btn,
  EmptyState,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
} from '../components/UI'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { downloadFile } from '../lib/export'
import { shortDate } from '../lib/format'
import type { Invoice, InvoiceStatus } from '../types'

const TONE: Record<InvoiceStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  due: 'warning',
  overdue: 'danger',
}

export function Billing() {
  const { data, money, setInvoiceStatus, deleteInvoice } = useApp()
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...data.invoices]
      .filter((invoice) => (filter === 'all' ? true : invoice.status === filter))
      .filter((invoice) =>
        needle ? `${invoice.number} ${invoice.client} ${invoice.plan}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => +new Date(b.issued) - +new Date(a.issued))
  }, [data.invoices, filter, query])

  const paid = data.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const due = data.invoices.filter((i) => i.status === 'due').reduce((s, i) => s + i.amount, 0)
  const overdue = data.invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  const exportInvoices = () => {
    const rows = [
      ['Number', 'Client', 'Plan', 'Amount', 'Status', 'Issued', 'Due'],
      ...data.invoices.map((i) => [
        i.number,
        i.client,
        i.plan,
        String(i.amount),
        i.status,
        i.issued.slice(0, 10),
        i.due.slice(0, 10),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadFile('vantage-invoices.csv', csv, 'text/csv')
  }

  return (
    <>
      <PageHeader
        eyebrow="Revenue operations"
        title="Billing"
        subtitle="Subscriptions and invoices for agency accounts."
        actions={
          <Btn variant="dark" icon={<Download size={16} />} onClick={exportInvoices}>
            Export
          </Btn>
        }
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-light">
          <p className="stat-label">Collected</p>
          <strong className="stat-value">{money(paid, true)}</strong>
          <p className="stat-hint">{data.invoices.filter((i) => i.status === 'paid').length} paid invoices</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Awaiting payment</p>
          <strong className="stat-value">{money(due, true)}</strong>
          <p className="stat-hint">{data.invoices.filter((i) => i.status === 'due').length} open invoices</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Overdue</p>
          <strong className="stat-value">{money(overdue, true)}</strong>
          <p className="stat-hint">{data.invoices.filter((i) => i.status === 'overdue').length} past due</p>
        </div>
      </div>

      <Panel
        tone="glass"
        title="Invoices"
        subtitle={`${visible.length} documents`}
        actions={
          <div className="toolbar-inline">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: data.invoices.length },
                { value: 'paid', label: 'Paid' },
                { value: 'due', label: 'Due' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search invoice or client…" />
          </div>
        }
      >
        {visible.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="align-right">Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="cell-strong">{invoice.number}</td>
                    <td>{invoice.client}</td>
                    <td>{invoice.plan}</td>
                    <td>{shortDate(invoice.issued)}</td>
                    <td>{shortDate(invoice.due)}</td>
                    <td>
                      <Badge tone={TONE[invoice.status]}>{invoice.status}</Badge>
                    </td>
                    <td className="align-right cell-strong">{money(invoice.amount)}</td>
                    <td>
                      <div className="row-actions">
                        {invoice.status !== 'paid' ? (
                          <button
                            className="icon-btn sm"
                            aria-label={`Mark ${invoice.number} paid`}
                            onClick={() => setInvoiceStatus(invoice.id, 'paid')}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        ) : null}
                        <button
                          className="icon-btn sm danger"
                          aria-label={`Delete ${invoice.number}`}
                          onClick={() => setPendingDelete(invoice)}
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
            icon={<Receipt size={22} />}
            title="No invoices here"
            text="Invoices matching this filter will appear in this list."
          />
        )}
      </Panel>

      <Panel tone="glass" title="Plans in use" subtitle="Active subscription tiers">
        <div className="plan-grid">
          {[
            { name: 'Agency', price: 149, blurb: 'Up to 50 listings, 5 seats', tone: 'light' },
            { name: 'Growth', price: 349, blurb: 'Unlimited listings, 15 seats', tone: 'light' },
            { name: 'Enterprise', price: 899, blurb: 'Multi-branch, SSO, SLA', tone: 'dark' },
          ].map((plan) => (
            <article key={plan.name} className={`plan-card plan-${plan.tone}`}>
              <header>
                <CreditCard size={18} />
                <span>{plan.name}</span>
              </header>
              <strong>
                {money(plan.price)}
                <small>/mo</small>
              </strong>
              <p>{plan.blurb}</p>
              <span className="plan-tag">
                {data.invoices.filter((i) => i.plan === plan.name).length} invoices
              </span>
            </article>
          ))}
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete invoice"
        message={pendingDelete ? `${pendingDelete.number} will be removed permanently.` : ''}
        onConfirm={() => pendingDelete && deleteInvoice(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
