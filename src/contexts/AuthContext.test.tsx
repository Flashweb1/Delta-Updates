import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function AuthProbe() {
  const { user, isAdmin, isApproved } = useAuth()

  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="approved">{String(isApproved)}</span>
    </div>
  )
}

describe('AuthContext dev bypass', () => {
  it('marks the local admin session as approved so publishing works in dev', async () => {
    vi.stubEnv('VITE_DEV_BYPASS_AUTH', 'true')
    vi.stubEnv('VITE_ADMIN_EMAILS', 'dev@deltaupdates.test')

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    expect(await screen.findByTestId('email')).toHaveTextContent('dev@deltaupdates.test')
    expect(await screen.findByTestId('admin')).toHaveTextContent('true')
    expect(await screen.findByTestId('approved')).toHaveTextContent('true')
  })
})
