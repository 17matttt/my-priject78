import { categoryById, eventKind } from './constants'
import type {
  CalendarEvent,
  Goal,
  MonthBudget,
  Subscription,
  Transaction,
  VaultData,
} from './types'
import {
  addDays,
  addMonthsToIso,
  daysBetween,
  formatMonth,
  monthKeyOf,
  monthShort,
  rangeStart,
  todayIso,
  type RangeKey,
} from './format'

export interface Totals {
  income: number
  expense: number
  net: number
}

export function totalsFor(txs: Transaction[], from: string, to: string): Totals {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.date < from || t.date > to) continue
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

export function monthTotals(txs: Transaction[], month: string): Totals {
  return totalsFor(txs, `${month}-01`, `${month}-31`)
}

export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return expense > 0 ? -100 : 0
  return ((income - expense) / income) * 100
}

export interface CategorySlice {
  id: string
  label: string
  color: string
  icon: string
  value: number
  percent: number
}

export function categoryBreakdown(
  txs: Transaction[],
  from: string,
  to: string,
  type: 'expense' | 'income' = 'expense',
): CategorySlice[] {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== type) continue
    if (t.date < from || t.date > to) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()]
    .map(([id, value]) => {
      const cat = categoryById(id)
      return {
        id,
        label: cat.label,
        color: cat.color,
        icon: cat.icon,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
      }
    })
    .sort((a, b) => b.value - a.value)
}

export interface FlowPoint {
  key: string
  label: string
  income: number
  expense: number
  net: number
}

export function flowSeries(txs: Transaction[], range: RangeKey): FlowPoint[] {
  const from = rangeStart(range)
  const to = todayIso()
  const useDays = range === '7d' || range === '30d'
  const buckets = new Map<string, FlowPoint>()

  if (useDays) {
    const count = range === '7d' ? 7 : 30
    for (let i = count - 1; i >= 0; i--) {
      const iso = addDays(to, -i)
      buckets.set(iso, { key: iso, label: iso.slice(8, 10), income: 0, expense: 0, net: 0 })
    }
  } else {
    const months = range === '3m' ? 3 : range === '6m' ? 6 : 12
    for (let i = months - 1; i >= 0; i--) {
      const key = addMonthsToIso(`${to.slice(0, 7)}-01`, -i).slice(0, 7)
      buckets.set(key, { key, label: monthShort(key), income: 0, expense: 0, net: 0 })
    }
  }

  for (const t of txs) {
    if (t.date < from || t.date > to) continue
    const key = useDays ? t.date : monthKeyOf(t.date)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (t.type === 'income') bucket.income += t.amount
    else bucket.expense += t.amount
    bucket.net = bucket.income - bucket.expense
  }

  return [...buckets.values()]
}

export interface BalancePoint {
  key: string
  label: string
  value: number
}

export function balanceSeries(txs: Transaction[], range: RangeKey): BalancePoint[] {
  const from = rangeStart(range)
  const to = todayIso()
  const startBalance = txs
    .filter((t) => t.date < from)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)

  const useDays = range === '7d' || range === '30d'
  const ordered = [...txs]
    .filter((t) => t.date >= from && t.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))

  const points: BalancePoint[] = []
  if (useDays) {
    const count = range === '7d' ? 7 : 30
    let running = startBalance
    let cursor = 0
    for (let i = count - 1; i >= 0; i--) {
      const iso = addDays(to, -i)
      while (cursor < ordered.length && ordered[cursor].date <= iso) {
        const t = ordered[cursor]
        running += t.type === 'income' ? t.amount : -t.amount
        cursor++
      }
      points.push({ key: iso, label: iso.slice(8, 10), value: running })
    }
    return points
  }

  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    keys.push(addMonthsToIso(`${to.slice(0, 7)}-01`, -i).slice(0, 7))
  }
  let running = startBalance
  for (const month of keys) {
    const monthEnd = month === to.slice(0, 7) ? to : `${month}-31`
    for (const t of ordered) {
      if (monthKeyOf(t.date) === month && t.date <= monthEnd) {
        running += t.type === 'income' ? t.amount : -t.amount
      }
    }
    points.push({ key: month, label: monthShort(month), value: running })
  }
  return points
}

export function monthlyHistory(txs: Transaction[], months: number): FlowPoint[] {
  const to = todayIso()
  const points: FlowPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonthsToIso(`${to.slice(0, 7)}-01`, -i).slice(0, 7)
    const totals = monthTotals(txs, key)
    points.push({
      key,
      label: monthShort(key),
      income: totals.income,
      expense: totals.expense,
      net: totals.net,
    })
  }
  return points
}

export function averageDailySpend(txs: Transaction[], from: string, to: string): number {
  const days = Math.max(1, daysBetween(from, to) + 1)
  const { expense } = totalsFor(txs, from, to)
  return expense / days
}

export function biggestExpenses(txs: Transaction[], from: string, to: string, limit = 5): Transaction[] {
  return txs
    .filter((t) => t.type === 'expense' && t.date >= from && t.date <= to)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export interface BudgetLine {
  category: string
  label: string
  color: string
  icon: string
  budget: number
  spent: number
  remaining: number
  percent: number
  state: 'ok' | 'warn' | 'over'
}

export interface BudgetStatus {
  month: string
  overallBudget: number
  overallSpent: number
  overallRemaining: number
  overallPercent: number
  overallState: 'ok' | 'warn' | 'over'
  lines: BudgetLine[]
  unallocated: number
}

function budgetState(percent: number): 'ok' | 'warn' | 'over' {
  if (percent >= 100) return 'over'
  if (percent >= 80) return 'warn'
  return 'ok'
}

export function budgetStatus(
  budget: MonthBudget | undefined,
  txs: Transaction[],
  month: string,
): BudgetStatus {
  const monthExpenses = txs.filter((t) => t.type === 'expense' && monthKeyOf(t.date) === month)
  const spentByCategory = new Map<string, number>()
  for (const t of monthExpenses) {
    spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + t.amount)
  }
  const overallSpent = monthExpenses.reduce((s, t) => s + t.amount, 0)
  const overallBudget = budget?.overall ?? 0
  const overallPercent = overallBudget > 0 ? (overallSpent / overallBudget) * 100 : 0

  const lines: BudgetLine[] = Object.entries(budget?.categories ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const cat = categoryById(category)
      const spent = spentByCategory.get(category) ?? 0
      const percent = amount > 0 ? (spent / amount) * 100 : 0
      return {
        category,
        label: cat.label,
        color: cat.color,
        icon: cat.icon,
        budget: amount,
        spent,
        remaining: amount - spent,
        percent,
        state: budgetState(percent),
      }
    })
    .sort((a, b) => b.percent - a.percent)

  const allocated = lines.reduce((s, l) => s + l.budget, 0)

  return {
    month,
    overallBudget,
    overallSpent,
    overallRemaining: overallBudget - overallSpent,
    overallPercent,
    overallState: budgetState(overallPercent),
    lines,
    unallocated: Math.max(0, overallBudget - allocated),
  }
}

export interface GoalProjection {
  percent: number
  remaining: number
  monthsLeft: number | null
  requiredMonthly: number | null
  pace: number
  estimatedDate: string | null
  state: 'done' | 'ahead' | 'on-track' | 'behind' | 'no-pace'
}

export function goalProjection(goal: Goal, today = todayIso()): GoalProjection {
  const percent = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0
  const remaining = Math.max(0, goal.target - goal.saved)
  const monthsLeft = goal.deadline ? Math.max(0, Math.ceil(daysBetween(today, goal.deadline) / 30.4)) : null

  const deposits = goal.contributions.filter((c) => c.amount > 0)
  let pace = 0
  if (deposits.length >= 1) {
    const first = deposits.map((c) => c.date).sort()[0]
    const spanDays = Math.max(1, daysBetween(first, today))
    const totalDeposited = deposits.reduce((s, c) => s + c.amount, 0)
    pace = (totalDeposited / spanDays) * 30.4
  }

  const requiredMonthly =
    monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : remaining > 0 ? remaining : 0

  let estimatedDate: string | null = null
  if (remaining === 0) estimatedDate = today
  else if (pace > 0) {
    const months = Math.ceil(remaining / pace)
    estimatedDate = addMonthsToIso(today, months)
  }

  let state: GoalProjection['state'] = 'no-pace'
  if (remaining === 0) state = 'done'
  else if (pace > 0 && goal.deadline) {
    const monthsToDeadline = Math.max(0, Math.ceil(daysBetween(today, goal.deadline) / 30.4))
    if (pace >= requiredMonthly) state = 'on-track'
    else state = monthsToDeadline > 0 ? 'behind' : 'behind'
  } else if (pace > 0) state = 'ahead'

  return { percent, remaining, monthsLeft, requiredMonthly, pace, estimatedDate, state }
}

export interface SubscriptionTotals {
  monthly: number
  annual: number
  activeCount: number
  next30: { sub: Subscription; date: string; days: number }[]
}

export function monthlyCostOf(sub: Subscription): number {
  return sub.cycle === 'monthly' ? sub.amount : sub.amount / 12
}

export function subscriptionTotals(subs: Subscription[], today = todayIso()): SubscriptionTotals {
  const active = subs.filter((s) => s.active)
  const monthly = active.reduce((sum, s) => sum + monthlyCostOf(s), 0)
  const next30 = active
    .map((sub) => {
      const date = nextOccurrence(sub.nextPayment, sub.cycle === 'monthly' ? 'monthly' : 'yearly', today)
      return { sub, date, days: daysBetween(today, date) }
    })
    .filter((x) => x.days <= 30)
    .sort((a, b) => a.days - b.days)
  return { monthly, annual: monthly * 12, activeCount: active.length, next30 }
}

export function occurrencesBetween(
  startIso: string,
  recurrence: 'weekly' | 'monthly' | 'yearly',
  from: string,
  to: string,
): string[] {
  const out: string[] = []
  if (startIso > to) return out
  let cursor = startIso
  let guard = 0
  while (cursor < from && guard < 600) {
    cursor = stepDate(cursor, recurrence)
    guard++
  }
  while (cursor <= to && guard < 800) {
    if (cursor >= from) out.push(cursor)
    cursor = stepDate(cursor, recurrence)
    guard++
  }
  return out
}

export function stepDate(iso: string, recurrence: 'weekly' | 'monthly' | 'yearly'): string {
  if (recurrence === 'weekly') return addDays(iso, 7)
  return addMonthsToIso(iso, recurrence === 'monthly' ? 1 : 12)
}

export function nextOccurrence(
  startIso: string,
  recurrence: 'weekly' | 'monthly' | 'yearly',
  from = todayIso(),
): string {
  if (startIso >= from) return startIso
  let cursor = startIso
  let guard = 0
  while (cursor < from && guard < 600) {
    cursor = stepDate(cursor, recurrence)
    guard++
  }
  return cursor
}

export type AgendaKind = 'bill' | 'income' | 'savings' | 'other' | 'subscription' | 'recurring' | 'goal'

export interface AgendaItem {
  id: string
  date: string
  title: string
  amount: number | null
  kind: AgendaKind
  source: 'event' | 'subscription' | 'transaction' | 'goal'
  refId: string
  paid: boolean
  icon: string
  color: string
}

export function agendaBetween(data: VaultData, from: string, to: string): AgendaItem[] {
  const items: AgendaItem[] = []

  for (const ev of data.events) {
    if (ev.date >= from && ev.date <= to) {
      const kind = eventKind(ev.kind)
      items.push({
        id: `ev_${ev.id}`,
        date: ev.date,
        title: ev.title,
        amount: ev.amount,
        kind: ev.kind,
        source: 'event',
        refId: ev.id,
        paid: ev.paid,
        icon: kind.icon,
        color: kind.color,
      })
    }
  }

  for (const sub of data.subscriptions) {
    if (!sub.active) continue
    const dates = occurrencesBetween(
      sub.nextPayment,
      sub.cycle === 'monthly' ? 'monthly' : 'yearly',
      from,
      to,
    )
    for (const date of dates) {
      items.push({
        id: `sub_${sub.id}_${date}`,
        date,
        title: sub.name,
        amount: sub.amount,
        kind: 'subscription',
        source: 'subscription',
        refId: sub.id,
        paid: date < todayIso(),
        icon: 'repeat',
        color: '#C9A7FF',
      })
    }
  }

  for (const tx of data.transactions) {
    if (tx.recurrence === 'none') continue
    const dates = occurrencesBetween(tx.date, tx.recurrence, from, to)
    for (const date of dates) {
      items.push({
        id: `tx_${tx.id}_${date}`,
        date,
        title: tx.name,
        amount: tx.amount,
        kind: 'recurring',
        source: 'transaction',
        refId: tx.id,
        paid: date <= todayIso(),
        icon: 'rotate',
        color: tx.type === 'income' ? '#C5F36B' : '#8FB8FF',
      })
    }
  }

  for (const goal of data.goals) {
    if (goal.deadline && goal.deadline >= from && goal.deadline <= to) {
      items.push({
        id: `goal_${goal.id}`,
        date: goal.deadline,
        title: `Échéance · ${goal.name}`,
        amount: Math.max(0, goal.target - goal.saved),
        kind: 'goal',
        source: 'goal',
        refId: goal.id,
        paid: false,
        icon: 'target',
        color: '#C5F36B',
      })
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

export interface Notification {
  id: string
  kind: 'bill' | 'budget' | 'goal' | 'subscription' | 'info'
  title: string
  detail: string
  tone: 'ok' | 'warn' | 'danger' | 'info'
  date?: string
}

export function notificationsFor(data: VaultData, today = todayIso()): Notification[] {
  const out: Notification[] = []
  const month = today.slice(0, 7)
  const budget = data.budgets.find((b) => b.month === month)
  const status = budgetStatus(budget, data.transactions, month)

  if (status.overallBudget > 0) {
    if (status.overallState === 'over') {
      out.push({
        id: 'budget_overall_over',
        kind: 'budget',
        title: 'Budget mensuel dépassé',
        detail: `Vous avez dépensé ${Math.round(status.overallPercent)} % de votre budget global.`,
        tone: 'danger',
      })
    } else if (status.overallState === 'warn') {
      out.push({
        id: 'budget_overall_warn',
        kind: 'budget',
        title: 'Budget mensuel bientôt atteint',
        detail: `${Math.round(status.overallPercent)} % du budget global utilisé ce mois-ci.`,
        tone: 'warn',
      })
    }
  }

  for (const line of status.lines) {
    if (line.state === 'over') {
      out.push({
        id: `budget_${line.category}_over`,
        kind: 'budget',
        title: `Budget ${line.label} dépassé`,
        detail: `Dépassement de ${Math.round(line.spent - line.budget)} € sur ce poste.`,
        tone: 'danger',
      })
    } else if (line.state === 'warn') {
      out.push({
        id: `budget_${line.category}_warn`,
        kind: 'budget',
        title: `Budget ${line.label} à ${Math.round(line.percent)} %`,
        detail: `Il reste ${Math.round(line.remaining)} € sur ce poste.`,
        tone: 'warn',
      })
    }
  }

  for (const ev of data.events) {
    if (ev.paid) continue
    const days = daysBetween(today, ev.date)
    if (days >= 0 && days <= 7) {
      out.push({
        id: `event_${ev.id}`,
        kind: 'bill',
        title: ev.title,
        detail: days === 0 ? "Échéance aujourd'hui" : `Échéance dans ${days} jour${days > 1 ? 's' : ''}`,
        tone: days <= 2 ? 'warn' : 'info',
        date: ev.date,
      })
    }
  }

  for (const sub of data.subscriptions) {
    if (!sub.active) continue
    const next = nextOccurrence(sub.nextPayment, sub.cycle === 'monthly' ? 'monthly' : 'yearly', today)
    const days = daysBetween(today, next)
    if (days >= 0 && days <= 7) {
      out.push({
        id: `sub_${sub.id}`,
        kind: 'subscription',
        title: `Renouvellement · ${sub.name}`,
        detail: `${Math.round(sub.amount)} € dans ${days === 0 ? "aujourd'hui" : `${days} jour${days > 1 ? 's' : ''}`}`,
        tone: 'info',
        date: next,
      })
    }
  }

  for (const goal of data.goals) {
    const projection = goalProjection(goal, today)
    if (projection.percent >= 100) {
      out.push({
        id: `goal_${goal.id}_done`,
        kind: 'goal',
        title: `Objectif atteint · ${goal.name}`,
        detail: 'Félicitations, votre objectif est financé.',
        tone: 'ok',
      })
    } else if (goal.deadline && projection.monthsLeft !== null && projection.monthsLeft <= 1 && projection.percent < 100) {
      out.push({
        id: `goal_${goal.id}_soon`,
        kind: 'goal',
        title: `Échéance proche · ${goal.name}`,
        detail: `Il reste ${Math.round(projection.remaining)} € à épargner.`,
        tone: 'warn',
        date: goal.deadline,
      })
    }
  }

  const order = { danger: 0, warn: 1, info: 2, ok: 3 }
  return out.sort((a, b) => order[a.tone] - order[b.tone])
}

export function netWorth(txs: Transaction[]): number {
  return txs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
}

export function monthlyComparison(txs: Transaction[], month: string) {
  const current = monthTotals(txs, month)
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const previous = monthTotals(txs, prevMonth)
  return {
    current,
    previous,
    prevMonthLabel: formatMonth(prevMonth),
    incomeChange: percentChange(current.income, previous.income),
    expenseChange: percentChange(current.expense, previous.expense),
    netChange: percentChange(current.net, previous.net),
  }
}

export function savingsMilestones(goal: Goal): { percent: number; reached: boolean }[] {
  const percent = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0
  return [25, 50, 75, 100].map((p) => ({ percent: p, reached: percent >= p }))
}

export function upcomingBills(data: VaultData, days = 30): AgendaItem[] {
  const today = todayIso()
  return agendaBetween(data, today, addDays(today, days)).filter(
    (item) => item.kind !== 'income' && item.kind !== 'recurring',
  )
}

export function paidEvents(data: VaultData): CalendarEvent[] {
  return data.events.filter((e) => e.paid)
}
