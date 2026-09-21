import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.fn()
const getSupabase = vi.fn<() => unknown>(() => null)

vi.mock('./client', () => ({ getSupabase }))

vi.mock('../utils/security', () => ({
  isAdminEmail: (email?: string | null) => email === 'admin@deltaupdates.com',
  isValidEmail: (email?: string) => !!email && email.includes('@'),
}))

describe('ensurePendingUserRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSupabase.mockReturnValue(null)
  })

  it('creates a pending_users record for a non-admin user', async () => {
    getSupabase.mockReturnValue({ from: () => ({ upsert: upsert.mockResolvedValue({ error: null }) }) })
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

  it('does nothing when Supabase is not configured', async () => {
    const { ensurePendingUserRecord } = await import('./auth')

    await ensurePendingUserRecord({
      uid: 'abc123',
      email: 'newuser@example.com',
      displayName: 'New User',
      emailVerified: true,
    })

    expect(upsert).not.toHaveBeenCalled()
  })

  it('does not create a pending_users record for an admin email', async () => {
    getSupabase.mockReturnValue({ from: () => ({ upsert: upsert.mockResolvedValue({ error: null }) }) })
    const { ensurePendingUserRecord } = await import('./auth')

    await ensurePendingUserRecord({
      uid: 'admin123',
      email: 'admin@deltaupdates.com',
      displayName: 'Admin User',
      emailVerified: true,
    })

    expect(upsert).not.toHaveBeenCalled()
  })
})