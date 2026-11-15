import type {
  CalendarEvent,
  Goal,
  MonthBudget,
  Subscription,
  Transaction,
  VaultData,
} from './types'
import { addDays, addMonthsToIso, currentMonthKey, todayIso, uid } from './format'

const STORAGE_KEY = 'vault.data.v2'
const LEGACY_KEYS = ['vault.local.v1', 'vault.data.v1', 'vault:data']

export function emptyData(): VaultData {
  return {
    version: 2,
    profile: { name: '', currency: 'EUR', privacyMode: false },
    transactions: [],
    budgets: [],
    goals: [],
    subscriptions: [],
    events: [],
    demo: false,
  }
}

function normalize(raw: unknown): VaultData | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<VaultData> & Record<string, unknown>
  const base = emptyData()
  const txs = Array.isArray(obj.transactions) ? obj.transactions : []
  return {
    ...base,
    profile: {
      ...base.profile,
      ...(typeof obj.profile === 'object' && obj.profile ? obj.profile : {}),
    },
    transactions: txs
      .filter((t): t is Transaction => !!t && typeof (t as Transaction).amount === 'number')
      .map((t) => ({
        id: t.id ?? uid('tx'),
        type: t.type === 'income' ? 'income' : 'expense',
        name: String(t.name ?? 'Transaction'),
        amount: Math.abs(Number(t.amount) || 0),
        category: String(t.category ?? 'autre'),
        date: String(t.date ?? todayIso()).slice(0, 10),
        paymentMethod: t.paymentMethod ?? 'card',
        notes: String(t.notes ?? ''),
        recurrence: t.recurrence ?? 'none',
        createdAt: t.createdAt ?? new Date().toISOString(),
      })),
    budgets: Array.isArray(obj.budgets) ? (obj.budgets as MonthBudget[]) : [],
    goals: Array.isArray(obj.goals)
      ? (obj.goals as Goal[]).map((g) => ({ ...g, contributions: g.contributions ?? [] }))
      : [],
    subscriptions: Array.isArray(obj.subscriptions) ? (obj.subscriptions as Subscription[]) : [],
    events: Array.isArray(obj.events) ? (obj.events as CalendarEvent[]) : [],
    demo: Boolean(obj.demo),
  }
}

export function loadData(): VaultData {
  if (typeof window === 'undefined') return emptyData()
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed = normalize(JSON.parse(current))
      if (parsed) return parsed
    }
    for (const key of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(key)
      if (!legacy) continue
      const parsed = normalize(JSON.parse(legacy))
      if (parsed) {
        saveData(parsed)
        return parsed
      }
    }
  } catch {
    return emptyData()
  }
  return emptyData()
}

export function saveData(data: VaultData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* quota exceeded — keep the app usable */
  }
}

export function serialize(data: VaultData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)
}

export function parseImport(text: string): VaultData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Le fichier JSON est invalide.')
  }
  const data = normalize(parsed)
  if (!data) throw new Error('Structure de sauvegarde non reconnue.')
  if (!data.transactions.length && !data.goals.length && !data.subscriptions.length) {
    throw new Error('Cette sauvegarde ne contient aucune donnée exploitable.')
  }
  return data
}

function csvCell(value: string | number): string {
  const str = String(value)
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function transactionsToCsv(txs: Transaction[]): string {
  const header = ['Date', 'Libellé', 'Type', 'Catégorie', 'Montant', 'Moyen de paiement', 'Récurrence', 'Notes']
  const rows = [...txs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) =>
      [
        t.date,
        csvCell(t.name),
        t.type === 'income' ? 'Revenu' : 'Dépense',
        csvCell(t.category),
        String(t.type === 'income' ? t.amount : -t.amount).replace('.', ','),
        csvCell(t.paymentMethod),
        csvCell(t.recurrence),
        csvCell(t.notes),
      ].join(';'),
    )
  return [header.join(';'), ...rows].join('\n')
}

/* ---------------------------------- demo ---------------------------------- */

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648
    return s / 2_147_483_648
  }
}

export function demoData(): VaultData {
  const rand = seeded(20261115)
  const today = todayIso()
  const month = currentMonthKey()
  const txs: Transaction[] = []
  const push = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    txs.push({ ...t, id: uid('tx'), createdAt: new Date().toISOString() })
  }
  const round = (n: number) => Math.round(n * 100) / 100
  const dayIn = (monthKey: string, day: number) => `${monthKey}-${String(day).padStart(2, '0')}`

  for (let i = 5; i >= 0; i--) {
    const m = addMonthsToIso(`${month}-01`, -i).slice(0, 7)
    const isCurrent = i === 0
    const todayDay = Number(today.slice(8, 10))

    push({ type: 'income', name: 'Salaire — Studio Lumen', amount: 2850, category: 'salaire', date: dayIn(m, 2), paymentMethod: 'transfer', notes: 'Virement mensuel', recurrence: 'monthly' })
    push({ type: 'expense', name: 'Loyer appartement', amount: 980, category: 'logement', date: dayIn(m, 5), paymentMethod: 'direct_debit', notes: '', recurrence: 'monthly' })
    push({ type: 'expense', name: 'Forfait transport', amount: 75.2, category: 'transport', date: dayIn(m, 3), paymentMethod: 'card', notes: 'Navigo mensuel', recurrence: 'monthly' })
    push({ type: 'expense', name: 'Internet fibre', amount: 32.99, category: 'abonnements', date: dayIn(m, 8), paymentMethod: 'direct_debit', notes: '', recurrence: 'monthly' })
    push({ type: 'expense', name: 'Électricité', amount: round(68 + rand() * 30), category: 'logement', date: dayIn(m, 12), paymentMethod: 'direct_debit', notes: '', recurrence: 'monthly' })
    push({ type: 'expense', name: 'Virement épargne', amount: 250, category: 'epargne', date: dayIn(m, 6), paymentMethod: 'transfer', notes: 'Épargne automatique', recurrence: 'monthly' })

    const groceryRuns = 3 + Math.floor(rand() * 2)
    for (let g = 0; g < groceryRuns; g++) {
      const day = 3 + Math.floor(rand() * 24)
      if (isCurrent && day > todayDay) continue
      push({ type: 'expense', name: ['Supermarché', 'Marché du dimanche', 'Épicerie bio', 'Courses hebdo'][g % 4], amount: round(38 + rand() * 72), category: 'courses', date: dayIn(m, day), paymentMethod: 'card', notes: '', recurrence: 'none' })
    }

    const dinners = 1 + Math.floor(rand() * 3)
    for (let d = 0; d < dinners; d++) {
      const day = 4 + Math.floor(rand() * 23)
      if (isCurrent && day > todayDay) continue
      push({ type: 'expense', name: ['Restaurant italien', 'Café de quartier', 'Brunch', 'Sushi'][d % 4], amount: round(16 + rand() * 42), category: 'restaurants', date: dayIn(m, day), paymentMethod: 'card', notes: '', recurrence: 'none' })
    }

    if (rand() > 0.45) {
      const day = 9 + Math.floor(rand() * 18)
      if (!isCurrent || day <= todayDay) {
        push({ type: 'expense', name: 'Achat en ligne', amount: round(24 + rand() * 120), category: 'shopping', date: dayIn(m, day), paymentMethod: 'card', notes: '', recurrence: 'none' })
      }
    }
    if (rand() > 0.6) {
      const day = 7 + Math.floor(rand() * 20)
      if (!isCurrent || day <= todayDay) {
        push({ type: 'expense', name: 'Pharmacie', amount: round(12 + rand() * 38), category: 'sante', date: dayIn(m, day), paymentMethod: 'card', notes: '', recurrence: 'none' })
      }
    }
    if (i % 2 === 1) {
      push({ type: 'income', name: 'Mission freelance — identité visuelle', amount: round(420 + rand() * 380), category: 'freelance', date: dayIn(m, 18), paymentMethod: 'transfer', notes: '', recurrence: 'none' })
    }
    if (i === 2) {
      push({ type: 'income', name: 'Prime annuelle', amount: 1200, category: 'primes', date: dayIn(m, 15), paymentMethod: 'transfer', notes: 'Prime de fin d’année', recurrence: 'none' })
      push({ type: 'expense', name: 'Week-end à Lyon', amount: 286.4, category: 'voyages', date: dayIn(m, 20), paymentMethod: 'card', notes: 'Train + hôtel', recurrence: 'none' })
    }
  }

  const goals: Goal[] = [
    {
      id: uid('goal'),
      name: 'Voyage au Japon',
      target: 3500,
      saved: 1450,
      deadline: addMonthsToIso(today, 8),
      icon: 'plane',
      description: 'Deux semaines à Tokyo et Kyoto au printemps.',
      contributions: [
        { id: uid('c'), amount: 400, date: addMonthsToIso(today, -5), note: 'Démarrage' },
        { id: uid('c'), amount: 300, date: addMonthsToIso(today, -3), note: 'Épargne mensuelle' },
        { id: uid('c'), amount: 500, date: addMonthsToIso(today, -2), note: 'Prime' },
        { id: uid('c'), amount: 250, date: addMonthsToIso(today, -1), note: 'Épargne mensuelle' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid('goal'),
      name: 'Matelas de sécurité',
      target: 6000,
      saved: 3200,
      deadline: null,
      icon: 'shield',
      description: 'Six mois de dépenses en réserve.',
      contributions: [
        { id: uid('c'), amount: 2000, date: addMonthsToIso(today, -6), note: 'Fonds initial' },
        { id: uid('c'), amount: 1200, date: addMonthsToIso(today, -2), note: 'Renfort' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid('goal'),
      name: 'Nouvel ordinateur',
      target: 1800,
      saved: 620,
      deadline: addMonthsToIso(today, 4),
      icon: 'laptop',
      description: 'MacBook Air pour le travail indépendant.',
      contributions: [{ id: uid('c'), amount: 620, date: addMonthsToIso(today, -3), note: 'Premier versement' }],
      createdAt: new Date().toISOString(),
    },
  ]

  const subscriptions: Subscription[] = [
    { id: uid('sub'), name: 'Netflix', amount: 13.49, cycle: 'monthly', nextPayment: addDays(today, 4), category: 'abonnements', description: 'Offre Standard', active: true, createdAt: new Date().toISOString() },
    { id: uid('sub'), name: 'Spotify', amount: 10.99, cycle: 'monthly', nextPayment: addDays(today, 11), category: 'abonnements', description: 'Premium individuel', active: true, createdAt: new Date().toISOString() },
    { id: uid('sub'), name: 'iCloud+', amount: 2.99, cycle: 'monthly', nextPayment: addDays(today, 19), category: 'abonnements', description: '200 Go', active: true, createdAt: new Date().toISOString() },
    { id: uid('sub'), name: 'Salle de sport', amount: 29.9, cycle: 'monthly', nextPayment: addDays(today, 2), category: 'sante', description: 'Abonnement annuel mensualisé', active: true, createdAt: new Date().toISOString() },
    { id: uid('sub'), name: 'Adobe Creative Cloud', amount: 239.88, cycle: 'yearly', nextPayment: addDays(today, 63), category: 'abonnements', description: 'Suite complète — usage pro', active: true, createdAt: new Date().toISOString() },
  ]

  const budgets: MonthBudget[] = [
    {
      month,
      overall: 1850,
      categories: { logement: 1050, courses: 320, restaurants: 180, transport: 90, abonnements: 70, loisirs: 80, shopping: 90, sante: 60 },
      updatedAt: new Date().toISOString(),
    },
    {
      month: addMonthsToIso(`${month}-01`, -1).slice(0, 7),
      overall: 1800,
      categories: { logement: 1050, courses: 300, restaurants: 160, transport: 90, abonnements: 70, loisirs: 70, shopping: 80 },
      updatedAt: new Date().toISOString(),
    },
  ]

  const events: CalendarEvent[] = [
    { id: uid('ev'), title: 'Loyer', date: `${month}-05`, amount: 980, kind: 'bill', paid: true, notes: 'Prélèvement automatique', createdAt: new Date().toISOString() },
    { id: uid('ev'), title: 'Assurance auto', date: addDays(today, 3), amount: 62.4, kind: 'bill', paid: false, notes: '', createdAt: new Date().toISOString() },
    { id: uid('ev'), title: 'Électricité', date: addDays(today, 6), amount: 84.2, kind: 'bill', paid: false, notes: 'Facture mensuelle', createdAt: new Date().toISOString() },
    { id: uid('ev'), title: 'Versement objectif Japon', date: addDays(today, 9), amount: 250, kind: 'savings', paid: false, notes: '', createdAt: new Date().toISOString() },
    { id: uid('ev'), title: 'Remboursement mutuelle', date: addDays(today, 14), amount: 45, kind: 'income', paid: false, notes: '', createdAt: new Date().toISOString() },
  ]

  return {
    version: 2,
    profile: { name: 'Camille', currency: 'EUR', privacyMode: false },
    transactions: txs,
    budgets,
    goals,
    subscriptions,
    events,
    demo: true,
  }
}
