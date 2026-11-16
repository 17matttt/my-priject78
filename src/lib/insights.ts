import type {
  CalEvent,
  ClassSlot,
  EventCategory,
  FocusSession,
  MailMessage,
  PageKey,
  Task,
  VaultState,
} from '../types'
import {
  addDays,
  daysUntil,
  fmtDateShort,
  fmtTime,
  isoDate,
  minutesBetween,
  parseDate,
  relativeDay,
  startOfDay,
  weekdayShort,
} from './date'
import { round } from './format'

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  class: 'Class',
  study: 'Study',
  training: 'Training',
  personal: 'Personal',
  exam: 'Exam',
  work: 'Work',
}

export const CATEGORY_TONES: Record<EventCategory, string> = {
  class: 'accent',
  study: 'violet',
  training: 'good',
  personal: 'warn',
  exam: 'bad',
  work: 'neutral',
}

export type AgendaKind = 'class' | 'event' | 'task' | 'homework'

export interface AgendaItem {
  id: string
  kind: AgendaKind
  title: string
  subtitle: string
  start: string
  end?: string
  category: EventCategory | 'task' | 'homework'
  location?: string
  done?: boolean
  demo?: boolean
}

export function agendaFor(state: VaultState, date: Date): AgendaItem[] {
  const key = isoDate(date)
  const weekday = date.getDay()
  const items: AgendaItem[] = []

  for (const slot of state.classes) {
    if (slot.weekday !== weekday) continue
    items.push({
      id: slot.id,
      kind: 'class',
      title: slot.subject,
      subtitle: `${slot.teacher}${slot.room ? ` · Room ${slot.room}` : ''}`,
      start: `${key}T${slot.start}`,
      end: `${key}T${slot.end}`,
      category: 'class',
      location: slot.room,
      demo: slot.demo,
    })
  }

  for (const event of state.events) {
    if (!event.start.startsWith(key)) continue
    items.push({
      id: event.id,
      kind: 'event',
      title: event.title,
      subtitle: event.location || CATEGORY_LABELS[event.category],
      start: event.start,
      end: event.end,
      category: event.category,
      location: event.location,
      demo: event.demo,
    })
  }

  for (const homework of state.homework) {
    if (homework.due !== key) continue
    items.push({
      id: homework.id,
      kind: 'homework',
      title: homework.title,
      subtitle: `${homework.subject} · homework due`,
      start: `${key}T23:30`,
      category: 'homework',
      done: homework.done,
      demo: homework.demo,
    })
  }

  for (const task of state.tasks) {
    if (task.due !== key) continue
    items.push({
      id: task.id,
      kind: 'task',
      title: task.title,
      subtitle: `${task.category} · task due`,
      start: `${key}T18:00`,
      category: 'task',
      done: task.done,
      demo: task.demo,
    })
  }

  return items.sort((a, b) => a.start.localeCompare(b.start))
}

export function agendaWindow(state: VaultState, days = 7, from = new Date()): AgendaItem[] {
  const items: AgendaItem[] = []
  for (let index = 0; index < days; index++) {
    const date = addDays(startOfDay(from), index)
    for (const item of agendaFor(state, date)) {
      if (index === 0 && parseDate(item.start).getTime() < from.getTime() - 45 * 60000) continue
      items.push(item)
    }
  }
  return items
}

export function nextClass(state: VaultState): ClassSlot | null {
  const now = new Date()
  const today = isoDate(now)
  for (let index = 0; index < 7; index++) {
    const date = addDays(startOfDay(now), index)
    const slots = state.classes
      .filter((slot) => slot.weekday === date.getDay())
      .sort((a, b) => a.start.localeCompare(b.start))
    for (const slot of slots) {
      const start = parseDate(`${isoDate(date)}T${slot.start}`)
      if (start.getTime() > now.getTime()) return slot
      if (index > 0) return slot
    }
    if (index === 0 && slots.length > 0 && today) {
      // all of today's classes have finished — continue to the next day
    }
  }
  return null
}

export function nextExam(state: VaultState): CalEvent | null {
  const now = Date.now()
  return (
    state.events
      .filter((event) => event.category === 'exam' && parseDate(event.start).getTime() >= now - 3600000)
      .sort((a, b) => a.start.localeCompare(b.start))[0] || null
  )
}

export function nextHomework(state: VaultState): { subject: string; title: string; due: string } | null {
  const open = state.homework
    .filter((item) => !item.done)
    .sort((a, b) => a.due.localeCompare(b.due))[0]
  return open ? { subject: open.subject, title: open.title, due: open.due } : null
}

export function tasksDueOn(state: VaultState, date = new Date()): Task[] {
  const key = isoDate(date)
  return state.tasks.filter((task) => !task.done && task.due === key)
}

export function overdueTasks(state: VaultState): Task[] {
  const key = isoDate(new Date())
  return state.tasks.filter((task) => !task.done && !!task.due && task.due < key)
}

export function unreadMail(state: VaultState): MailMessage[] {
  return state.messages.filter((message) => message.folder === 'inbox' && !message.read)
}

export function focusMinutesOn(state: VaultState, date = new Date()): number {
  const key = isoDate(date)
  return state.focusSessions
    .filter((session) => session.mode === 'focus' && session.startedAt.slice(0, 10) === key)
    .reduce((sum, session) => sum + session.minutes, 0)
}

export function focusSeries(state: VaultState, days = 7): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = []
  for (let index = days - 1; index >= 0; index--) {
    const date = addDays(startOfDay(new Date()), -index)
    out.push({ label: weekdayShort(date.getDay() === 0 ? 6 : date.getDay() - 1), value: focusMinutesOn(state, date) })
  }
  return out
}

export function focusStreak(state: VaultState): number {
  let streak = 0
  for (let index = 0; index < 60; index++) {
    const date = addDays(startOfDay(new Date()), -index)
    if (focusMinutesOn(state, date) > 0) streak += 1
    else if (index > 0) break
  }
  return streak
}

export function focusByLabel(state: VaultState): { label: string; value: number }[] {
  const totals = new Map<string, number>()
  for (const session of state.focusSessions) {
    if (session.mode !== 'focus') continue
    const label = session.label.trim() || 'Unlabelled'
    totals.set(label, (totals.get(label) || 0) + session.minutes)
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function tasksCompletedSeries(state: VaultState, days = 7): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = []
  for (let index = days - 1; index >= 0; index--) {
    const date = addDays(startOfDay(new Date()), -index)
    const key = isoDate(date)
    const value = state.tasks.filter((task) => task.completedAt?.slice(0, 10) === key).length
    out.push({ label: weekdayShort(date.getDay() === 0 ? 6 : date.getDay() - 1), value })
  }
  return out
}

export function completedLast7(state: VaultState): number {
  return state.tasks.filter((task) => {
    if (!task.completedAt) return false
    return daysUntil(task.completedAt.slice(0, 10)) >= -7
  }).length
}

export function workloadNext7(state: VaultState): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = []
  for (let index = 0; index < 7; index++) {
    const date = addDays(startOfDay(new Date()), index)
    const key = isoDate(date)
    const tasks = state.tasks.filter((task) => !task.done && task.due === key).length
    const homework = state.homework.filter((item) => !item.done && item.due === key).length
    const exams = state.events.filter((event) => event.category === 'exam' && event.start.startsWith(key)).length
    out.push({
      label: weekdayShort(date.getDay() === 0 ? 6 : date.getDay() - 1),
      value: tasks + homework + exams * 3,
    })
  }
  return out
}

export interface SubjectAverage {
  subject: string
  average: number
  count: number
}

export function subjectAverages(state: VaultState): SubjectAverage[] {
  const groups = new Map<string, { weighted: number; coefficient: number; count: number }>()
  for (const grade of state.grades) {
    const normalised = (grade.score / (grade.outOf || 20)) * 20
    const entry = groups.get(grade.subject) || { weighted: 0, coefficient: 0, count: 0 }
    entry.weighted += normalised * (grade.coefficient || 1)
    entry.coefficient += grade.coefficient || 1
    entry.count += 1
    groups.set(grade.subject, entry)
  }
  return [...groups.entries()]
    .map(([subject, entry]) => ({
      subject,
      average: round(entry.weighted / (entry.coefficient || 1), 1),
      count: entry.count,
    }))
    .sort((a, b) => b.average - a.average)
}

export function overallAverage(state: VaultState): number | null {
  if (state.grades.length === 0) return null
  const weighted = state.grades.reduce(
    (sum, grade) => sum + (grade.score / (grade.outOf || 20)) * 20 * (grade.coefficient || 1),
    0,
  )
  const coefficients = state.grades.reduce((sum, grade) => sum + (grade.coefficient || 1), 0)
  return round(weighted / (coefficients || 1), 1)
}

export interface Notification {
  id: string
  title: string
  detail: string
  page: PageKey
  tone: 'accent' | 'violet' | 'good' | 'warn' | 'bad' | 'neutral'
}

export function notifications(state: VaultState): Notification[] {
  const out: Notification[] = []
  const now = new Date()
  const unread = unreadMail(state)
  const due = tasksDueOn(state, now)
  const overdue = overdueTasks(state)

  if (state.prefs.notifications.mail && unread.length > 0) {
    out.push({
      id: 'notif-mail',
      title: `${unread.length} unread email${unread.length === 1 ? '' : 's'}`,
      detail: unread[0].subject,
      page: 'mail',
      tone: 'accent',
    })
  }

  if (state.prefs.notifications.tasks && overdue.length > 0) {
    out.push({
      id: 'notif-overdue',
      title: `${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}`,
      detail: overdue[0].title,
      page: 'tasks',
      tone: 'bad',
    })
  }

  if (state.prefs.notifications.tasks && due.length > 0) {
    out.push({
      id: 'notif-tasks',
      title: `${due.length} task${due.length === 1 ? '' : 's'} due today`,
      detail: due.map((task) => task.title).slice(0, 2).join(' · '),
      page: 'tasks',
      tone: 'warn',
    })
  }

  if (state.prefs.notifications.school) {
    for (const item of state.homework.filter((entry) => !entry.done).slice(0, 12)) {
      const remaining = daysUntil(item.due)
      if (remaining >= 0 && remaining <= 2) {
        out.push({
          id: `notif-hw-${item.id}`,
          title: `${item.title} due ${relativeDay(item.due).toLowerCase()}`,
          detail: item.subject,
          page: 'school',
          tone: 'violet',
        })
      }
    }
    const exam = nextExam(state)
    if (exam) {
      const remaining = daysUntil(exam.start)
      if (remaining >= 0 && remaining <= 7) {
        out.push({
          id: `notif-exam-${exam.id}`,
          title: `${exam.title} in ${remaining === 0 ? 'today' : `${remaining} day${remaining === 1 ? '' : 's'}`}`,
          detail: `${fmtDateShort(exam.start)} · ${fmtTime(exam.start)}`,
          page: 'calendar',
          tone: 'bad',
        })
      }
    }
  }

  if (state.prefs.notifications.focus) {
    const today = focusMinutesOn(state, now)
    if (state.focusGoal > 0 && today < state.focusGoal) {
      out.push({
        id: 'notif-focus',
        title: `Focus goal ${today} / ${state.focusGoal} min`,
        detail: 'Start a session to close the gap.',
        page: 'focus',
        tone: 'accent',
      })
    }
  }

  return out
}

export interface Insight {
  id: string
  kind: 'fact' | 'idea'
  text: string
  page: PageKey
}

function freeWindowToday(state: VaultState, from = new Date()): { start: Date; end: Date; minutes: number } | null {
  const busy = agendaFor(state, from)
    .filter((item) => item.kind === 'event' || item.kind === 'class')
    .map((item) => ({
      start: parseDate(item.start),
      end: parseDate(item.end || item.start),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const dayEnd = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 0, 0, 0)
  let cursor = new Date(from)
  for (const block of busy) {
    if (block.end.getTime() <= cursor.getTime()) continue
    if (block.start.getTime() - cursor.getTime() >= 45 * 60000) {
      return { start: cursor, end: block.start, minutes: Math.round((block.start.getTime() - cursor.getTime()) / 60000) }
    }
    if (block.end.getTime() > cursor.getTime()) cursor = block.end
  }
  const tail = Math.round((dayEnd.getTime() - cursor.getTime()) / 60000)
  if (tail >= 45) return { start: cursor, end: dayEnd, minutes: tail }
  return null
}

export function intelligence(state: VaultState): Insight[] {
  const out: Insight[] = []
  const now = new Date()

  const exam = nextExam(state)
  if (exam) {
    const remaining = daysUntil(exam.start)
    if (remaining <= 7) {
      out.push({
        id: 'ins-exam',
        kind: 'fact',
        text: `You have <b>${exam.title.toLowerCase()}</b> ${remaining === 0 ? 'today' : remaining === 1 ? 'tomorrow' : `in ${remaining} days`}${exam.location ? ` in ${exam.location}` : ''}.`,
        page: 'calendar',
      })
    }
  }

  if (exam) {
    const tokens = `${exam.title} ${exam.notes}`.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 4)
    const related = state.messages.find((message) => {
      if (message.folder === 'archive') return false
      const haystack = `${message.subject} ${message.body}`.toLowerCase()
      return tokens.some((token) => haystack.includes(token))
    })
    if (related) {
      out.push({
        id: 'ins-mail',
        kind: 'fact',
        text: `<b>${related.fromName}</b> sent “${related.subject}”, which mentions your upcoming test.`,
        page: 'mail',
      })
    }
  }

  const homework = nextHomework(state)
  if (homework) {
    out.push({
      id: 'ins-hw',
      kind: 'fact',
      text: `You have <b>${homework.title}</b> due ${relativeDay(homework.due).toLowerCase()} (${homework.subject}).`,
      page: 'school',
    })
  }

  const training = state.events
    .filter((event) => event.category === 'training' && parseDate(event.start).getTime() >= now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  if (training) {
    const date = parseDate(training.start)
    out.push({
      id: 'ins-training',
      kind: 'fact',
      text: `You have <b>${training.title.toLowerCase()}</b> on ${WEEKDAY_LABELS[date.getDay()]} at ${fmtTime(training.start)}.`,
      page: 'calendar',
    })
  }

  const due = tasksDueOn(state, now)
  if (due.length > 0) {
    out.push({
      id: 'ins-due',
      kind: 'fact',
      text: `<b>${due.length} task${due.length === 1 ? '' : 's'}</b> due today — ${due
        .slice(0, 2)
        .map((task) => task.title.toLowerCase())
        .join(' and ')}.`,
      page: 'tasks',
    })
  }

  const free = freeWindowToday(state, now)
  if (free) {
    const label = `${Math.floor(free.minutes / 60)}h${free.minutes % 60 ? ` ${free.minutes % 60}m` : ''}`
    const hint = exam ? 'to revise for your test' : homework ? 'to finish your homework' : 'to start a focus session'
    out.push({
      id: 'ins-free',
      kind: 'idea',
      text: `You have <b>${label} free</b> from ${fmtTime(`${isoDate(free.start)}T${String(free.start.getHours()).padStart(2, '0')}:${String(free.start.getMinutes()).padStart(2, '0')}`)}. A good window ${hint}.`,
      page: 'focus',
    })
  }

  const today = agendaFor(state, now).filter((item) => item.kind === 'event' || item.kind === 'class')
  for (let i = 0; i < today.length; i++) {
    for (let j = i + 1; j < today.length; j++) {
      const a = today[i]
      const b = today[j]
      if (!a.end || !b.end) continue
      if (parseDate(a.start) < parseDate(b.end) && parseDate(b.start) < parseDate(a.end)) {
        out.push({
          id: `ins-conflict-${a.id}-${b.id}`,
          kind: 'fact',
          text: `<b>${a.title}</b> and <b>${b.title}</b> overlap today.`,
          page: 'calendar',
        })
      }
    }
  }

  const unread = unreadMail(state)
  if (unread.length > 0) {
    out.push({
      id: 'ins-inbox',
      kind: 'fact',
      text: `<b>${unread.length} unread email${unread.length === 1 ? '' : 's'}</b> in your inbox, latest from ${unread[0].fromName}.`,
      page: 'mail',
    })
  }

  return out.slice(0, 6)
}

export function dailyBriefing(state: VaultState): string {
  const now = new Date()
  const items = agendaFor(state, now)
  const due = tasksDueOn(state, now)
  const unread = unreadMail(state)
  const parts: string[] = []

  if (items.length > 0) {
    const first = items[0]
    parts.push(`${items.length} item${items.length === 1 ? '' : 's'} scheduled, starting with ${first.title} at ${fmtTime(first.start)}`)
  } else {
    parts.push('Nothing scheduled today')
  }
  if (due.length > 0) parts.push(`${due.length} task${due.length === 1 ? '' : 's'} due`)
  if (unread.length > 0) parts.push(`${unread.length} unread email${unread.length === 1 ? '' : 's'}`)
  if (parts.length === 1) parts.push('your day is clear')
  return `${parts.join(' · ')}.`
}

export interface SearchHit {
  id: string
  kind: string
  title: string
  sub: string
  page: PageKey
}

export function searchAll(state: VaultState, rawQuery: string): SearchHit[] {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < 2) return []
  const hits: SearchHit[] = []
  const match = (value: string) => value.toLowerCase().includes(query)

  for (const task of state.tasks) {
    if (match(task.title) || match(task.notes) || match(task.category)) {
      hits.push({ id: task.id, kind: 'Task', title: task.title, sub: `${task.category}${task.done ? ' · done' : ''}`, page: 'tasks' })
    }
  }
  for (const message of state.messages) {
    if (match(message.subject) || match(message.body) || match(message.fromName)) {
      hits.push({ id: message.id, kind: 'Email', title: message.subject, sub: `${message.fromName} · ${message.folder}`, page: 'mail' })
    }
  }
  for (const event of state.events) {
    if (match(event.title) || match(event.location)) {
      hits.push({ id: event.id, kind: 'Event', title: event.title, sub: `${fmtDateShort(event.start)} · ${fmtTime(event.start)}`, page: 'calendar' })
    }
  }
  for (const item of state.homework) {
    if (match(item.title) || match(item.subject)) {
      hits.push({ id: item.id, kind: 'Homework', title: item.title, sub: `${item.subject} · due ${fmtDateShort(item.due)}`, page: 'school' })
    }
  }
  for (const document of state.documents) {
    if (match(document.name) || match(document.folder)) {
      hits.push({ id: document.id, kind: 'Document', title: document.name, sub: `${document.folder} · ${document.category}`, page: 'documents' })
    }
  }
  for (const announcement of state.announcements) {
    if (match(announcement.title) || match(announcement.body)) {
      hits.push({ id: announcement.id, kind: 'Announcement', title: announcement.title, sub: fmtDateShort(announcement.date), page: 'school' })
    }
  }
  for (const grade of state.grades) {
    if (match(grade.subject) || match(grade.title)) {
      hits.push({ id: grade.id, kind: 'Grade', title: grade.title, sub: `${grade.subject} · ${grade.score}/${grade.outOf}`, page: 'school' })
    }
  }

  return hits.slice(0, 24)
}

export function askVault(state: VaultState, question: string): { answer: string; sources: string[] } {
  const q = question.toLowerCase().trim()
  const now = new Date()

  if (!q) return { answer: 'Ask about your day, tasks, email, school or focus time.', sources: [] }

  if (/(today|aujourd|now|schedule|agenda|day)/.test(q)) {
    const items = agendaFor(state, now)
    if (items.length === 0) return { answer: 'Nothing is scheduled today. Your calendar is clear.', sources: ['Calendar', 'School timetable'] }
    const list = items
      .slice(0, 6)
      .map((item) => `${fmtTime(item.start)} ${item.title}`)
      .join(', ')
    return { answer: `Today: ${list}. ${dailyBriefing(state)}`, sources: ['Calendar', 'School timetable', 'Tasks'] }
  }

  if (/(test|exam|contrôle|revision)/.test(q)) {
    const exam = nextExam(state)
    if (!exam) return { answer: 'No exam is stored in your calendar yet.', sources: ['Calendar'] }
    return {
      answer: `Next exam: ${exam.title} on ${fmtDateShort(exam.start)} at ${fmtTime(exam.start)}${exam.location ? ` in ${exam.location}` : ''}. ${exam.notes}`.trim(),
      sources: ['Calendar'],
    }
  }

  if (/(homework|devoir|assignment|due)/.test(q)) {
    const open = state.homework.filter((item) => !item.done).sort((a, b) => a.due.localeCompare(b.due))
    if (open.length === 0) return { answer: 'No open homework. Everything is handed in.', sources: ['School'] }
    return {
      answer: `${open.length} open homework: ${open
        .slice(0, 3)
        .map((item) => `${item.title} (${item.subject}, due ${relativeDay(item.due).toLowerCase()})`)
        .join('; ')}.`,
      sources: ['School'],
    }
  }

  if (/(mail|email|inbox|message)/.test(q)) {
    const unread = unreadMail(state)
    if (unread.length === 0) return { answer: 'No unread email in your inbox.', sources: ['Mail Center'] }
    return {
      answer: `${unread.length} unread: ${unread
        .slice(0, 3)
        .map((message) => `${message.fromName} — “${message.subject}”`)
        .join('; ')}.`,
      sources: ['Mail Center'],
    }
  }

  if (/(task|todo|priority|focus on)/.test(q)) {
    const open = state.tasks.filter((task) => !task.done)
    const ranked = open
      .slice()
      .sort((a, b) => {
        const weight = { high: 0, medium: 1, low: 2 }
        const byPriority = weight[a.priority] - weight[b.priority]
        if (byPriority !== 0) return byPriority
        return (a.due || '9999').localeCompare(b.due || '9999')
      })
    if (ranked.length === 0) return { answer: 'No open tasks. Add one from any page with the quick add button.', sources: ['Tasks'] }
    return {
      answer: `${ranked.length} open task${ranked.length === 1 ? '' : 's'}. Start with “${ranked[0].title}”${ranked[0].due ? ` (due ${relativeDay(ranked[0].due).toLowerCase()})` : ''}.`,
      sources: ['Tasks'],
    }
  }

  if (/(focus|pomodoro|study time|concentrat)/.test(q)) {
    const today = focusMinutesOn(state, now)
    const week = state.focusSessions.filter((session) => session.mode === 'focus' && daysUntil(session.startedAt.slice(0, 10)) >= -6)
    const weekMinutes = week.reduce((sum, session) => sum + session.minutes, 0)
    return {
      answer: `Today: ${today} min focused, goal ${state.focusGoal} min. Last 7 days: ${weekMinutes} min across ${week.length} session${week.length === 1 ? '' : 's'}.`,
      sources: ['Focus sessions'],
    }
  }

  if (/(free|time|window|when can)/.test(q)) {
    const free = freeWindowToday(state, now)
    if (!free) return { answer: 'No free window of at least 45 minutes is left today.', sources: ['Calendar'] }
    return {
      answer: `You have ${Math.floor(free.minutes / 60)}h${free.minutes % 60 ? ` ${free.minutes % 60}m` : ''} free from ${fmtTime(`${isoDate(free.start)}T${String(free.start.getHours()).padStart(2, '0')}:${String(free.start.getMinutes()).padStart(2, '0')}`)}.`,
      sources: ['Calendar'],
    }
  }

  if (/(grade|note|average|result)/.test(q)) {
    const average = overallAverage(state)
    if (average === null) return { answer: 'No grades stored yet.', sources: ['School'] }
    const subjects = subjectAverages(state)
      .slice(0, 3)
      .map((entry) => `${entry.subject} ${entry.average}/20`)
      .join(', ')
    return { answer: `Weighted average: ${average}/20. Best subjects: ${subjects}.`, sources: ['School'] }
  }

  if (/(document|file|pdf)/.test(q)) {
    if (state.documents.length === 0) return { answer: 'No documents stored yet.', sources: ['Documents'] }
    return {
      answer: `${state.documents.length} document${state.documents.length === 1 ? '' : 's'}: ${state.documents
        .slice(0, 3)
        .map((document) => document.name)
        .join(', ')}.`,
      sources: ['Documents'],
    }
  }

  const hits = searchAll(state, q)
  if (hits.length > 0) {
    return {
      answer: `${hits.length} match${hits.length === 1 ? '' : 'es'}: ${hits
        .slice(0, 3)
        .map((hit) => `${hit.kind.toLowerCase()} “${hit.title}”`)
        .join(', ')}.`,
      sources: ['Local search'],
    }
  }

  return {
    answer:
      'I can only answer from data stored in VAULT — tasks, email, school, calendar, focus sessions and documents. Nothing matched that question.',
    sources: [],
  }
}

export function conflictCount(state: VaultState, date = new Date()): number {
  const items = agendaFor(state, date).filter((item) => item.kind === 'event' || item.kind === 'class')
  let count = 0
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (!a.end || !b.end) continue
      if (parseDate(a.start) < parseDate(b.end) && parseDate(b.start) < parseDate(a.end)) count += 1
    }
  }
  return count
}

export function sessionMinutes(sessions: FocusSession[]): number {
  return sessions.filter((session) => session.mode === 'focus').reduce((sum, session) => sum + session.minutes, 0)
}

export function classDuration(slot: ClassSlot): number {
  return minutesBetween(`${isoDate(new Date())}T${slot.start}`, `${isoDate(new Date())}T${slot.end}`)
}
