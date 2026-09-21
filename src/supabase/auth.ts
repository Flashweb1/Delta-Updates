import { getSupabase } from './client'
import { isAdminEmail } from '../utils/security'
import { logger } from '../utils/logger'

/** Minimal shape used across the app (uid/displayName match the previous Firebase User). */
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

type AuthResult<T = unknown> = { user: T | null; error: unknown }

function getAuthRedirectBase(): string {
  const configured = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
  return configured || window.location.origin
}

function getAuthRedirectUrl(): string {
  const base = getAuthRedirectBase()
  return new URL(window.location.pathname + window.location.search + window.location.hash, base).toString()
}

function toAuthUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null } | null | undefined): AuthUser | null {
  if (!u) return null
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    (typeof meta.display_name === 'string' && meta.display_name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    null
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName,
    emailVerified: Boolean(u.email),
  }
}

async function getUser() {
  const client = getSupabase()
  if (!client) return null
  const { data } = await client.auth.getUser()
  return toAuthUser(data.user)
}

export const ensurePendingUserRecord = async (user: AuthUser | null): Promise<void> => {
  if (!user || !user.email) return
  if (isAdminEmail(user.email)) return
  const client = getSupabase()
  if (!client) return
  try {
    await client.from('pending_users').upsert(
      {
        uid: user.uid,
        email: user.email,
        display_name: user.displayName,
        email_verified: user.emailVerified,
      },
      { onConflict: 'uid', ignoreDuplicates: true }
    )
  } catch (e) {
    logger.warn('failed to ensure pending_users row', { error: String(e), uid: user.uid })
  }
}

export const signInWithGoogle = async (): Promise<AuthResult<AuthUser>> => {
  const client = getSupabase()
  if (!client) return { user: null, error: new Error('Supabase is not configured.') }
  try {
    const redirectTo = getAuthRedirectUrl()
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) return { user: null, error }
    // signInWithOAuth triggers a full redirect; the session is restored on return.
    return { user: await getUser(), error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const signInWithEmail = async (email: string, password: string): Promise<AuthResult<AuthUser>> => {
  const client = getSupabase()
  if (!client) return { user: null, error: new Error('Supabase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8) {
    return { user: null, error: new Error('Invalid email or password') }
  }
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) return { user: null, error }
    return { user: toAuthUser(data.user), error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const createAccountWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult<AuthUser>> => {
  const client = getSupabase()
  if (!client) return { user: null, error: new Error('Supabase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { user: null, error: new Error('Invalid email') }
  if (!password || password.length < 8) {
    return { user: null, error: new Error('Password must be at least 8 characters') }
  }
  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName ?? null },
        emailRedirectTo: getAuthRedirectBase(),
      },
    })
    if (error) return { user: null, error }
    if (data.user) {
      await ensurePendingUserRecord(toAuthUser(data.user))
    }
    return { user: toAuthUser(data.user), error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const sendPasswordReset = async (email: string): Promise<{ error: unknown }> => {
  const client = getSupabase()
  if (!client) return { error: new Error('Supabase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: new Error('Invalid email') }
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectBase() })
    return { error }
  } catch (error: unknown) {
    return { error }
  }
}

export const signOutUser = async (): Promise<{ error: unknown }> => {
  const client = getSupabase()
  if (!client) return { error: new Error('Supabase is not configured.') }
  try {
    await client.auth.signOut()
    return { error: null }
  } catch (error: unknown) {
    return { error }
  }
}

export const onAuthStateChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  const client = getSupabase()
  if (!client) {
    callback(null)
    return () => {}
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session ? { uid: session.user.id, email: session.user.email ?? null, displayName: null, emailVerified: Boolean(session.user.email) } : null)
  })
  return () => data.subscription.unsubscribe()
}

export const getCurrentUser = async (): Promise<AuthUser | null> => getUser()

export const isAdminUser = (user: AuthUser | unknown | null): boolean => {
  if (!user) return false
  const u = user as { email?: string | null } | null
  const email = u && 'email' in u ? u.email : null
  return isAdminEmail(email ?? null)
}

export const isApprovedUser = async (user: AuthUser | null): Promise<boolean> => {
  if (!user) return false
  try {
    if (isAdminEmail(user.email)) return true
  } catch {
    // ignore
  }
  const client = getSupabase()
  if (!client) return false
  try {
    const { data, error } = await client.from('admins').select('uid').eq('uid', user.uid).maybeSingle()
    if (!error && data) return true
  } catch {
    // ignore
  }
  return false
}

export const getIdToken = async (): Promise<string | null> => {
  const client = getSupabase()
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session?.access_token ?? null
}