const MONTHS = [
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

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const pad = (n: number) => String(n).padStart(2, '0')

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoDateTime(d: Date): string {
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Parses both `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm` without timezone drift. */
export function parseDate(value: string): Date {
  const [datePart, timePart] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = (timePart || '00:00').split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0)
}

export function todayISO(): string {
  return isoDate(new Date())
}

export function nowStamp(): string {
  return new Date().toISOString()
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfWeek(d: Date, mondayStart = true): Date {
  const day = d.getDay()
  const diff = mondayStart ? (day === 0 ? -6 : 1 - day) : -day
  return startOfDay(addDays(d, diff))
}

/** Six weeks of dates covering the given month, starting on Monday. */
export function monthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const gridStart = startOfWeek(first, true)
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) week.push(addDays(gridStart, w * 7 + d))
    weeks.push(week)
  }
  return weeks
}

export function weekdayName(index: number): string {
  return WEEKDAYS[((index % 7) + 7) % 7]
}

export function weekdayShort(index: number): string {
  return weekdayName(index).slice(0, 3)
}

export function monthName(index: number): string {
  return MONTHS[((index % 12) + 12) % 12]
}

export function fmtTime(value: string): string {
  const d = value.includes('T') ? parseDate(value) : parseDate(`2000-01-01T${value}`)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDateShort(value: string): string {
  const d = parseDate(value)
  return `${monthName(d.getMonth()).slice(0, 3)} ${d.getDate()}`
}

export function fmtDateLong(value: string): string {
  const d = parseDate(value)
  return `${weekdayName(d.getDay() === 0 ? 6 : d.getDay() - 1)}, ${d.getDate()} ${monthName(
    d.getMonth(),
  )}`
}

export function dayNumber(value: string): number {
  return parseDate(value).getDate()
}

export function relativeDay(value: string): string {
  const target = startOfDay(parseDate(value))
  const today = startOfDay(new Date())
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `In ${diff} days`
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`
  return fmtDateShort(value)
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function timeAgo(value: string): string {
  const then = parseDate(value).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(then)) return ''
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return fmtDateShort(value)
}

export function durationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function minutesBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 60000)
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return parseDate(aStart) < parseDate(bEnd) && parseDate(bStart) < parseDate(aEnd)
}

export function daysUntil(value: string): number {
  const target = startOfDay(parseDate(value))
  const today = startOfDay(new Date())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function monthKey(value: string): string {
  const d = parseDate(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthKeyLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${monthName((m || 1) - 1).slice(0, 3)} ${String(y).slice(2)}`
}
