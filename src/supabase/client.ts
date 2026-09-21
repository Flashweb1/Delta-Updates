import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let _client: SupabaseClient | null | undefined

const PLACEHOLDER_RE = /your[-_ ]project[-_ ]ref|YOUR[-_ ][A-Z]+/i

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (PLACEHOLDER_RE.test(supabaseUrl) || PLACEHOLDER_RE.test(supabaseAnonKey)) {
    console.error(
      'Supabase is configured with placeholder values ("your-project-ref"/"YOUR_KEY"). Set the real values from the Supabase dashboard API settings and rebuild.',
    )
    return null
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  })
}

/** Returns the shared Supabase client, or null when not configured. */
export function getSupabase(): SupabaseClient | null {
  if (_client === undefined) _client = createSupabaseClient()
  return _client
}

/** Single shared instance for callers that can assume configuration exists. */
export const supabase = getSupabase()

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey)