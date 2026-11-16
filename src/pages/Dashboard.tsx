import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Headphones,
  Megaphone,
  Plus,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Avatar, Badge, Btn, Panel, PageHeader, Segmented, StatCard } from '../components/UI'
import { AreaChart, BarChart, Donut, Gauge } from '../components/Charts'
import { PropertyCard } from '../components/PropertyCard'
import { PropertyFormModal, PropertyReviewModal } from '../components/PropertyModal'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import {
  currentMonth,
  growth,
  kindSplit,
  lastMonthKeys,
  previousMonth,
  propertyStats,
  revenueSeries,
  statusSplit,
  userStats,
} from '../lib/analytics'
import { downloadJson } from '../lib/export'
import { shortDate } from '../lib/format'
import type { ActivityType, Property } from '../types'

const ACTIVITY_ICON: Record<ActivityType, typeof Building2> = {
  property: Building2,
  user: Users,
  finance: Wallet,
  task: CheckCircle2,
  support: Headphones,
  system: Server,
  announcement: Megaphone,
}

export function Dashboard() {
  const { data, money, deleteProperty } = useApp()
  const [range, setRange] = useState<'6' | '9' | '12'>('9')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [reviewing, setReviewing] = useState<Property | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null)

  const stats = propertyStats(data)
  const users = userStats(data)
  const series = revenueSeries(data, Number(range))
  const month = currentMonth(data)
  const previous = previousMonth(data)
  const revenueGrowth = growth(month.income, previous.income)
  const approvalRate = stats.total ? Math.round((stats.approved / stats.total) * 100) : 0

  const submissionSpark = lastMonthKeys(6).map(
    ({ key }) => data.properties.filter((p) => p.submittedAt.slice(0, 7) === key).length,
  )
  const userSpark = lastMonthKeys(6).map(
    ({ key }) => data.users.filter((u) => u.lastActive.slice(0, 7) === key).length + 1,
  )

  const queue = data.properties
    .filter((p) => p.status === 'pending')
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 3)

  const team = [...data.team].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const openTasks = data.tasks.filter((t) => t.status !== 'done').length
  const openTickets = data.tickets.filter((t) => t.status !== 'resolved').length

  const exportReport = () => {
    downloadJson('vantage-overview-report.json', {
      generatedAt: new Date().toISOString(),
      propertyStats: stats,
      userStats: users,
      revenue: series,
      currentMonth: month,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace overview"
        title="Dashboard"
        subtitle="Portfolio performance, moderation queue and revenue in one place."
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: '6', label: '6M' },
                { value: '9', label: '9M' },
                { value: '12', label: '12M' },
              ]}
            />
            <Btn variant="ghost" icon={<Download size={16} />} onClick={exportReport}>
              Export
            </Btn>
            <Btn
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add listing
            </Btn>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Total properties"
          value={String(stats.total)}
          delta={growth(stats.total, Math.max(1, stats.total - 3))}
          hint={`${stats.featured} featured · ${stats.rejected} rejected`}
          icon={<Building2 size={19} />}
          spark={submissionSpark}
        />
        <StatCard
          label="Pending approvals"
          value={String(stats.pending)}
          hint={`${money(stats.pendingValue, true)} awaiting review`}
          icon={<Clock3 size={19} />}
          accent="#F2A93B"
        />
        <StatCard
          label="Active listings"
          value={String(stats.activeListings)}
          hint={`${money(stats.portfolioValue, true)} portfolio value`}
          icon={<TrendingUp size={19} />}
          accent="#4C8DFF"
        />
        <StatCard
          label="Total users"
          value={String(users.total)}
          hint={`${users.active} active · ${users.admins} admins`}
          icon={<Users size={19} />}
          accent="#8B7CF6"
          spark={userSpark}
        />
      </div>

      <div className="grid grid-2-1">
        <Panel
          title="Revenue performance"
          subtitle={`${range} month trend of recorded income`}
          action={
            <Badge tone={revenueGrowth >= 0 ? 'success' : 'danger'}>
              {revenueGrowth >= 0 ? '+' : ''}
              {revenueGrowth.toFixed(1)}% MoM
            </Badge>
          }
        >
          <div className="revenue-head">
            <div>
              <span className="kpi-label">Income this month</span>
              <strong className="kpi-value">{money(month.income)}</strong>
            </div>
            <div>
              <span className="kpi-label">Net</span>
              <strong className={`kpi-value ${month.net >= 0 ? 'pos' : 'neg'}`}>
                {money(month.net)}
              </strong>
            </div>
            <div>
              <span className="kpi-label">Expenses</span>
              <strong className="kpi-value">{money(month.expense)}</strong>
            </div>
          </div>
          <AreaChart
            data={series.map((m) => ({ label: m.label, value: m.income }))}
            format={(v) => money(v, true)}
            height={230}
          />
        </Panel>

        <Panel title="Moderation health" subtitle="Approval rate across the portfolio" tone="glass">
          <div className="gauge-block">
            <Gauge value={approvalRate} label="approved" sub={`${stats.approved}/${stats.total} listings`} />
          </div>
          <ul className="mini-list">
            <li>
              <span className="dot dot-success" /> Approved
              <strong>{stats.approved}</strong>
            </li>
            <li>
              <span className="dot dot-warning" /> Pending
              <strong>{stats.pending}</strong>
            </li>
            <li>
              <span className="dot dot-danger" /> Rejected
              <strong>{stats.rejected}</strong>
            </li>
          </ul>
          <Link className="panel-link" to="/moderation">
            Open moderation <ArrowUpRight size={15} />
          </Link>
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel title="Income vs expenses" subtitle="Cash flow recorded in the workspace">
          <BarChart
            data={series.map((m) => ({ label: m.label, a: m.income, b: m.expense }))}
            format={(v) => money(v, true)}
          />
        </Panel>

        <Panel title="Portfolio mix" subtitle="Listings by property type">
          <div className="split-row">
            <Donut
              slices={kindSplit(data.properties)}
              centerLabel="listings"
              centerValue={String(stats.total)}
            />
            <div className="split-side">
              <Donut
                slices={statusSplit(data.properties)}
                size={132}
                thickness={16}
                centerLabel="status"
                centerValue={`${approvalRate}%`}
              />
              <div className="split-notes">
                <span>
                  <strong>{openTasks}</strong> open tasks
                </span>
                <span>
                  <strong>{openTickets}</strong> open tickets
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-2-1">
        <Panel
          title="Awaiting moderation"
          subtitle="Newest submissions needing a decision"
          action={
            <Link className="panel-link inline" to="/moderation">
              View all <ArrowUpRight size={14} />
            </Link>
          }
        >
          {queue.length ? (
            <div className="prop-grid prop-grid-tight">
              {queue.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onReview={setReviewing}
                  onEdit={(p) => {
                    setEditing(p)
                    setFormOpen(true)
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              <CheckCircle2 size={20} />
              <div>
                <strong>Queue is clear</strong>
                <p>Every submitted listing has been reviewed.</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Recent activity" subtitle="Latest workspace events" tone="glass">
          <ul className="activity-feed">
            {data.activity.slice(0, 6).map((entry) => {
              const Icon = ACTIVITY_ICON[entry.type] ?? ShieldAlert
              return (
                <li key={entry.id}>
                  <span className={`feed-icon feed-${entry.type}`}>
                    <Icon size={15} />
                  </span>
                  <div className="feed-text">
                    <p>
                      <strong>{entry.actor}</strong> {entry.action}{' '}
                      <span className="feed-target">{entry.target}</span>
                    </p>
                    <small>{shortDate(entry.at)}</small>
                  </div>
                </li>
              )
            })}
          </ul>
          <Link className="panel-link" to="/activity">
            Full activity log <ArrowUpRight size={15} />
          </Link>
        </Panel>
      </div>

      <Panel title="Top performing agents" subtitle="Ranked by closed revenue">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Role</th>
                <th>Deals</th>
                <th>Revenue</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={member.name} hue={member.hue} size={34} />
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{member.role}</td>
                  <td>{member.deals}</td>
                  <td className="cell-strong">{money(member.revenue, true)}</td>
                  <td>
                    <Badge tone={member.rating >= 4.5 ? 'success' : 'neutral'}>
                      {member.rating.toFixed(1)} ★
                    </Badge>
                  </td>
                  <td>
                    <span className={`presence presence-${member.presence}`}>
                      {member.presence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>
            <CreditCard size={14} /> {data.invoices.filter((i) => i.status === 'paid').length} paid
            invoices
          </span>
          <Link className="panel-link inline" to="/reports">
            Full reports <ArrowUpRight size={14} />
          </Link>
        </div>
      </Panel>

      <PropertyFormModal
        open={formOpen}
        property={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
      <PropertyReviewModal property={reviewing} onClose={() => setReviewing(null)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete listing"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed permanently.` : ''}
        onConfirm={() => pendingDelete && deleteProperty(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
