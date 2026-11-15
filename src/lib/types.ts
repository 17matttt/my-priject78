export type TxType = 'income' | 'expense'
export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly'
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'direct_debit' | 'other'
export type SubscriptionCycle = 'monthly' | 'yearly'
export type EventKind = 'bill' | 'income' | 'savings' | 'other'

export interface Transaction {
  id: string
  type: TxType
  name: string
  amount: number
  category: string
  date: string
  paymentMethod: PaymentMethod
  notes: string
  recurrence: Recurrence
  createdAt: string
}

export interface MonthBudget {
  month: string
  overall: number
  categories: Record<string, number>
  updatedAt: string
}

export interface GoalContribution {
  id: string
  amount: number
  date: string
  note: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  deadline: string | null
  icon: string
  description: string
  contributions: GoalContribution[]
  createdAt: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  cycle: SubscriptionCycle
  nextPayment: string
  category: string
  description: string
  active: boolean
  createdAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  amount: number | null
  kind: EventKind
  paid: boolean
  notes: string
  createdAt: string
}

export interface Profile {
  name: string
  currency: string
  privacyMode: boolean
}

export interface VaultData {
  version: number
  profile: Profile
  transactions: Transaction[]
  budgets: MonthBudget[]
  goals: Goal[]
  subscriptions: Subscription[]
  events: CalendarEvent[]
  demo: boolean
}

export type EntityKind = 'transaction' | 'goal' | 'subscription' | 'event'
