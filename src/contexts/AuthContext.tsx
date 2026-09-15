import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange, signOutUser, isAdminUser } from '../firebase/auth'

interface AuthContextType {
  user: User | null
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
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [loading, setLoading] = useState(true)

  const DEV_BYPASS_AUTH =
    import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setUser({ email: 'dev@bjlinks.test', uid: 'dev-user-123' } as User)
      setIsAdmin(true)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser as User | null)
      setIsAdmin(isAdminUser(currentUser))
      // asynchronous check for approval
      if (currentUser) {
        void (async () => {
          try {
            const approved = await (await import('../firebase/auth')).isApprovedUser(currentUser as User)
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