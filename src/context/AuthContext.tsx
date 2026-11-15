import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isCloudConfigured, supabase } from '../lib/supabase'
import {
  currentLocalSession,
  localDeleteAccount,
  localRenameAccount,
  localSignIn,
  localSignOut,
  localSignUpAsync,
} from '../lib/localAuth'

export type AuthMode = 'cloud' | 'local'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthContextValue {
  ready: boolean
  user: AuthUser | null
  mode: AuthMode
  cloudConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  renameLocalUser: (name: string) => void
  removeLocalAccount: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function fromSupabaseUser(
  raw: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
): AuthUser | null {
  if (!raw) return null
  const name = raw.user_metadata?.full_name
  return {
    id: raw.id,
    email: raw.email ?? '',
    name: typeof name === 'string' && name.trim() ? name : null,
  }
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (lower.includes('email not confirmed'))
    return 'Confirm your email address first — check your inbox for the link.'
  if (lower.includes('user already registered')) return 'An account with this email already exists.'
  if (lower.includes('password should be at least'))
    return 'Use at least 8 characters for your password.'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (lower.includes('unable to validate email') || lower.includes('invalid email'))
    return 'That email address looks invalid.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const mode: AuthMode = isCloudConfigured ? 'cloud' : 'local'

  useEffect(() => {
    if (!supabase) {
      const session = currentLocalSession()
      setUser(session ? { id: session.id, email: session.email, name: session.name } : null)
      setReady(true)
      return
    }

    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setUser(fromSupabaseUser(data.session?.user ?? null))
        setReady(true)
      })
      .catch(() => {
        if (active) setReady(true)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(fromSupabaseUser(session?.user ?? null))
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        const session = await localSignIn(email, password)
        setUser({ id: session.id, email: session.email, name: session.name })
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw new Error(friendlyAuthError(error.message))
      setUser(fromSupabaseUser(data.user))
    },
    [],
  )

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!supabase) {
      const session = await localSignUpAsync(email, password, name)
      setUser({ id: session.id, email: session.email, name: session.name })
      return { needsConfirmation: false }
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw new Error(friendlyAuthError(error.message))
    if (!data.session) return { needsConfirmation: true }
    setUser(fromSupabaseUser(data.user))
    return { needsConfirmation: false }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      localSignOut()
      setUser(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error(
        'Password reset needs a connected Supabase project. On this device your password is stored locally.',
      )
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) throw new Error(friendlyAuthError(error.message))
  }, [])

  const renameLocalUser = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev) return prev
      localRenameAccount(prev.id, name)
      return { ...prev, name: name.trim() || prev.name }
    })
  }, [])

  const removeLocalAccount = useCallback(() => {
    setUser((prev) => {
      if (prev) localDeleteAccount(prev.id)
      return null
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      mode,
      cloudConfigured: isCloudConfigured,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      renameLocalUser,
      removeLocalAccount,
    }),
    [ready, user, mode, signIn, signUp, signOut, requestPasswordReset, renameLocalUser, removeLocalAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
