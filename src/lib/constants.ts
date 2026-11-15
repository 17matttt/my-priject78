import type { TxType } from './types'

export interface Category {
  id: string
  label: string
  type: TxType | 'both'
  color: string
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', type: 'expense', color: '#C5F36B' },
  { id: 'groceries', label: 'Groceries', type: 'expense', color: '#7ED9C3' },
  { id: 'dining', label: 'Dining', type: 'expense', color: '#F2A65A' },
  { id: 'transport', label: 'Transport', type: 'expense', color: '#8FB4F5' },
  { id: 'subscriptions', label: 'Subscriptions', type: 'expense', color: '#C9A6F0' },
  { id: 'shopping', label: 'Shopping', type: 'expense', color: '#F08FA8' },
  { id: 'health', label: 'Health', type: 'expense', color: '#9BE59B' },
  { id: 'travel', label: 'Travel', type: 'expense', color: '#67C7E8' },
  { id: 'utilities', label: 'Utilities', type: 'expense', color: '#E4D06B' },
  { id: 'other', label: 'Other', type: 'expense', color: '#9AA0AE' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', type: 'income', color: '#C5F36B' },
  { id: 'freelance', label: 'Freelance', type: 'income', color: '#7ED9C3' },
  { id: 'investments', label: 'Investments', type: 'income', color: '#8FB4F5' },
  { id: 'gifts', label: 'Gifts', type: 'income', color: '#F2A65A' },
  { id: 'refunds', label: 'Refunds', type: 'income', color: '#C9A6F0' },
  { id: 'other_income', label: 'Other', type: 'income', color: '#9AA0AE' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.id, c]),
)

export function categoriesFor(type: TxType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export function categoryLabel(id: string): string {
  return CATEGORY_MAP[id]?.label ?? 'Other'
}

export function categoryColor(id: string): string {
  return CATEGORY_MAP[id]?.color ?? '#9AA0AE'
}

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona' },
  { code: 'PLN', symbol: 'zł', label: 'Polish Zloty' },
]

export const DEFAULT_CURRENCY = 'EUR'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
