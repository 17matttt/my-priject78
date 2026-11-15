import type { Budget, GoalActivity, SavingsGoal, Transaction } from './types'
import { currentMonthKey, daysInMonth, monthKeyOf, shiftMonth } from './format'

export interface MonthTotals {
  income: number
  expense: number
  net: number
}

export interface CategorySlice {
  category: string
  total: number
  share: number
  count: number
}

export interface MonthPoint {
  month: string
  income: number
  expense: number
  net: number
}

export function totalsFor(transactions: Transaction[], monthKey: string): MonthTotals {
  let income = 0
  let expense = 0
  for (const tx of transactions) {
    if (monthKeyOf(tx.occurred_on) !== monthKey) continue
    if (tx.type === 'income') income += tx.amount
    else expense += tx.amount
  }
  return { income: round2(income), expense: round2(expense), net: round2(income - expense) }
}

export function balanceOf(transactions: Transaction[]): number {
  let total = 0
  for (const tx of transactions) {
    total += tx.type === 'income' ? tx.amount : -tx.amount
  }
  return round2(total)
}

export function categoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
  type: 'income' | 'expense',
): CategorySlice[] {
  const map = new Map<string, { total: number; count: number }>()
  for (const tx of transactions) {
    if (tx.type !== type) continue
    if (monthKeyOf(tx.occurred_on) !== monthKey) continue
    const entry = map.get(tx.category) ?? { total: 0, count: 0 }
    entry.total += tx.amount
    entry.count += 1
    map.set(tx.category, entry)
  }
  const sum = [...map.values()].reduce((acc, v) => acc + v.total, 0)
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      total: round2(v.total),
      count: v.count,
      share: sum > 0 ? (v.total / sum) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function monthlySeries(transactions: Transaction[], months: string[]): MonthPoint[] {
  return months.map((month) => {
    const t = totalsFor(transactions, month)
    return { month, income: t.income, expense: t.expense, net: t.net }
  })
}

export function lastMonths(count: number, endMonth = currentMonthKey()): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) out.push(shiftMonth(endMonth, -i))
  return out
}

export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return 0
  return ((income - expense) / income) * 100
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  ratio: number
  state: 'safe' | 'warn' | 'over'
  dailyAllowance: number
  projected: number
}

export function budgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  monthKey: string,
): BudgetStatus[] {
  const spendByCategory = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    if (monthKeyOf(tx.occurred_on) !== monthKey) continue
    spendByCategory.set(tx.category, (spendByCategory.get(tx.category) ?? 0) + tx.amount)
  }

  const totalDays = daysInMonth(monthKey)
  const isCurrent = monthKey === currentMonthKey()
  const elapsed = isCurrent ? Math.min(new Date().getDate(), totalDays) : totalDays

  return budgets
    .filter((b) => monthKeyOf(b.month) === monthKey || b.month === monthKey)
    .map((budget) => {
      const spent = round2(spendByCategory.get(budget.category) ?? 0)
      const ratio = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      const projected = elapsed > 0 ? round2((spent / elapsed) * totalDays) : spent
      const remaining = round2(budget.amount - spent)
      const state: BudgetStatus['state'] = ratio >= 100 ? 'over' : ratio >= 80 ? 'warn' : 'safe'
      const daysLeft = Math.max(totalDays - elapsed, 1)
      return {
        budget,
        spent,
        remaining,
        ratio,
        state,
        dailyAllowance: remaining > 0 ? round2(remaining / daysLeft) : 0,
        projected,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

export function goalProgress(goal: SavingsGoal): number {
  if (goal.target_amount <= 0) return 0
  return Math.min((goal.saved_amount / goal.target_amount) * 100, 100)
}

export function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null
  const [y, m, d] = dateIso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / 86_400_000)
}

export function goalMonthlyPace(goal: SavingsGoal): number | null {
  const days = daysUntil(goal.deadline)
  if (days === null || days <= 0) return null
  const remaining = goal.target_amount - goal.saved_amount
  if (remaining <= 0) return 0
  return round2(remaining / (days / 30.44))
}

export function goalActivityTotal(activity: GoalActivity[]): number {
  return round2(activity.reduce((acc, a) => acc + a.amount, 0))
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.occurred_on === b.occurred_on) return b.created_at.localeCompare(a.created_at)
    return b.occurred_on.localeCompare(a.occurred_on)
  })
}

export function groupByDay(transactions: Transaction[]): { day: string; items: Transaction[] }[] {
  const groups: { day: string; items: Transaction[] }[] = []
  for (const tx of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.day === tx.occurred_on) last.items.push(tx)
    else groups.push({ day: tx.occurred_on, items: [tx] })
  }
  return groups
}
