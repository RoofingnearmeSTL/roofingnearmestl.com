import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client for the data store and dashboard. Returns null (without creating a client) when the
// settings are missing, so callers can show "not set up yet" instead of crashing. Does not touch src/lib/supabase.ts.
export function serverSupabase(env: Record<string, string | undefined> = process.env): SupabaseClient | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !url.trim() || !key || !key.trim()) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
