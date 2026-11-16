const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
}

export function symbolFor(code: string): string {
  return SYMBOLS[code] ?? '$'
}

export function money(value: number, code = 'USD', compact = false): string {
  const safe = Number.isFinite(value) ? value : 0
  if (compact && Math.abs(safe) >= 1000) {
    const units = [
      { limit: 1_000_000_000, suffix: 'B' },
      { limit: 1_000_000, suffix: 'M' },
      { limit: 1_000, suffix: 'K' },
    ]
    for (const unit of units) {
      if (Math.abs(safe) >= unit.limit) {
        const scaled = safe / unit.limit
        const digits = Math.abs(scaled) >= 100 ? 0 : 1
        return `${symbolFor(code)}${scaled.toFixed(digits).replace(/\.0$/, '')}${unit.suffix}`
      }
    }
  }
  return `${symbolFor(code)}${Math.round(safe).toLocaleString('en-US')}`
}

export function compact(value: number, code = 'USD'): string {
  return money(value, code, true)
}

export function percent(value: number, digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe.toFixed(digits)}%`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function dayMonth(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

export function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const idx = Number(month) - 1
  return `${MONTHS[idx] ?? '?'} ${year.slice(2)}`
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function isOverdue(iso: string): boolean {
  const due = new Date(iso).getTime()
  if (Number.isNaN(due)) return false
  return due < Date.now()
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : pluralForm ?? `${singular}s`
}
