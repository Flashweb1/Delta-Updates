import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { getSupabase } from '../supabase/client'
import { isAdminEmail } from '../utils/security'
import { logger } from '../utils/logger'
import { firebaseConfig, isFirebaseConfigured } from './config'

/** Minimal shape used across the app (uid/displayName match the previous Firebase User). */
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

type AuthResult<T = unknown> = { user: T | null; error: unknown }

let _app: ReturnType<typeof initializeApp> | null = null
let _auth: Auth | null = null
let _googleProvider: GoogleAuthProvider | null = null

function getFbAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (!_app) _app = initializeApp(firebaseConfig)
  if (!_auth) _auth = getAuth(_app)
  return _auth
}

function getBridgeUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  return base ? `${base}/functions/v1/auth-bridge` : ''
}

function getAuthRedirectBase(): string {
  const configured = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
  return configured || window.location.origin
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName || null,
    emailVerified: user.emailVerified,
  }
}

async function getCurrentFbUser(): Promise<AuthUser | null> {
  const auth = getFbAuth()
  return toAuthUser(auth?.currentUser ?? null)
}

async function requestMintedToken(user: User): Promise<string | null> {
  const url = getBridgeUrl()
  if (!url) return null
  try {
    const idToken = await user.getIdToken(true)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { access_token?: string } | null
    return json?.access_token ?? null
  } catch (e) {
    logger.warn('auth-bridge request failed', { error: String(e) })
    return null
  }
}

async function hasUsableSession(): Promise<boolean> {
  const client = getSupabase()
  if (!client) return false
  try {
    const { data } = await client.auth.getSession()
    const s = data.session
    return Boolean(s?.access_token && s.expires_at && s.expires_at * 1000 > Date.now() + 30_000)
  } catch {
    return false
  }
}

/** Exchanges the current Firebase ID token for a Supabase session (RLS-compatible). */
export async function ensureMintedSession(): Promise<boolean> {
  if (await hasUsableSession()) return true
  const auth = getFbAuth()
  const current = auth?.currentUser
  if (!current) return false
  const token = await requestMintedToken(current)
  if (!token) return false
  const client = getSupabase()
  if (!client) return false
  const { error } = await client.auth.setSession({ access_token: token, refresh_token: '' })
  if (error) {
    logger.warn('failed to set minted session', { error: String(error) })
    return false
  }
  return true
}

export const ensurePendingUserRecord = async (user: AuthUser | null): Promise<void> => {
  if (!user || !user.email) return
  if (isAdminEmail(user.email)) return
  const client = getSupabase()
  if (!client) return
  await ensureMintedSession()
  try {
    await client.from('pending_users').upsert(
      {
        uid: user.uid,
        email: user.email,
        display_name: user.displayName,
        email_verified: user.emailVerified,
      },
      { onConflict: 'uid', ignoreDuplicates: true },
    )
  } catch (e) {
    logger.warn('failed to ensure pending_users row', { error: String(e), uid: user.uid })
  }
}

export const signInWithGoogle = async (): Promise<AuthResult<AuthUser>> => {
  const auth = getFbAuth()
  if (!auth) return { user: null, error: new Error('Firebase is not configured.') }
  try {
    if (!_googleProvider) _googleProvider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, _googleProvider)
    const user = toAuthUser(credential.user)
    void ensurePendingUserRecord(user)
    return { user, error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const signInWithEmail = async (email: string, password: string): Promise<AuthResult<AuthUser>> => {
  const auth = getFbAuth()
  if (!auth) return { user: null, error: new Error('Firebase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8) {
    return { user: null, error: new Error('Invalid email or password') }
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const user = toAuthUser(credential.user)
    void ensurePendingUserRecord(user)
    return { user, error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const createAccountWithEmail = async (
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult<AuthUser>> => {
  const auth = getFbAuth()
  if (!auth) return { user: null, error: new Error('Firebase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { user: null, error: new Error('Invalid email') }
  if (!password || password.length < 8) {
    return { user: null, error: new Error('Password must be at least 8 characters') }
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName })
    }
    try {
      if (credential.user) await sendEmailVerification(credential.user)
    } catch (e) {
      logger.warn('sendEmailVerification failed', { error: String(e) })
    }
    const user = toAuthUser(credential.user)
    await ensurePendingUserRecord(user)
    return { user, error: null }
  } catch (error: unknown) {
    return { user: null, error }
  }
}

export const sendPasswordReset = async (email: string): Promise<{ error: unknown }> => {
  const auth = getFbAuth()
  if (!auth) return { error: new Error('Firebase is not configured.') }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: new Error('Invalid email') }
  try {
    await sendPasswordResetEmail(auth, email, { url: getAuthRedirectBase() })
    return { error: null }
  } catch (error: unknown) {
    return { error }
  }
}

export const signOutUser = async (): Promise<{ error: unknown }> => {
  const client = getSupabase()
  if (client) {
    try {
      await client.auth.signOut()
    } catch (e) {
      logger.warn('supabase signOut failed', { error: String(e) })
    }
  }
  const auth = getFbAuth()
  if (!auth) return { error: null }
  try {
    await fbSignOut(auth)
    return { error: null }
  } catch (error: unknown) {
    return { error }
  }
}

export const onAuthStateChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  const auth = getFbAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }
  const apply = (u: User | null) => {
    const mapped = toAuthUser(u)
    callback(mapped)
    if (mapped) void ensureMintedSession()
  }
  const unsubAuth = onAuthStateChanged(auth, apply)
  const unsubToken = onIdTokenChanged(auth, (u) => {
    if (u) void ensureMintedSession()
  })
  return () => {
    unsubAuth()
    unsubToken()
  }
}

export const getCurrentUser = async (): Promise<AuthUser | null> => getCurrentFbUser()

export const isAdminUser = (user: AuthUser | unknown | null): boolean => {
  if (!user) return false
  const u = user as { email?: string | null } | null
  const email = u && 'email' in u ? u.email : null
  return isAdminEmail(email ?? null)
}

export const isApprovedUser = async (user: AuthUser | null): Promise<boolean> => {
  if (!user) return false
  if (isAdminEmail(user.email)) return true
  const client = getSupabase()
  if (!client) return false
  await ensureMintedSession()
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
  await ensureMintedSession()
  const { data } = await client.auth.getSession()
  return data.session?.access_token ?? null
}