import type {
  AdminUser,
  AppData,
  AppNotification,
  Invoice,
  Property,
  PropertyKind,
  Task,
  Ticket,
  UserStatus,
} from '../types'
import { isOverdue } from './format'

export interface MonthPoint {
  key: string
  label: string
  income: number
  expense: number
  net: number
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function lastMonthKeys(count: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      label: MONTHS_SHORT[d.getMonth()],
    })
  }
  return out
}

function keyOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

export function revenueSeries(data: AppData, count = 9): MonthPoint[] {
  const months = lastMonthKeys(count)
  return months.map(({ key, label }) => {
    let income = 0
    let expense = 0
    for (const entry of data.finance) {
      if (keyOf(entry.date) !== key) continue
      if (entry.type === 'income') income += entry.amount
      else expense += entry.amount
    }
    return { key, label, income, expense, net: income - expense }
  })
}

export function currentMonth(data: AppData): MonthPoint {
  const series = revenueSeries(data, 1)
  return series[0] ?? { key: '', label: '', income: 0, expense: 0, net: 0 }
}

export function previousMonth(data: AppData): MonthPoint {
  const series = revenueSeries(data, 2)
  return series[0] ?? { key: '', label: '', income: 0, expense: 0, net: 0 }
}

export function growth(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export interface PropertyStats {
  total: number
  pending: number
  approved: number
  rejected: number
  activeListings: number
  portfolioValue: number
  averagePrice: number
  pendingValue: number
  featured: number
  views: number
}

export function propertyStats(data: AppData): PropertyStats {
  const stats: PropertyStats = {
    total: data.properties.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    activeListings: 0,
    portfolioValue: 0,
    averagePrice: 0,
    pendingValue: 0,
    featured: 0,
    views: 0,
  }
  for (const p of data.properties) {
    stats.views += p.views
    if (p.featured) stats.featured += 1
    if (p.status === 'pending') {
      stats.pending += 1
      stats.pendingValue += p.price
    }
    if (p.status === 'approved') {
      stats.approved += 1
      stats.portfolioValue += p.price
    }
    if (p.status === 'rejected') stats.rejected += 1
  }
  stats.activeListings = stats.approved
  stats.averagePrice = stats.total ? Math.round(stats.portfolioValue / Math.max(stats.approved, 1)) : 0
  return stats
}

export interface UserStats {
  total: number
  active: number
  invited: number
  suspended: number
  byStatus: Record<UserStatus, number>
  admins: number
}

export function userStats(data: AppData): UserStats {
  const byStatus: Record<UserStatus, number> = { active: 0, invited: 0, suspended: 0 }
  let admins = 0
  for (const u of data.users) {
    byStatus[u.status] += 1
    if (u.role === 'Super Admin' || u.role === 'Admin') admins += 1
  }
  return {
    total: data.users.length,
    active: byStatus.active,
    invited: byStatus.invited,
    suspended: byStatus.suspended,
    byStatus,
    admins,
  }
}

export interface Slice {
  label: string
  value: number
  color: string
}

const KIND_COLORS: Record<PropertyKind, string> = {
  Apartment: '#17C3B2',
  House: '#4C8DFF',
  Villa: '#8B7CF6',
  Penthouse: '#F2A93B',
  Office: '#31C48D',
  Land: '#7B8FA3',
}

export function kindSplit(properties: Property[]): Slice[] {
  const map = new Map<PropertyKind, number>()
  for (const p of properties) map.set(p.kind, (map.get(p.kind) ?? 0) + 1)
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, color: KIND_COLORS[label] }))
    .sort((a, b) => b.value - a.value)
}

export function statusSplit(properties: Property[]): Slice[] {
  const pending = properties.filter((p) => p.status === 'pending').length
  const approved = properties.filter((p) => p.status === 'approved').length
  const rejected = properties.filter((p) => p.status === 'rejected').length
  return [
    { label: 'Approved', value: approved, color: '#31C48D' },
    { label: 'Pending', value: pending, color: '#F2A93B' },
    { label: 'Rejected', value: rejected, color: '#F2665E' },
  ]
}

export function topAgents(data: AppData) {
  return [...data.team].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}

export function financeTotals(data: AppData) {
  const income = data.finance.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0)
  const expense = data.finance.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  return { income, expense, net: income - expense }
}

export function invoiceTotals(invoices: Invoice[]) {
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const due = invoices.filter((i) => i.status === 'due').reduce((s, i) => s + i.amount, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  return { paid, due, overdue, outstanding: due + overdue, mrr: due + paid }
}

export function taskStats(tasks: Task[]) {
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    progress: tasks.filter((t) => t.status === 'progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => t.status !== 'done' && isOverdue(t.due)).length,
  }
}

export function ticketStats(tickets: Ticket[]) {
  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }
}

export function activeUsers(users: AdminUser[]): number {
  return users.filter((u) => u.status === 'active').length
}

/**
 * Notifications are derived from live data, so they always reflect the real
 * state of the workspace instead of a hardcoded list.
 */
export function buildNotifications(data: AppData): AppNotification[] {
  const items: AppNotification[] = []
  const pending = data.properties.filter((p) => p.status === 'pending')
  if (pending.length) {
    items.push({
      id: `pending-${pending.length}`,
      title: `${pending.length} listings awaiting review`,
      body: 'The moderation queue has new submissions ready for a decision.',
      at: pending[0].submittedAt,
      tone: 'warning',
      href: '/moderation',
    })
  }

  const overdue = data.invoices.filter((i) => i.status === 'overdue')
  if (overdue.length) {
    items.push({
      id: `overdue-${overdue.length}`,
      title: `${overdue.length} overdue invoices`,
      body: 'Outstanding balances need a follow-up from the finance desk.',
      at: overdue[0].due,
      tone: 'danger',
      href: '/billing',
    })
  }

  const urgent = data.tickets.filter((t) => t.status === 'open' && (t.priority === 'Urgent' || t.priority === 'High'))
  if (urgent.length) {
    items.push({
      id: `tickets-${urgent.length}`,
      title: `${urgent.length} high-priority support tickets`,
      body: 'Support requests are waiting for a first response.',
      at: urgent[0].createdAt,
      tone: 'info',
      href: '/support',
    })
  }

  const lateTasks = data.tasks.filter((t) => t.status !== 'done' && isOverdue(t.due))
  if (lateTasks.length) {
    items.push({
      id: `tasks-${lateTasks.length}`,
      title: `${lateTasks.length} tasks past their due date`,
      body: 'Review the task board to reassign or reschedule.',
      at: lateTasks[0].due,
      tone: 'warning',
      href: '/tasks',
    })
  }

  const latest = data.activity[0]
  if (latest) {
    items.push({
      id: `activity-${latest.id}`,
      title: 'Workspace activity',
      body: `${latest.actor} ${latest.action} ${latest.target}.`,
      at: latest.at,
      tone: 'success',
      href: '/activity',
    })
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}
