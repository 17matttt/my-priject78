import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CalendarEvent,
  MonthBudget,
  Profile,
  Subscription,
  Transaction,
  VaultData,
} from '../lib/types'
import { demoData, emptyData, loadData, saveData } from '../lib/storage'
import { currentMonthKey, formatMoney, todayIso, uid } from '../lib/format'

export type TxInput = Omit<Transaction, 'id' | 'createdAt'>
export type GoalInput = {
  name: string
  target: number
  saved: number
  deadline: string | null
  icon: string
  description: string
}
export type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt'>
export type EventInput = Omit<CalendarEvent, 'id' | 'createdAt'>

interface DataApi {
  data: VaultData
  ready: boolean
  currency: string
  masked: boolean
  money: (value: number, opts?: { decimals?: boolean; signed?: boolean }) => string
  hasData: boolean
  updateProfile: (patch: Partial<Profile>) => void
  addTransaction: (input: TxInput) => void
  updateTransaction: (id: string, patch: Partial<TxInput>) => void
  deleteTransaction: (id: string) => void
  saveBudget: (month: string, overall: number, categories: Record<string, number>) => void
  deleteBudget: (month: string) => void
  addGoal: (input: GoalInput) => void
  updateGoal: (id: string, patch: Partial<GoalInput>) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number, note?: string, date?: string) => void
  addSubscription: (input: SubscriptionInput) => void
  updateSubscription: (id: string, patch: Partial<SubscriptionInput>) => void
  deleteSubscription: (id: string) => void
  addEvent: (input: EventInput) => void
  updateEvent: (id: string, patch: Partial<EventInput>) => void
  toggleEventPaid: (id: string) => void
  deleteEvent: (id: string) => void
  loadDemo: () => void
  clearAll: () => void
  importData: (next: VaultData) => void
}

const DataContext = createContext<DataApi | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VaultData>(() => loadData())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    saveData(data)
  }, [data])

  const money = useCallback(
    (value: number, opts: { decimals?: boolean; signed?: boolean } = {}) =>
      formatMoney(value, data.profile.currency, { ...opts, masked: data.profile.privacyMode }),
    [data.profile.currency, data.profile.privacyMode],
  )

  const api = useMemo<DataApi>(() => {
    const patchData = (fn: (prev: VaultData) => VaultData) => setData((prev) => fn(prev))

    return {
      data,
      ready,
      currency: data.profile.currency,
      masked: data.profile.privacyMode,
      money,
      hasData:
        data.transactions.length > 0 ||
        data.goals.length > 0 ||
        data.subscriptions.length > 0 ||
        data.events.length > 0,
      updateProfile: (patch) =>
        patchData((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } })),

      addTransaction: (input) =>
        patchData((prev) => ({
          ...prev,
          transactions: [
            { ...input, id: uid('tx'), createdAt: new Date().toISOString() },
            ...prev.transactions,
          ],
        })),
      updateTransaction: (id, patch) =>
        patchData((prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      deleteTransaction: (id) =>
        patchData((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
        })),

      saveBudget: (month, overall, categories) =>
        patchData((prev) => {
          const entry: MonthBudget = {
            month,
            overall,
            categories,
            updatedAt: new Date().toISOString(),
          }
          const exists = prev.budgets.some((b) => b.month === month)
          return {
            ...prev,
            budgets: exists
              ? prev.budgets.map((b) => (b.month === month ? entry : b))
              : [...prev.budgets, entry],
          }
        }),
      deleteBudget: (month) =>
        patchData((prev) => ({ ...prev, budgets: prev.budgets.filter((b) => b.month !== month) })),

      addGoal: (input) =>
        patchData((prev) => ({
          ...prev,
          goals: [
            {
              ...input,
              contributions: input.saved
                ? [
                    {
                      id: uid('c'),
                      amount: input.saved,
                      date: todayIso(),
                      note: 'Montant initial',
                    },
                  ]
                : [],
              id: uid('goal'),
              createdAt: new Date().toISOString(),
            },
            ...prev.goals,
          ],
        })),
      updateGoal: (id, patch) =>
        patchData((prev) => ({
          ...prev,
          goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      deleteGoal: (id) =>
        patchData((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) })),
      contributeToGoal: (id, amount, note = '', date = todayIso()) =>
        patchData((prev) => ({
          ...prev,
          goals: prev.goals.map((g) => {
            if (g.id !== id) return g
            const nextSaved = Math.max(0, Math.round((g.saved + amount) * 100) / 100)
            return {
              ...g,
              saved: nextSaved,
              contributions: [
                { id: uid('c'), amount, date, note },
                ...g.contributions,
              ],
            }
          }),
        })),

      addSubscription: (input) =>
        patchData((prev) => ({
          ...prev,
          subscriptions: [
            { ...input, id: uid('sub'), createdAt: new Date().toISOString() },
            ...prev.subscriptions,
          ],
        })),
      updateSubscription: (id, patch) =>
        patchData((prev) => ({
          ...prev,
          subscriptions: prev.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      deleteSubscription: (id) =>
        patchData((prev) => ({
          ...prev,
          subscriptions: prev.subscriptions.filter((s) => s.id !== id),
        })),

      addEvent: (input) =>
        patchData((prev) => ({
          ...prev,
          events: [
            { ...input, id: uid('ev'), createdAt: new Date().toISOString() },
            ...prev.events,
          ],
        })),
      updateEvent: (id, patch) =>
        patchData((prev) => ({
          ...prev,
          events: prev.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      toggleEventPaid: (id) =>
        patchData((prev) => ({
          ...prev,
          events: prev.events.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)),
        })),
      deleteEvent: (id) =>
        patchData((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) })),

      loadDemo: () => setData(demoData()),
      clearAll: () => setData(emptyData()),
      importData: (next) => setData(next),
    }
  }, [data, ready, money])

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}

export function useData(): DataApi {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData doit être utilisé dans DataProvider')
  return ctx
}

export function useCurrentMonth(): string {
  return currentMonthKey()
}
