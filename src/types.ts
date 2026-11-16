/* ------------------------------------------------------------------ */
/* Vantage Estate — domain model                                       */
/* Kept framework-agnostic so the same shapes can be served by a REST  */
/* API or Supabase adapter later (see src/lib/store.ts).               */
/* ------------------------------------------------------------------ */

export type PropertyStatus = 'pending' | 'approved' | 'rejected'
export type PropertyKind = 'Apartment' | 'House' | 'Villa' | 'Penthouse' | 'Office' | 'Land'
export type ListingType = 'sale' | 'rent'

export interface Owner {
  name: string
  email: string
  phone: string
}

export interface Property {
  id: string
  reference: string
  title: string
  price: number
  location: string
  country: string
  kind: PropertyKind
  listingType: ListingType
  image: string
  beds: number
  baths: number
  area: number
  owner: Owner
  submittedAt: string
  status: PropertyStatus
  description: string
  rejectionReason: string | null
  featured: boolean
  views: number
  agent: string
}

export type AdminRole = 'Super Admin' | 'Admin' | 'Moderator' | 'Agent' | 'Analyst'
export type UserStatus = 'active' | 'invited' | 'suspended'
export type Permission =
  | 'properties'
  | 'moderation'
  | 'users'
  | 'finance'
  | 'support'
  | 'settings'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  department: string
  lastActive: string
  permissions: Permission[]
  twoFactor: boolean
  hue: number
}

export type ClientType = 'Buyer' | 'Seller' | 'Investor' | 'Tenant'
export type ClientStatus = 'active' | 'lead' | 'closed'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  type: ClientType
  status: ClientStatus
  city: string
  budget: number
  deals: number
  joinedAt: string
  hue: number
}

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  deals: number
  revenue: number
  rating: number
  presence: PresenceStatus
  hue: number
}

export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TaskStatus = 'todo' | 'progress' | 'done'

export interface Task {
  id: string
  title: string
  assignee: string
  due: string
  priority: TaskPriority
  status: TaskStatus
  category: string
}

export type TicketStatus = 'open' | 'pending' | 'resolved'
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent'

export interface Ticket {
  id: string
  subject: string
  requester: string
  email: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  category: string
  message: string
}

export type AnnouncementStatus = 'draft' | 'published' | 'scheduled'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: string
  status: AnnouncementStatus
  date: string
  author: string
  pinned: boolean
}

export type FinanceType = 'income' | 'expense'

export interface FinanceEntry {
  id: string
  label: string
  type: FinanceType
  amount: number
  category: string
  date: string
  method: string
}

export type InvoiceStatus = 'paid' | 'due' | 'overdue'

export interface Invoice {
  id: string
  number: string
  client: string
  plan: string
  amount: number
  status: InvoiceStatus
  issued: string
  due: string
}

export type ActivityType =
  | 'property'
  | 'user'
  | 'finance'
  | 'task'
  | 'support'
  | 'system'
  | 'announcement'

export interface ActivityEntry {
  id: string
  actor: string
  action: string
  target: string
  type: ActivityType
  at: string
}

export interface Integration {
  id: string
  name: string
  category: string
  description: string
  connected: boolean
  lastSync: string | null
  accent: string
}

export interface CompanySettings {
  name: string
  legalName: string
  email: string
  phone: string
  address: string
  currency: 'USD' | 'EUR' | 'GBP' | 'AED'
  timezone: string
  autoApprove: boolean
  emailAlerts: boolean
  pushAlerts: boolean
  weeklyDigest: boolean
  twoFactorRequired: boolean
  maintenanceMode: boolean
  publicProfile: boolean
}

export interface AppData {
  version: number
  properties: Property[]
  users: AdminUser[]
  clients: Client[]
  team: TeamMember[]
  tasks: Task[]
  tickets: Ticket[]
  announcements: Announcement[]
  finance: FinanceEntry[]
  invoices: Invoice[]
  activity: ActivityEntry[]
  integrations: Integration[]
  settings: CompanySettings
  readNotifications: string[]
}

export interface AppNotification {
  id: string
  title: string
  body: string
  at: string
  tone: 'info' | 'warning' | 'danger' | 'success'
  href: string
}
