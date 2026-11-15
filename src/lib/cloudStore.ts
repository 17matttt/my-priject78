import { supabase } from './supabase'
import type {
  Budget,
  BudgetInput,
  GoalActivity,
  GoalInput,
  SavingsGoal,
  Store,
  Transaction,
  TransactionInput,
} from './types'
import { monthStart, todayIso } from './format'

type Row = Record<string, unknown>

function db() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function fail(context: string, error: unknown): never {
  const detail =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  throw new Error(detail ? `${context}: ${detail}` : context)
}

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

const mapTx = (row: Row): Transaction => ({
  id: String(row.id),
  type: row.type === 'income' ? 'income' : 'expense',
  amount: num(row.amount),
  category: String(row.category ?? 'other'),
  description: (row.description as string | null) ?? null,
  occurred_on: String(row.occurred_on ?? todayIso()),
  created_at: String(row.created_at ?? new Date().toISOString()),
})

const mapBudget = (row: Row): Budget => ({
  id: String(row.id),
  category: String(row.category ?? 'other'),
  amount: num(row.amount),
  month: String(row.month ?? '').slice(0, 10),
  created_at: String(row.created_at ?? new Date().toISOString()),
})

const mapGoal = (row: Row): SavingsGoal => ({
  id: String(row.id),
  name: String(row.name ?? 'Goal'),
  target_amount: num(row.target_amount),
  saved_amount: num(row.saved_amount),
  deadline: row.deadline ? String(row.deadline).slice(0, 10) : null,
  created_at: String(row.created_at ?? new Date().toISOString()),
})

const mapActivity = (row: Row): GoalActivity => ({
  id: String(row.id),
  goal_id: String(row.goal_id),
  amount: num(row.amount),
  note: (row.note as string | null) ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
})

export function createCloudStore(userId: string): Store {
  return {
    mode: 'cloud',

    async getProfile() {
      const { data, error } = await db()
        .from('profiles')
        .select('id, full_name, currency, privacy_mode, created_at')
        .eq('id', userId)
        .maybeSingle()
      if (error) fail('Could not load your profile', error)
      if (data) {
        const row = data as Row
        return {
          id: String(row.id),
          full_name: (row.full_name as string | null) ?? null,
          currency: String(row.currency ?? 'EUR'),
          privacy_mode: Boolean(row.privacy_mode),
          created_at: String(row.created_at ?? new Date().toISOString()),
        }
      }
      const { data: created, error: insertError } = await db()
        .from('profiles')
        .insert({ id: userId })
        .select('id, full_name, currency, privacy_mode, created_at')
        .single()
      if (insertError) fail('Could not create your profile', insertError)
      const row = created as Row
      return {
        id: String(row.id),
        full_name: (row.full_name as string | null) ?? null,
        currency: String(row.currency ?? 'EUR'),
        privacy_mode: Boolean(row.privacy_mode),
        created_at: String(row.created_at ?? new Date().toISOString()),
      }
    },

    async updateProfile(patch) {
      const { data, error } = await db()
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('id, full_name, currency, privacy_mode, created_at')
        .single()
      if (error) fail('Could not save your profile', error)
      const row = data as Row
      return {
        id: String(row.id),
        full_name: (row.full_name as string | null) ?? null,
        currency: String(row.currency ?? 'EUR'),
        privacy_mode: Boolean(row.privacy_mode),
        created_at: String(row.created_at ?? new Date().toISOString()),
      }
    },

    async listTransactions() {
      const { data, error } = await db()
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) fail('Could not load transactions', error)
      return (data as Row[]).map(mapTx)
    },

    async createTransaction(input: TransactionInput) {
      const { data, error } = await db()
        .from('transactions')
        .insert({
          user_id: userId,
          type: input.type,
          amount: input.amount,
          category: input.category,
          description: input.description.trim() || null,
          occurred_on: input.occurred_on,
        })
        .select('*')
        .single()
      if (error) fail('Could not save the transaction', error)
      return mapTx(data as Row)
    },

    async updateTransaction(id, input) {
      const { data, error } = await db()
        .from('transactions')
        .update({
          type: input.type,
          amount: input.amount,
          category: input.category,
          description: input.description.trim() || null,
          occurred_on: input.occurred_on,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()
      if (error) fail('Could not update the transaction', error)
      return mapTx(data as Row)
    },

    async deleteTransaction(id) {
      const { error } = await db().from('transactions').delete().eq('id', id).eq('user_id', userId)
      if (error) fail('Could not delete the transaction', error)
    },

    async listBudgets() {
      const { data, error } = await db()
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) fail('Could not load budgets', error)
      return (data as Row[]).map(mapBudget)
    },

    async saveBudget(input: BudgetInput, id?: string) {
      const payload = {
        user_id: userId,
        category: input.category,
        amount: input.amount,
        month: monthStart(input.month),
      }
      const query = id
        ? db().from('budgets').update(payload).eq('id', id).eq('user_id', userId)
        : db().from('budgets').upsert(payload, { onConflict: 'user_id,category,month' })
      const { data, error } = await query.select('*').single()
      if (error) fail('Could not save the budget', error)
      return mapBudget(data as Row)
    },

    async deleteBudget(id) {
      const { error } = await db().from('budgets').delete().eq('id', id).eq('user_id', userId)
      if (error) fail('Could not delete the budget', error)
    },

    async listGoals() {
      const { data, error } = await db()
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) fail('Could not load savings goals', error)
      return (data as Row[]).map(mapGoal)
    },

    async createGoal(input: GoalInput) {
      const { data, error } = await db()
        .from('savings_goals')
        .insert({
          user_id: userId,
          name: input.name,
          target_amount: input.target_amount,
          saved_amount: input.saved_amount,
          deadline: input.deadline,
        })
        .select('*')
        .single()
      if (error) fail('Could not create the savings goal', error)
      const goal = mapGoal(data as Row)
      if (input.saved_amount > 0) {
        await db().from('goal_activity').insert({
          user_id: userId,
          goal_id: goal.id,
          amount: input.saved_amount,
          note: 'Opening balance',
        })
      }
      return goal
    },

    async updateGoal(id, input) {
      const { data, error } = await db()
        .from('savings_goals')
        .update({
          name: input.name,
          target_amount: input.target_amount,
          deadline: input.deadline,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()
      if (error) fail('Could not update the savings goal', error)
      return mapGoal(data as Row)
    },

    async deleteGoal(id) {
      const { error } = await db().from('savings_goals').delete().eq('id', id).eq('user_id', userId)
      if (error) fail('Could not delete the savings goal', error)
    },

    async addToGoal(id, amount, note) {
      const { data: current, error: readError } = await db()
        .from('savings_goals')
        .select('saved_amount')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      if (readError) fail('Could not read the savings goal', readError)
      const previous = num((current as Row).saved_amount)
      const next = Math.max(0, Math.round((previous + amount) * 100) / 100)
      const applied = Math.round((next - previous) * 100) / 100
      if (applied === 0) throw new Error('This withdrawal is larger than the amount saved.')

      const { data, error } = await db()
        .from('savings_goals')
        .update({ saved_amount: next })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()
      if (error) fail('Could not update the savings goal', error)

      const { error: activityError } = await db().from('goal_activity').insert({
        user_id: userId,
        goal_id: id,
        amount: applied,
        note: note.trim() || (applied > 0 ? 'Deposit' : 'Withdrawal'),
      })
      if (activityError) fail('Could not record the movement', activityError)
      return mapGoal(data as Row)
    },

    async listGoalActivity() {
      const { data, error } = await db()
        .from('goal_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) fail('Could not load savings activity', error)
      return (data as Row[]).map(mapActivity)
    },

    async clearAllData() {
      const client = db()
      const steps = [
        client.from('goal_activity').delete().eq('user_id', userId),
        client.from('savings_goals').delete().eq('user_id', userId),
        client.from('budgets').delete().eq('user_id', userId),
        client.from('transactions').delete().eq('user_id', userId),
      ]
      const results = await Promise.all(steps)
      const failure = results.find((r) => r.error)
      if (failure?.error) fail('Could not clear your data', failure.error)
    },

    async deleteAccount() {
      const client = db()
      const { error } = await client.rpc('delete_own_account')
      if (!error) return { authRemoved: true }
      // Fallback: remove the data the signed-in user can reach, then report.
      await Promise.all([
        client.from('goal_activity').delete().eq('user_id', userId),
        client.from('savings_goals').delete().eq('user_id', userId),
        client.from('budgets').delete().eq('user_id', userId),
        client.from('transactions').delete().eq('user_id', userId),
        client.from('profiles').delete().eq('id', userId),
      ])
      return { authRemoved: false }
    },
  }
}
