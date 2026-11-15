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
} from './types'
import { dataKey, localDeleteAccount, readJson, writeJson } from './localAuth'
import { monthStart, todayIso } from './format'

interface LocalData {
  profile: Profile
  transactions: Transaction[]
  budgets: Budget[]
  goals: SavingsGoal[]
  activity: GoalActivity[]
}

function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function emptyData(userId: string, name: string): LocalData {
  return {
    profile: {
      id: userId,
      full_name: name || null,
      currency: 'EUR',
      privacy_mode: false,
      created_at: new Date().toISOString(),
    },
    transactions: [],
    budgets: [],
    goals: [],
    activity: [],
  }
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function createLocalStore(userId: string, displayName = ''): Store {
  const key = dataKey(userId)

  const read = (): LocalData => {
    const data = readJson<LocalData>(key, emptyData(userId, displayName))
    return {
      profile: data.profile ?? emptyData(userId, displayName).profile,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      budgets: Array.isArray(data.budgets) ? data.budgets : [],
      goals: Array.isArray(data.goals) ? data.goals : [],
      activity: Array.isArray(data.activity) ? data.activity : [],
    }
  }

  const commit = (data: LocalData): LocalData => {
    writeJson(key, data)
    return data
  }

  return {
    mode: 'local',

    async getProfile() {
      return read().profile
    },

    async updateProfile(patch) {
      const data = read()
      const profile: Profile = { ...data.profile, ...patch }
      commit({ ...data, profile })
      return profile
    },

    async listTransactions() {
      return read().transactions
    },

    async createTransaction(input: TransactionInput) {
      const data = read()
      const tx: Transaction = {
        id: newId(),
        type: input.type,
        amount: round2(input.amount),
        category: input.category,
        description: input.description.trim() || null,
        occurred_on: input.occurred_on || todayIso(),
        created_at: new Date().toISOString(),
      }
      commit({ ...data, transactions: [tx, ...data.transactions] })
      return tx
    },

    async updateTransaction(id, input) {
      const data = read()
      const existing = data.transactions.find((t) => t.id === id)
      if (!existing) throw new Error('That transaction no longer exists.')
      const updated: Transaction = {
        ...existing,
        type: input.type,
        amount: round2(input.amount),
        category: input.category,
        description: input.description.trim() || null,
        occurred_on: input.occurred_on || existing.occurred_on,
      }
      commit({ ...data, transactions: data.transactions.map((t) => (t.id === id ? updated : t)) })
      return updated
    },

    async deleteTransaction(id) {
      const data = read()
      commit({ ...data, transactions: data.transactions.filter((t) => t.id !== id) })
    },

    async listBudgets() {
      return read().budgets
    },

    async saveBudget(input: BudgetInput, id?: string) {
      const data = read()
      const month = monthStart(input.month)
      const existing = id
        ? data.budgets.find((b) => b.id === id)
        : data.budgets.find((b) => b.category === input.category && b.month.slice(0, 7) === input.month)

      if (existing) {
        const updated: Budget = { ...existing, amount: round2(input.amount), category: input.category }
        commit({
          ...data,
          budgets: data.budgets.map((b) => (b.id === existing.id ? updated : b)),
        })
        return updated
      }

      const budget: Budget = {
        id: newId(),
        category: input.category,
        amount: round2(input.amount),
        month,
        created_at: new Date().toISOString(),
      }
      commit({ ...data, budgets: [...data.budgets, budget] })
      return budget
    },

    async deleteBudget(id) {
      const data = read()
      commit({ ...data, budgets: data.budgets.filter((b) => b.id !== id) })
    },

    async listGoals() {
      return read().goals
    },

    async createGoal(input: GoalInput) {
      const data = read()
      const goal: SavingsGoal = {
        id: newId(),
        name: input.name.trim() || 'New goal',
        target_amount: round2(input.target_amount),
        saved_amount: round2(Math.max(input.saved_amount, 0)),
        deadline: input.deadline || null,
        created_at: new Date().toISOString(),
      }
      const activity: GoalActivity[] =
        goal.saved_amount > 0
          ? [
              {
                id: newId(),
                goal_id: goal.id,
                amount: goal.saved_amount,
                note: 'Opening balance',
                created_at: new Date().toISOString(),
              },
              ...data.activity,
            ]
          : data.activity
      commit({ ...data, goals: [...data.goals, goal], activity })
      return goal
    },

    async updateGoal(id, input) {
      const data = read()
      const existing = data.goals.find((g) => g.id === id)
      if (!existing) throw new Error('That savings goal no longer exists.')
      const updated: SavingsGoal = {
        ...existing,
        name: input.name.trim() || existing.name,
        target_amount: round2(input.target_amount),
        deadline: input.deadline || null,
      }
      commit({ ...data, goals: data.goals.map((g) => (g.id === id ? updated : g)) })
      return updated
    },

    async deleteGoal(id) {
      const data = read()
      commit({
        ...data,
        goals: data.goals.filter((g) => g.id !== id),
        activity: data.activity.filter((a) => a.goal_id !== id),
      })
    },

    async addToGoal(id, amount, note) {
      const data = read()
      const existing = data.goals.find((g) => g.id === id)
      if (!existing) throw new Error('That savings goal no longer exists.')
      const next = Math.max(0, round2(existing.saved_amount + amount))
      const applied = round2(next - existing.saved_amount)
      if (applied === 0) throw new Error('This withdrawal is larger than the amount saved.')
      const updated: SavingsGoal = { ...existing, saved_amount: next }
      const entry: GoalActivity = {
        id: newId(),
        goal_id: id,
        amount: applied,
        note: note.trim() || (applied > 0 ? 'Deposit' : 'Withdrawal'),
        created_at: new Date().toISOString(),
      }
      commit({
        ...data,
        goals: data.goals.map((g) => (g.id === id ? updated : g)),
        activity: [entry, ...data.activity],
      })
      return updated
    },

    async listGoalActivity() {
      return read().activity
    },

    async clearAllData() {
      const data = read()
      commit({ ...data, transactions: [], budgets: [], goals: [], activity: [] })
    },

    async deleteAccount() {
      localDeleteAccount(userId)
      return { authRemoved: true }
    },
  }
}
