import { CURRENCIES, MONTH_NAMES } from './constants'

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}

export function formatMoney(
  value: number,
  currency = 'EUR',
  opts: { masked?: boolean; signed?: boolean; decimals?: boolean } = {},
): string {
  const { masked = false, signed = false, decimals = true } = opts
  if (masked) return '••••'
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(abs)
  if (signed && value !== 0) return `${value < 0 ? '−' : '+'}${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatCompact(value: number, currency = 'EUR', masked = false): string {
  if (masked) return '••••'
  const symbol = currencySymbol(currency)
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function parseAmount(raw: string): number {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) / 100 : NaN
}

/** Formats an ISO date (YYYY-MM-DD) for display. */
export function formatDate(iso: string, style: 'short' | 'long' = 'short'): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: style === 'long' ? 'long' : 'short',
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

export function formatMonth(monthIso: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = monthIso.split('-').map(Number)
  if (!y || !m) return monthIso
  const name = MONTH_NAMES[m - 1] ?? ''
  return style === 'short' ? `${name.slice(0, 3)} ${y}` : `${name} ${y}`
}

export function relativeDay(iso: string): string {
  const today = todayIso()
  if (iso === today) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diff = Math.round((todayUtc - date.getTime()) / 86_400_000)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return formatDate(iso)
}

export function todayIso(): string {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthStart(monthKey: string): string {
  return `${monthKey}-01`
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || '').trim()
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
  }
  return (email || 'V').slice(0, 2).toUpperCase()
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (cell: string) => {
    const value = cell ?? ''
    return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  }
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
