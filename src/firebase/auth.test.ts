import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.fn()
const setSession = vi.fn()
const getSupabase = vi.fn<() => unknown>(() => null)
const fetchMock = vi.fn()

vi.mock('./config', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    projectId: 'test-project',
    authDomain: 'test.firebaseapp.com',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '1',
    appId: '1:test',
  },
  isFirebaseConfigured: () => true,
}))

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))

vi.mock('firebase/auth', () => {
  const getAuthMock = vi.fn(() => ({ currentUser: null }))
  return {
    GoogleAuthProvider: class {},
    getAuth: getAuthMock,
    onAuthStateChanged: vi.fn(() => () => {}),
    onIdTokenChanged: vi.fn(() => () => {}),
    signInWithPopup: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }
})

vi.mock('../supabase/client', () => ({ getSupabase }))

vi.mock('../utils/security', () => ({
  isAdminEmail: (email?: string | null) => email === 'ajikesamuel4@gmail.com',
}))

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

describe('ensurePendingUserRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSupabase.mockReturnValue(null)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a pending_users record for a non-admin user', async () => {
    getSupabase.mockReturnValue({
      auth: {
        getSession: async () => ({
          data: { session: { access_token: 'valid', expires_at: Math.floor(Date.now() / 1000) + 600 } },
        }),
      },
      from: () => ({ upsert: upsert.mockResolvedValue({ error: null }) }),
    })
    const { ensurePendingUserRecord } = await import('./auth')

    await ensurePendingUserRecord({
      uid: 'abc123',
      email: 'newuser@example.com',
      displayName: 'New User',
      emailVerified: true,
    })

    expect(upsert).toHaveBeenCalledTimes(1)
    const payload = upsert.mock.calls[0]?.[0]
    expect(payload).toBeDefined()
    expect(payload).toMatchObject({
      uid: 'abc123',
      email: 'newuser@example.com',
      display_name: 'New User',
    })
  })

  it('stores pending signups locally in dev when Supabase is not configured', async () => {
    window.localStorage.clear()
    const { ensurePendingUserRecord } = await import('./auth')

    await ensurePendingUserRecord({
      uid: 'abc123',
      email: 'newuser@example.com',
      displayName: 'New User',
      emailVerified: true,
    })

    const raw = window.localStorage.getItem('delta-dev-pending-users-v1')
    expect(raw).toContain('"uid":"abc123"')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('treats a non-admin account as approved immediately', async () => {
    getSupabase.mockReturnValue({
      auth: {
        getSession: async () => ({
          data: { session: { access_token: 'valid', expires_at: Math.floor(Date.now() / 1000) + 600 } },
        }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    })

    const { isApprovedUser } = await import('./auth')
    const approved = await isApprovedUser({
      uid: 'guest123',
      email: 'reader@example.com',
      displayName: 'Reader',
      emailVerified: true,
    })

    expect(approved).toBe(true)
  })

  it('does not create a pending_users record for an admin email', async () => {
    getSupabase.mockReturnValue({
      auth: {
        getSession: async () => ({
          data: { session: { access_token: 'valid', expires_at: Math.floor(Date.now() / 1000) + 600 } },
        }),
      },
      from: () => ({ upsert: upsert.mockResolvedValue({ error: null }) }),
    })
    const { ensurePendingUserRecord } = await import('./auth')

    await ensurePendingUserRecord({
      uid: 'admin123',
      email: 'ajikesamuel4@gmail.com',
      displayName: 'Admin User',
      emailVerified: true,
    })

    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('ensureMintedSession', () => {
  it('mints a token via auth-bridge and applies it when no usable session exists', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proj.supabase.co')
    getSupabase.mockReturnValue({
      auth: {
        getSession: async () => ({ data: { session: null } }),
        setSession: setSession.mockResolvedValue({ error: null }),
      },
      from: () => ({ upsert: upsert.mockResolvedValue({ error: null }) }),
    })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'minted-token', uid: 'abc123', email: 'newuser@example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const firebaseUser = {
      uid: 'abc123',
      email: 'newuser@example.com',
      displayName: 'New User',
      emailVerified: true,
      getIdToken: async () => 'fb-id-token',
    }
    const authModule = await import('firebase/auth')
    const getAuthMock = authModule.getAuth as unknown as ReturnType<typeof vi.fn>
    getAuthMock.mockReturnValue({ currentUser: firebaseUser })

    const { ensureMintedSession } = await import('./auth')
    const ok = await ensureMintedSession()

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://proj.supabase.co/functions/v1/auth-bridge',
      expect.objectContaining({ method: 'POST' })
    )
    expect(setSession).toHaveBeenCalledWith({ access_token: 'minted-token', refresh_token: '' })
  })
})