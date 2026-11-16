import type { AppData } from '../types'

export const STORAGE_KEY = 'vantage-estate:v1'

/**
 * Persistence contract. The UI only talks to this interface, so swapping the
 * localStorage adapter for a REST/Supabase-backed one is a one-line change in
 * `store` below — no component or context code needs to change.
 */
export interface DataStore {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  reset(): Promise<void>
}

export function createLocalStore(key = STORAGE_KEY): DataStore {
  return {
    async load() {
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw) as AppData
      } catch {
        return null
      }
    },
    async save(data) {
      try {
        window.localStorage.setItem(key, JSON.stringify(data))
      } catch {
        /* quota or private mode — the session keeps working in memory */
      }
    },
    async reset() {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    },
  }
}

/**
 * Drop-in adapter for a future backend. Expects a REST resource that accepts
 * GET /state and PUT /state with a JSON body. Not wired up by default.
 */
export function createHttpStore(baseUrl: string, token?: string): DataStore {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return {
    async load() {
      const res = await fetch(`${baseUrl}/state`, { headers })
      if (!res.ok) throw new Error(`load failed: ${res.status}`)
      return (await res.json()) as AppData
    },
    async save(data) {
      await fetch(`${baseUrl}/state`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
    },
    async reset() {
      await fetch(`${baseUrl}/state`, { method: 'DELETE', headers })
    },
  }
}

export const store: DataStore = createLocalStore()
