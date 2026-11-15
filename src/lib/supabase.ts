import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** True when real Supabase credentials are present in the environment. */
export const isCloudConfigured: boolean = Boolean(
  url && anonKey && /^https?:\/\//i.test(url) && anonKey.length > 20,
)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'vault.auth',
      },
    })
  : null
