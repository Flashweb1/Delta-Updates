import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AuthUser } from '../firebase/auth'
import { onAuthStateChange, signOutUser, isAdminUser } from '../firebase/auth'

interface AuthContextType {
  user: AuthUser | null
  isAdmin: boolean
  isApproved: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isApproved: false,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [loading, setLoading] = useState(true)

  const DEV_BYPASS_AUTH =
    import.meta.env.DEV === true && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      // Use first allowlisted admin email for dev bypass so previewing admin flows works.
      // The editor treats isApproved as the gate for publishing, so the bypass must set it true.
      const list = (import.meta.env.VITE_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const devEmail = list[0] || 'dev@deltaupdates.test'
      setUser({ email: devEmail, uid: 'dev-user-123', displayName: 'Dev Admin', emailVerified: true } as AuthUser)
      setIsAdmin(true)
      setIsApproved(true)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser as AuthUser | null)
      setIsAdmin(isAdminUser(currentUser))
      // asynchronous check for approval
      if (currentUser) {
        void (async () => {
          try {
            const approved = await (await import('../firebase/auth')).isApprovedUser(currentUser as AuthUser)
            setIsApproved(approved)
          } catch {
            setIsApproved(false)
          }
        })()
      } else {
        setIsApproved(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [DEV_BYPASS_AUTH])

  const handleSignOut = async () => {
    await signOutUser()
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, isApproved, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)