export type RangeKey = '7d' | '30d' | '3m' | '6m' | '1y'

export const RANGES: { id: RangeKey; label: string; months: number }[] = [
  { id: '7d', label: '7 jours', months: 0 },
  { id: '30d', label: '30 jours', months: 1 },
  { id: '3m', label: '3 mois', months: 3 },
  { id: '6m', label: '6 mois', months: 6 },
  { id: '1y', label: '1 an', months: 12 },
]

export function rangeLabel(id: RangeKey): string {
  return RANGES.find((r) => r.id === id)?.label ?? '30 jours'
}

export function formatMoney(
  value: number,
  currency = 'EUR',
  opts: { decimals?: boolean; signed?: boolean; masked?: boolean } = {},
): string {
  const { decimals = false, signed = false, masked = false } = opts
  if (masked) return '••••'
  const abs = Math.abs(value)
  const text = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(abs)
  if (value < 0) return `−${text}`
  return signed ? `+${text}` : text
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(value: number, currency = 'EUR', masked = false): string {
  if (masked) return '••••'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} M€`
  if (abs >= 10_000) return `${formatNumber(value / 1000, 1)} k€`
  return formatMoney(value, currency)
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatNumber(value, decimals)} %`
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

export function todayIso(): string {
  return toIso(new Date())
}

export function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function currentMonthKey(): string {
  return todayIso().slice(0, 7)
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return toIso(d).slice(0, 7)
}

export function monthStart(month: string): string {
  return `${month}-01`
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatDate(iso: string, style: 'short' | 'long' | 'day' = 'short'): string {
  if (!iso) return '—'
  const d = fromIso(iso.slice(0, 10))
  if (style === 'long') {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  }
  if (style === 'day') {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(d)
  }
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d)
}

export function formatMonth(month: string, style: 'long' | 'short' = 'long'): string {
  const d = fromIso(`${month}-01`)
  if (style === 'short') {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)
  }
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function monthShort(month: string): string {
  const d = fromIso(`${month}-01`)
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)
  return label.replace('.', '')
}

export function weekdayShort(iso: string): string {
  const d = fromIso(iso)
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '')
}

export function relativeDay(iso: string): string {
  const today = todayIso()
  if (iso === today) return "Aujourd'hui"
  const diff = daysBetween(today, iso)
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 1 && diff <= 7) return `Dans ${diff} jours`
  if (diff < -1 && diff >= -7) return `Il y a ${Math.abs(diff)} jours`
  return formatDate(iso)
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const a = fromIso(fromIsoDate).getTime()
  const b = fromIso(toIsoDate).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function addDays(iso: string, delta: number): string {
  const d = fromIso(iso)
  d.setDate(d.getDate() + delta)
  return toIso(d)
}

export function addMonthsToIso(iso: string, delta: number): string {
  const d = fromIso(iso)
  const day = d.getDate()
  d.setMonth(d.getMonth() + delta)
  if (d.getDate() < day) d.setDate(0)
  return toIso(d)
}

export function rangeStart(range: RangeKey): string {
  const map: Record<RangeKey, number> = { '7d': 6, '30d': 29, '3m': 89, '6m': 181, '1y': 364 }
  return addDays(todayIso(), -map[range])
}

export function inRange(iso: string, range: RangeKey): boolean {
  const start = rangeStart(range)
  const today = todayIso()
  return iso >= start && iso <= today
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'V'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}
