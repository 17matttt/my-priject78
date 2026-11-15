export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  category: string
  description: string | null
  occurred_on: string
  created_at: string
}

export interface Budget {
  id: string
  category: string
  amount: number
  month: string
  created_at: string
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  created_at: string
}

export interface GoalActivity {
  id: string
  goal_id: string
  amount: number
  note: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  currency: string
  privacy_mode: boolean
  created_at: string
}

export interface TransactionInput {
  type: TxType
  amount: number
  category: string
  description: string
  occurred_on: string
}

export interface GoalInput {
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
}

export interface BudgetInput {
  category: string
  amount: number
  month: string
}

export interface Store {
  mode: 'cloud' | 'local'
  getProfile(): Promise<Profile>
  updateProfile(
    patch: Partial<Pick<Profile, 'full_name' | 'currency' | 'privacy_mode'>>,
  ): Promise<Profile>
  listTransactions(): Promise<Transaction[]>
  createTransaction(input: TransactionInput): Promise<Transaction>
  updateTransaction(id: string, input: TransactionInput): Promise<Transaction>
  deleteTransaction(id: string): Promise<void>
  listBudgets(): Promise<Budget[]>
  saveBudget(input: BudgetInput, id?: string): Promise<Budget>
  deleteBudget(id: string): Promise<void>
  listGoals(): Promise<SavingsGoal[]>
  createGoal(input: GoalInput): Promise<SavingsGoal>
  updateGoal(id: string, input: GoalInput): Promise<SavingsGoal>
  deleteGoal(id: string): Promise<void>
  addToGoal(id: string, amount: number, note: string): Promise<SavingsGoal>
  listGoalActivity(): Promise<GoalActivity[]>
  clearAllData(): Promise<void>
  deleteAccount(): Promise<void>
}
