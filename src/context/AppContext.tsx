import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActivityEntry,
  ActivityType,
  AdminUser,
  Announcement,
  AppData,
  AppNotification,
  Client,
  CompanySettings,
  FinanceEntry,
  Invoice,
  InvoiceStatus,
  Property,
  PropertyStatus,
  Task,
  TaskStatus,
  Ticket,
  TicketStatus,
  UserStatus,
} from '../types'
import { store } from '../lib/store'
import { createSeedData } from '../lib/seed'
import { buildNotifications } from '../lib/analytics'
import { money as formatMoney } from '../lib/format'

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export type PropertyInput = Omit<Property, 'id' | 'reference' | 'submittedAt' | 'views' | 'status'> & {
  status?: PropertyStatus
}
export type UserInput = Omit<AdminUser, 'id' | 'lastActive' | 'hue'>
export type ClientInput = Omit<Client, 'id' | 'joinedAt' | 'hue'>
export type TaskInput = Omit<Task, 'id'>
export type TicketInput = Omit<Ticket, 'id' | 'createdAt'>
export type AnnouncementInput = Omit<Announcement, 'id' | 'date'> & { date?: string }
export type FinanceInput = Omit<FinanceEntry, 'id'>

export interface AppApi {
  data: AppData
  ready: boolean
  money: (value: number, compact?: boolean) => string
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  logActivity: (actor: string, action: string, target: string, type: ActivityType) => void
  addProperty: (input: PropertyInput) => void
  updateProperty: (id: string, input: PropertyInput) => void
  deleteProperty: (id: string) => void
  moderateProperty: (id: string, status: PropertyStatus, reason?: string) => void
  toggleFeatured: (id: string) => void
  addUser: (input: UserInput) => void
  updateUser: (id: string, input: UserInput) => void
  deleteUser: (id: string) => void
  setUserStatus: (id: string, status: UserStatus) => void
  addClient: (input: ClientInput) => void
  updateClient: (id: string, input: ClientInput) => void
  deleteClient: (id: string) => void
  addTask: (input: TaskInput) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  addTicket: (input: TicketInput) => void
  setTicketStatus: (id: string, status: TicketStatus) => void
  deleteTicket: (id: string) => void
  addAnnouncement: (input: AnnouncementInput) => void
  updateAnnouncement: (id: string, input: AnnouncementInput) => void
  deleteAnnouncement: (id: string) => void
  togglePinned: (id: string) => void
  addFinance: (input: FinanceInput) => void
  deleteFinance: (id: string) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  deleteInvoice: (id: string) => void
  toggleIntegration: (id: string) => void
  updateSettings: (patch: Partial<CompanySettings>) => void
  resetDemo: () => void
  clearWorkspace: () => void
}

const AppCtx = createContext<AppApi | null>(null)

function pushActivity(
  data: AppData,
  actor: string,
  action: string,
  target: string,
  type: ActivityType,
): ActivityEntry[] {
  const entry: ActivityEntry = {
    id: uid('l'),
    actor,
    action,
    target,
    type,
    at: new Date().toISOString(),
  }
  return [entry, ...data.activity].slice(0, 150)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null)

  useEffect(() => {
    let alive = true
    void store.load().then((loaded) => {
      if (!alive) return
      setData(loaded && Array.isArray(loaded.properties) ? loaded : createSeedData())
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (data) void store.save(data)
  }, [data])

  const mutate = useCallback((fn: (draft: AppData) => AppData) => {
    setData((prev) => (prev ? fn(prev) : prev))
  }, [])

  const notifications = useMemo(() => (data ? buildNotifications(data) : []), [data])

  const api = useMemo<AppApi | null>(() => {
    if (!data) return null

    const currency = data.settings.currency
    const actor = data.users[0]?.name ?? 'Admin'
    const read = new Set(data.readNotifications)

    return {
      data,
      ready: true,
      money: (value: number, compact = false) => formatMoney(value, currency, compact),
      notifications,
      unreadCount: notifications.filter((n) => !read.has(n.id)).length,
      markRead: (id: string) =>
        mutate((d) => ({ ...d, readNotifications: Array.from(new Set([...d.readNotifications, id])) })),
      markAllRead: () =>
        mutate((d) => ({
          ...d,
          readNotifications: Array.from(new Set([...d.readNotifications, ...notifications.map((n) => n.id)])),
        })),
      logActivity: (a, action, target, type) =>
        mutate((d) => ({ ...d, activity: pushActivity(d, a, action, target, type) })),

      addProperty: (input) =>
        mutate((d) => {
          const property: Property = {
            ...input,
            status: input.status ?? 'pending',
            id: uid('p'),
            reference: `VE-${1043 + d.properties.length}`,
            submittedAt: new Date().toISOString(),
            views: 0,
          }
          return {
            ...d,
            properties: [property, ...d.properties],
            activity: pushActivity(d, actor, 'created listing', property.title, 'property'),
          }
        }),
      updateProperty: (id, input) =>
        mutate((d) => {
          const target = d.properties.find((p) => p.id === id)
          return {
            ...d,
            properties: d.properties.map((p) => (p.id === id ? { ...p, ...input, id: p.id } : p)),
            activity: pushActivity(d, actor, 'updated listing', target?.title ?? id, 'property'),
          }
        }),
      deleteProperty: (id) =>
        mutate((d) => {
          const target = d.properties.find((p) => p.id === id)
          return {
            ...d,
            properties: d.properties.filter((p) => p.id !== id),
            activity: pushActivity(d, actor, 'deleted listing', target?.title ?? id, 'property'),
          }
        }),
      moderateProperty: (id, status, reason) =>
        mutate((d) => {
          const target = d.properties.find((p) => p.id === id)
          const verb = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'reopened'
          return {
            ...d,
            properties: d.properties.map((p) =>
              p.id === id
                ? { ...p, status, rejectionReason: status === 'rejected' ? reason ?? p.rejectionReason : null }
                : p,
            ),
            activity: pushActivity(d, actor, verb, target?.title ?? id, 'property'),
          }
        }),
      toggleFeatured: (id) =>
        mutate((d) => ({
          ...d,
          properties: d.properties.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p)),
        })),

      addUser: (input) =>
        mutate((d) => ({
          ...d,
          users: [
            { ...input, id: uid('u'), lastActive: new Date().toISOString(), hue: Math.floor(Math.random() * 360) },
            ...d.users,
          ],
          activity: pushActivity(d, actor, 'invited', input.name, 'user'),
        })),
      updateUser: (id, input) =>
        mutate((d) => ({
          ...d,
          users: d.users.map((u) => (u.id === id ? { ...u, ...input, id: u.id } : u)),
          activity: pushActivity(d, actor, 'updated access for', input.name, 'user'),
        })),
      deleteUser: (id) =>
        mutate((d) => {
          const target = d.users.find((u) => u.id === id)
          return {
            ...d,
            users: d.users.filter((u) => u.id !== id),
            activity: pushActivity(d, actor, 'removed', target?.name ?? id, 'user'),
          }
        }),
      setUserStatus: (id, status) =>
        mutate((d) => {
          const target = d.users.find((u) => u.id === id)
          return {
            ...d,
            users: d.users.map((u) => (u.id === id ? { ...u, status } : u)),
            activity: pushActivity(d, actor, status === 'suspended' ? 'suspended' : 'reactivated', target?.name ?? id, 'user'),
          }
        }),

      addClient: (input) =>
        mutate((d) => ({
          ...d,
          clients: [
            { ...input, id: uid('c'), joinedAt: new Date().toISOString(), hue: Math.floor(Math.random() * 360) },
            ...d.clients,
          ],
          activity: pushActivity(d, actor, 'added client', input.name, 'user'),
        })),
      updateClient: (id, input) =>
        mutate((d) => ({
          ...d,
          clients: d.clients.map((c) => (c.id === id ? { ...c, ...input, id: c.id } : c)),
        })),
      deleteClient: (id) =>
        mutate((d) => {
          const target = d.clients.find((c) => c.id === id)
          return {
            ...d,
            clients: d.clients.filter((c) => c.id !== id),
            activity: pushActivity(d, actor, 'removed client', target?.name ?? id, 'user'),
          }
        }),

      addTask: (input) =>
        mutate((d) => ({
          ...d,
          tasks: [{ ...input, id: uid('k') }, ...d.tasks],
          activity: pushActivity(d, actor, 'created task', input.title, 'task'),
        })),
      setTaskStatus: (id, status) =>
        mutate((d) => {
          const target = d.tasks.find((t) => t.id === id)
          return {
            ...d,
            tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
            activity: pushActivity(d, actor, status === 'done' ? 'completed task' : 'moved task', target?.title ?? id, 'task'),
          }
        }),
      deleteTask: (id) =>
        mutate((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),

      addTicket: (input) =>
        mutate((d) => ({
          ...d,
          tickets: [{ ...input, id: uid('s'), createdAt: new Date().toISOString() }, ...d.tickets],
          activity: pushActivity(d, actor, 'opened ticket', input.subject, 'support'),
        })),
      setTicketStatus: (id, status) =>
        mutate((d) => {
          const target = d.tickets.find((t) => t.id === id)
          return {
            ...d,
            tickets: d.tickets.map((t) => (t.id === id ? { ...t, status } : t)),
            activity: pushActivity(d, actor, `marked ${status}`, target?.subject ?? id, 'support'),
          }
        }),
      deleteTicket: (id) =>
        mutate((d) => ({ ...d, tickets: d.tickets.filter((t) => t.id !== id) })),

      addAnnouncement: (input) =>
        mutate((d) => ({
          ...d,
          announcements: [
            { ...input, date: input.date ?? new Date().toISOString(), id: uid('a') },
            ...d.announcements,
          ],
          activity: pushActivity(d, actor, 'created announcement', input.title, 'announcement'),
        })),
      updateAnnouncement: (id, input) =>
        mutate((d) => ({
          ...d,
          announcements: d.announcements.map((a) =>
            a.id === id ? { ...a, ...input, date: input.date ?? a.date, id: a.id } : a,
          ),
        })),
      deleteAnnouncement: (id) =>
        mutate((d) => ({ ...d, announcements: d.announcements.filter((a) => a.id !== id) })),
      togglePinned: (id) =>
        mutate((d) => ({
          ...d,
          announcements: d.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)),
        })),

      addFinance: (input) =>
        mutate((d) => ({
          ...d,
          finance: [{ ...input, id: uid('f') }, ...d.finance],
          activity: pushActivity(d, actor, 'recorded transaction', input.label, 'finance'),
        })),
      deleteFinance: (id) =>
        mutate((d) => ({ ...d, finance: d.finance.filter((f) => f.id !== id) })),

      setInvoiceStatus: (id, status) =>
        mutate((d) => {
          const target = d.invoices.find((i) => i.id === id)
          return {
            ...d,
            invoices: d.invoices.map((i) => (i.id === id ? { ...i, status } : i)),
            activity: pushActivity(d, actor, `marked invoice ${status}`, target?.number ?? id, 'finance'),
          }
        }),
      deleteInvoice: (id) =>
        mutate((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) })),

      toggleIntegration: (id) =>
        mutate((d) => {
          const target = d.integrations.find((i) => i.id === id)
          const nextConnected = !target?.connected
          return {
            ...d,
            integrations: d.integrations.map((i) =>
              i.id === id
                ? { ...i, connected: nextConnected, lastSync: nextConnected ? new Date().toISOString() : null }
                : i,
            ),
            activity: pushActivity(
              d,
              actor,
              nextConnected ? 'connected integration' : 'disconnected integration',
              target?.name ?? id,
              'system',
            ),
          }
        }),

      updateSettings: (patch) =>
        mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      resetDemo: () =>
        mutate(() => createSeedData()),

      clearWorkspace: () =>
        mutate((d) => ({
          ...createSeedData(),
          properties: [],
          clients: [],
          tickets: [],
          announcements: [],
          tasks: [],
          finance: [],
          invoices: [],
          activity: [],
          readNotifications: [],
          settings: d.settings,
        })),
    }
  }, [data, notifications, mutate])

  if (!api) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">
          <span className="boot-dot" />
        </div>
        <p>Preparing your workspace…</p>
      </div>
    )
  }

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>
}

export function useApp(): AppApi {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
