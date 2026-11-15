import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { createCloudStore } from '../lib/cloudStore'
import { createLocalStore } from '../lib/localStore'
import type {
  Budget,
  BudgetInput,
  GoalActivity,
  GoalInput,
  Profile,
  SavingsGoal,
  Store,
  Transaction,
  TransactionInput,
} from '../lib/types'

interface DataContextValue {
  store: Store | null
  profile: Profile | null
  transactions: Transaction[]
  budgets: Budget[]
  goals: SavingsGoal[]
  activity: GoalActivity[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  saveProfile: (
    patch: Partial<Pick<Profile, 'full_name' | 'currency' | 'privacy_mode'>>,
  ) => Promise<void>
  addTransaction: (input: TransactionInput) => Promise<void>
  editTransaction: (id: string, input: TransactionInput) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  saveBudget: (input: BudgetInput, id?: string) => Promise<void>
  removeBudget: (id: string) => Promise<void>
  addGoal: (input: GoalInput) => Promise<void>
  editGoal: (id: string, input: GoalInput) => Promise<void>
  removeGoal: (id: string) => Promise<void>
  moveGoalMoney: (id: string, amount: number, note: string) => Promise<void>
  clearAllData: () => Promise<void>
  deleteAccount: () => Promise<{ authRemoved: boolean }>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, mode, renameLocalUser, removeLocalAccount, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [activity, setActivity] = useState<GoalActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const store = useMemo<Store | null>(() => {
    if (!user) return null
    if (mode === 'cloud') return createCloudStore(user.id)
    return createLocalStore(user.id, user.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode])

  const reload = useCallback(async () => {
    if (!store) return
    setLoading(true)
    setError(null)
    try {
      const [nextProfile, nextTransactions, nextBudgets, nextGoals, nextActivity] =
        await Promise.all([
          store.getProfile(),
          store.listTransactions(),
          store.listBudgets(),
          store.listGoals(),
          store.listGoalActivity(),
        ])
      setProfile(nextProfile)
      setTransactions(nextTransactions)
      setBudgets(nextBudgets)
      setGoals(nextGoals)
      setActivity(nextActivity)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your data.')
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    if (!store) {
      setProfile(null)
      setTransactions([])
      setBudgets([])
      setGoals([])
      setActivity([])
      setLoading(false)
      return
    }
    void reload()
  }, [store, reload])

  const saveProfile = useCallback<DataContextValue['saveProfile']>(
    async (patch) => {
      if (!store) return
      const updated = await store.updateProfile(patch)
      setProfile(updated)
      if (mode === 'local' && typeof patch.full_name === 'string') {
        renameLocalUser(patch.full_name)
      }
    },
    [store, mode, renameLocalUser],
  )

  const addTransaction = useCallback<DataContextValue['addTransaction']>(
    async (input) => {
      if (!store) return
      const created = await store.createTransaction(input)
      setTransactions((prev) => [created, ...prev])
    },
    [store],
  )

  const editTransaction = useCallback<DataContextValue['editTransaction']>(
    async (id, input) => {
      if (!store) return
      const updated = await store.updateTransaction(id, input)
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    },
    [store],
  )

  const removeTransaction = useCallback<DataContextValue['removeTransaction']>(
    async (id) => {
      if (!store) return
      await store.deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    },
    [store],
  )

  const saveBudget = useCallback<DataContextValue['saveBudget']>(
    async (input, id) => {
      if (!store) return
      const saved = await store.saveBudget(input, id)
      setBudgets((prev) => {
        const exists = prev.some((b) => b.id === saved.id)
        return exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved]
      })
    },
    [store],
  )

  const removeBudget = useCallback<DataContextValue['removeBudget']>(
    async (id) => {
      if (!store) return
      await store.deleteBudget(id)
      setBudgets((prev) => prev.filter((b) => b.id !== id))
    },
    [store],
  )

  const addGoal = useCallback<DataContextValue['addGoal']>(
    async (input) => {
      if (!store) return
      const created = await store.createGoal(input)
      setGoals((prev) => [...prev, created])
      setActivity(await store.listGoalActivity())
    },
    [store],
  )

  const editGoal = useCallback<DataContextValue['editGoal']>(
    async (id, input) => {
      if (!store) return
      const updated = await store.updateGoal(id, input)
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)))
    },
    [store],
  )

  const removeGoal = useCallback<DataContextValue['removeGoal']>(
    async (id) => {
      if (!store) return
      await store.deleteGoal(id)
      setGoals((prev) => prev.filter((g) => g.id !== id))
      setActivity((prev) => prev.filter((a) => a.goal_id !== id))
    },
    [store],
  )

  const moveGoalMoney = useCallback<DataContextValue['moveGoalMoney']>(
    async (id, amount, note) => {
      if (!store) return
      const updated = await store.addToGoal(id, amount, note)
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)))
      setActivity(await store.listGoalActivity())
    },
    [store],
  )

  const clearAllData = useCallback(async () => {
    if (!store) return
    await store.clearAllData()
    setTransactions([])
    setBudgets([])
    setGoals([])
    setActivity([])
  }, [store])

  const deleteAccount = useCallback(async () => {
    if (!store) return { authRemoved: false }
    const result = await store.deleteAccount()
    setTransactions([])
    setBudgets([])
    setGoals([])
    setActivity([])
    setProfile(null)
    if (mode === 'local') removeLocalAccount()
    else await signOut()
    return result
  }, [store, mode, removeLocalAccount, signOut])

  const value = useMemo<DataContextValue>(
    () => ({
      store,
      profile,
      transactions,
      budgets,
      goals,
      activity,
      loading,
      error,
      reload,
      saveProfile,
      addTransaction,
      editTransaction,
      removeTransaction,
      saveBudget,
      removeBudget,
      addGoal,
      editGoal,
      removeGoal,
      moveGoalMoney,
      clearAllData,
      deleteAccount,
    }),
    [
      store,
      profile,
      transactions,
      budgets,
      goals,
      activity,
      loading,
      error,
      reload,
      saveProfile,
      addTransaction,
      editTransaction,
      removeTransaction,
      saveBudget,
      removeBudget,
      addGoal,
      editGoal,
      removeGoal,
      moveGoalMoney,
      clearAllData,
      deleteAccount,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
