export type ID = string

export type PageKey =
  | 'overview'
  | 'mail'
  | 'school'
  | 'calendar'
  | 'tasks'
  | 'focus'
  | 'documents'
  | 'analytics'
  | 'settings'

export type Priority = 'low' | 'medium' | 'high'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: ID
  title: string
  notes: string
  priority: Priority
  due: string | null
  category: string
  done: boolean
  completedAt: string | null
  recurrence: Recurrence
  createdAt: string
  demo?: boolean
}

export type EventCategory = 'class' | 'study' | 'training' | 'personal' | 'exam' | 'work'

export interface CalEvent {
  id: ID
  title: string
  start: string
  end: string
  category: EventCategory
  location: string
  notes: string
  reminder: number
  source: 'vault' | 'school' | 'google'
  demo?: boolean
}

export interface ClassSlot {
  id: ID
  subject: string
  teacher: string
  room: string
  weekday: number
  start: string
  end: string
  demo?: boolean
}

export interface Grade {
  id: ID
  subject: string
  title: string
  score: number
  outOf: number
  coefficient: number
  date: string
  demo?: boolean
}

export interface Homework {
  id: ID
  subject: string
  title: string
  details: string
  due: string
  done: boolean
  demo?: boolean
}

export interface Announcement {
  id: ID
  title: string
  body: string
  date: string
  source: 'school' | 'vault'
  demo?: boolean
}

export interface Attachment {
  id: ID
  name: string
  size: number
  type: string
}

export interface MailMessage {
  id: ID
  fromName: string
  fromEmail: string
  to: string
  subject: string
  body: string
  date: string
  folder: 'inbox' | 'sent' | 'archive'
  read: boolean
  starred: boolean
  labels: string[]
  attachments: Attachment[]
  threadId: string
  demo?: boolean
}

export interface VaultDocument {
  id: ID
  name: string
  folder: string
  category: string
  size: number
  type: string
  createdAt: string
  hasBlob: boolean
  demo?: boolean
}

export interface FocusSession {
  id: ID
  startedAt: string
  minutes: number
  mode: 'focus' | 'break'
  label: string
  demo?: boolean
}

export type ConnectionId = 'gmail' | 'gcal' | 'ecoledirecte'

export interface ConnectionState {
  status: 'disconnected' | 'connected' | 'unavailable'
  account: string
  connectedAt: string | null
  note: string
}

export interface Profile {
  name: string
  email: string
  school: string
  role: string
}

export interface Prefs {
  reduceMotion: boolean
  weekStartsMonday: boolean
  compact: boolean
  notifications: {
    tasks: boolean
    school: boolean
    mail: boolean
    focus: boolean
  }
}

export interface VaultState {
  version: number
  demoMode: boolean
  profile: Profile
  tasks: Task[]
  events: CalEvent[]
  classes: ClassSlot[]
  grades: Grade[]
  homework: Homework[]
  announcements: Announcement[]
  messages: MailMessage[]
  documents: VaultDocument[]
  focusSessions: FocusSession[]
  focusGoal: number
  connections: Record<ConnectionId, ConnectionState>
  prefs: Prefs
  updatedAt: string
}

export type CollectionKey =
  | 'tasks'
  | 'events'
  | 'classes'
  | 'grades'
  | 'homework'
  | 'announcements'
  | 'messages'
  | 'documents'
  | 'focusSessions'

export interface IntegrationStatus {
  id: ConnectionId
  label: string
  configured: boolean
  missing: string[]
  method: 'oauth' | 'manual'
  detail: string
}
