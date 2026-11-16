import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CollectionKey, VaultState } from '../types'
import { createDemoState, emptyState } from '../lib/demo'
import { nowStamp } from '../lib/date'

const STORAGE_KEY = 'vault.os.v1'

function mergeState(saved: Partial<VaultState> | null): VaultState {
  const base = emptyState()
  if (!saved) return createDemoState()
  return {
    ...base,
    ...saved,
    version: 1,
    profile: { ...base.profile, ...(saved.profile || {}) },
    prefs: {
      ...base.prefs,
      ...(saved.prefs || {}),
      notifications: {
        ...base.prefs.notifications,
        ...(saved.prefs?.notifications || {}),
      },
    },
    connections: { ...base.connections, ...(saved.connections || {}) },
    tasks: saved.tasks ?? base.tasks,
    events: saved.events ?? base.events,
    classes: saved.classes ?? base.classes,
    grades: saved.grades ?? base.grades,
    homework: saved.homework ?? base.homework,
    announcements: saved.announcements ?? base.announcements,
    messages: saved.messages ?? base.messages,
    documents: saved.documents ?? base.documents,
    focusSessions: saved.focusSessions ?? base.focusSessions,
    focusGoal: saved.focusGoal ?? base.focusGoal,
  }
}

function loadState(): VaultState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDemoState()
    return mergeState(JSON.parse(raw) as Partial<VaultState>)
  } catch {
    return createDemoState()
  }
}

export type CollectionItem<K extends CollectionKey> = VaultState[K] extends (infer T)[] ? T : never

type Upsert = <K extends CollectionKey>(key: K, item: CollectionItem<K>) => void

export interface AppApi {
  state: VaultState
  set: (fn: (state: VaultState) => VaultState) => void
  upsert: Upsert
  remove: (key: CollectionKey, id: string) => void
  updateProfile: (patch: Partial<VaultState['profile']>) => void
  updatePrefs: (patch: Partial<VaultState['prefs']>) => void
  clearDemo: () => void
  resetAll: () => void
  exportState: () => string
  importState: (raw: string) => { ok: boolean; message: string }
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

const AppContext = createContext<AppApi | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultState>(loadState)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Persist synchronously on every change: a reload or a closed tab must never lose an edit.
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }
    setSaveStatus('saving')
    flush()
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [state])

  const set = useCallback((fn: (current: VaultState) => VaultState) => {
    setState((current) => ({ ...fn(current), updatedAt: nowStamp() }))
  }, [])

  const upsert = useCallback<Upsert>(
    (key, item) => {
      set((current) => {
        const list = current[key] as { id: string }[]
        const nextItem = item as { id: string }
        const exists = list.some((entry) => entry.id === nextItem.id)
        const next = exists
          ? list.map((entry) => (entry.id === nextItem.id ? nextItem : entry))
          : [nextItem, ...list]
        return { ...current, [key]: next } as VaultState
      })
    },
    [set],
  )

  const remove = useCallback(
    (key: CollectionKey, id: string) => {
      set((current) => {
        const list = current[key] as { id: string }[]
        return { ...current, [key]: list.filter((entry) => entry.id !== id) } as VaultState
      })
    },
    [set],
  )

  const updateProfile = useCallback(
    (patch: Partial<VaultState['profile']>) => {
      set((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
    },
    [set],
  )

  const updatePrefs = useCallback(
    (patch: Partial<VaultState['prefs']>) => {
      set((current) => ({
        ...current,
        prefs: {
          ...current.prefs,
          ...patch,
          notifications: { ...current.prefs.notifications, ...(patch.notifications || {}) },
        },
      }))
    },
    [set],
  )

  const clearDemo = useCallback(() => {
    set((current) => {
      const strip = <T extends { demo?: boolean }>(items: T[]) => items.filter((item) => !item.demo)
      return {
        ...current,
        demoMode: false,
        tasks: strip(current.tasks),
        events: strip(current.events),
        classes: strip(current.classes),
        grades: strip(current.grades),
        homework: strip(current.homework),
        announcements: strip(current.announcements),
        messages: strip(current.messages),
        documents: strip(current.documents),
        focusSessions: strip(current.focusSessions),
      }
    })
  }, [set])

  const resetAll = useCallback(() => {
    setState(emptyState())
  }, [])

  const exportState = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importState = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<VaultState>
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
        return { ok: false, message: 'This file is not a VAULT backup.' }
      }
      setState(mergeState(parsed))
      return { ok: true, message: 'Backup restored.' }
    } catch {
      return { ok: false, message: 'The file is not valid JSON.' }
    }
  }, [])

  const value = useMemo<AppApi>(
    () => ({
      state,
      set,
      upsert,
      remove,
      updateProfile,
      updatePrefs,
      clearDemo,
      resetAll,
      exportState,
      importState,
      saveStatus,
    }),
    [
      state,
      set,
      upsert,
      remove,
      updateProfile,
      updatePrefs,
      clearDemo,
      resetAll,
      exportState,
      importState,
      saveStatus,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
