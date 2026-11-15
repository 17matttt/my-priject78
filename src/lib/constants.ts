import type { EventKind, PaymentMethod, Recurrence, SubscriptionCycle } from './types'

export interface CategoryDef {
  id: string
  label: string
  icon: string
  color: string
  type: 'expense' | 'income'
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'logement', label: 'Logement', icon: 'home', color: '#8FB8FF', type: 'expense' },
  { id: 'courses', label: 'Courses', icon: 'cart', color: '#C5F36B', type: 'expense' },
  { id: 'restaurants', label: 'Restaurants', icon: 'utensils', color: '#FFB86B', type: 'expense' },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#7BD8C2', type: 'expense' },
  { id: 'abonnements', label: 'Abonnements', icon: 'repeat', color: '#C9A7FF', type: 'expense' },
  { id: 'loisirs', label: 'Loisirs', icon: 'gamepad', color: '#FF8FA3', type: 'expense' },
  { id: 'sante', label: 'Santé', icon: 'heart', color: '#8AE0A6', type: 'expense' },
  { id: 'shopping', label: 'Shopping', icon: 'bag', color: '#FFD76B', type: 'expense' },
  { id: 'education', label: 'Éducation', icon: 'cap', color: '#9FB3FF', type: 'expense' },
  { id: 'voyages', label: 'Voyages', icon: 'plane', color: '#6FD3FF', type: 'expense' },
  { id: 'epargne', label: 'Épargne', icon: 'piggy', color: '#B6E36B', type: 'expense' },
  { id: 'autre', label: 'Autre', icon: 'dots', color: '#92949D', type: 'expense' },
]

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: 'salaire', label: 'Salaire', icon: 'wallet', color: '#C5F36B', type: 'income' },
  { id: 'freelance', label: 'Freelance', icon: 'briefcase', color: '#8FB8FF', type: 'income' },
  { id: 'primes', label: 'Primes', icon: 'sparkles', color: '#FFD76B', type: 'income' },
  { id: 'remboursement', label: 'Remboursement', icon: 'undo', color: '#7BD8C2', type: 'income' },
  { id: 'cadeau', label: 'Cadeau', icon: 'gift', color: '#FF8FA3', type: 'income' },
  { id: 'investissements', label: 'Investissements', icon: 'trend', color: '#C9A7FF', type: 'income' },
  { id: 'autre_revenu', label: 'Autre revenu', icon: 'coins', color: '#92949D', type: 'income' },
]

export const ALL_CATEGORIES: CategoryDef[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function categoryById(id: string): CategoryDef {
  return (
    ALL_CATEGORIES.find((c) => c.id === id) ?? {
      id,
      label: 'Sans catégorie',
      icon: 'dots',
      color: '#92949D',
      type: 'expense',
    }
  )
}

export function categoriesFor(type: 'expense' | 'income'): CategoryDef[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'card', label: 'Carte bancaire' },
  { id: 'cash', label: 'Espèces' },
  { id: 'transfer', label: 'Virement' },
  { id: 'direct_debit', label: 'Prélèvement' },
  { id: 'other', label: 'Autre' },
]

export function paymentLabel(id: PaymentMethod): string {
  return PAYMENT_METHODS.find((p) => p.id === id)?.label ?? 'Autre'
}

export const RECURRENCES: { id: Recurrence; label: string; short: string }[] = [
  { id: 'none', label: 'Ponctuelle', short: 'Ponctuelle' },
  { id: 'weekly', label: 'Hebdomadaire', short: 'Hebdo' },
  { id: 'monthly', label: 'Mensuelle', short: 'Mensuel' },
  { id: 'yearly', label: 'Annuelle', short: 'Annuel' },
]

export function recurrenceLabel(id: Recurrence): string {
  return RECURRENCES.find((r) => r.id === id)?.label ?? 'Ponctuelle'
}

export const CYCLES: { id: SubscriptionCycle; label: string; short: string }[] = [
  { id: 'monthly', label: 'Mensuel', short: '/ mois' },
  { id: 'yearly', label: 'Annuel', short: '/ an' },
]

export const EVENT_KINDS: { id: EventKind; label: string; icon: string; color: string }[] = [
  { id: 'bill', label: 'Facture', icon: 'receipt', color: '#FFB86B' },
  { id: 'income', label: 'Revenu', icon: 'wallet', color: '#C5F36B' },
  { id: 'savings', label: 'Épargne', icon: 'piggy', color: '#8FB8FF' },
  { id: 'other', label: 'Autre', icon: 'dots', color: '#92949D' },
]

export function eventKind(id: EventKind) {
  return EVENT_KINDS.find((k) => k.id === id) ?? EVENT_KINDS[3]
}

export const CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dollar américain', symbol: '$' },
  { code: 'GBP', label: 'Livre sterling', symbol: '£' },
  { code: 'CHF', label: 'Franc suisse', symbol: 'CHF' },
  { code: 'CAD', label: 'Dollar canadien', symbol: '$' },
]

export const GOAL_ICONS: string[] = [
  'piggy',
  'plane',
  'home',
  'car',
  'laptop',
  'gift',
  'shield',
  'cap',
  'heart',
  'sparkles',
  'wallet',
  'trend',
]
