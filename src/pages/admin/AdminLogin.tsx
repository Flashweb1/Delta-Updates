import { useState, useEffect, FormEvent } from 'react'
import { Chrome, Lock, Mail, User, ArrowRight } from 'lucide-react'
import { signInWithGoogle, signInWithEmail, createAccountWithEmail, isApprovedUser } from '../../firebase/auth'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isAdminEmail } from '../../utils/security'

interface AdminLoginProps {
  onNavigate?: (path: string) => void
}

type Mode = 'signin' | 'signup'

function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong.'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  const e = err as { message?: string; code?: string } | undefined
  if (e?.code) {
    switch (e.code) {
      case 'invalid_credentials':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.'
      case 'user_already_exists':
      case 'email_exists':
      case 'auth/email-already-in-use':
        return 'An account with that email already exists.'
      case 'weak_password':
      case 'auth/weak-password':
        return 'Password should be at least 8 characters.'
      case 'invalid_email':
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'over_email_send_rate_limit':
        return 'Too many attempts. Please try again later.'
      case 'auth/popup-closed-by-user':
        return 'The sign-in popup was closed.'
      default:
        break
    }
  }
  return e?.message || 'Authentication failed. Please try again.'
}

export default function AdminLogin({ onNavigate }: AdminLoginProps) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    if (user && isAdmin) {
      const goto = onNavigate ?? navigate
      goto('/admin')
    } else if (user && !isAdmin) {
      const goto = onNavigate ?? navigate
      goto('/')
    }
  }, [user, isAdmin, navigate, onNavigate])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res =
        mode === 'signup'
          ? await createAccountWithEmail(email, password, name || undefined)
          : await signInWithEmail(email, password)
      if (res.error) {
        setError(errorMessage(res.error))
        return
      }
      const goto = onNavigate ?? navigate
      if (res.user) {
        const emailAddr = res.user.email
        const isTrustedAdmin = !!(emailAddr && isAdminEmail(emailAddr))
        if (isTrustedAdmin) {
          goto('/admin')
          return
        }

        const approved = await isApprovedUser(res.user)
        if (approved && emailAddr && isAdminEmail(emailAddr)) {
          goto('/admin')
        } else if (approved) {
          goto('/')
        } else {
          goto('/pending')
        }
      }
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await signInWithGoogle()
      if (res.error) {
        setError(errorMessage(res.error))
        return
      }
      // Supabase OAuth performs a full redirect; the post-redirect session is
      // restored by onAuthStateChange, after which the effect above navigates.
      if (!res.user) {
        return
      }
      const goto = onNavigate ?? navigate
      const emailAddr = res.user.email
      const isTrustedAdmin = !!(emailAddr && isAdminEmail(emailAddr))
      if (isTrustedAdmin) {
        goto('/admin')
        return
      }

      const approved = res.user ? await isApprovedUser(res.user) : false
      if (approved && emailAddr && isAdminEmail(emailAddr)) {
        goto('/admin')
      } else if (approved) {
        goto('/')
      } else {
        goto('/pending')
      }
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <div className="login-container">
        {/* Left side: Welcome message */}
        <div className="login-welcome">
          <div className="welcome-content">
            <div className="welcome-badge">Editorial Dashboard</div>
            <h1 className="welcome-title">
              {mode === 'signin' ? 'Welcome back' : 'Join the newsroom'}
            </h1>
            <p className="welcome-subtitle">
              {mode === 'signin'
                ? 'Access the Delta Update editorial hub and manage your stories.'
                : 'Create your editor account and start publishing.'}
            </p>
            <div className="welcome-features">
              <div className="feature-item">
                <div className="feature-icon">✨</div>
                <span>Publish instantly</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <span>Real-time analytics</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <span>Secure & private</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Auth form */}
        <div className="login-form-section">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-icon">
                <Lock size={24} />
              </div>
              <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
              <p>
                {mode === 'signin'
                  ? 'Enter your credentials below'
                  : 'Set up your editor profile'}
              </p>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-google"
            >
              <Chrome size={20} />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="login-divider">
              <div className="divider-line"></div>
              <span>or with email</span>
              <div className="divider-line"></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="form" noValidate>
              {mode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="name">Full name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Adaeze Okafor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="editor@deltaupdates.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button type="button" className="link-btn" onClick={() => { setShowReset(!showReset); setError(null) }}>
                  Forgot password?
                </button>
                {mode === 'signin' && (
                  <button type="button" className="link-btn" onClick={() => { setMode('signup'); setError(null) }}>
                    Create account
                  </button>
                )}
              </div>

              {showReset && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid var(--muted)', borderRadius: 6 }}>
                  <label htmlFor="reset-email">Enter your email to reset password</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@domain.com" />
                    <button type="button" className="btn-submit" onClick={async () => {
                      setError(null)
                      setLoading(true)
                      try {
                        const { error: err } = await (await import('../../firebase/auth')).sendPasswordReset(resetEmail)
                        if (err) setError(errorMessage(err))
                        else setError('Password reset email sent — check your inbox.')
                      } catch (e) {
                        setError(errorMessage(e))
                      } finally {
                        setLoading(false)
                      }
                    }}>Send</button>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-alert" role="alert">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Mode Toggle */}
            <div className="form-toggle">
              {mode === 'signin' ? (
                <>
                  <span>New here?</span>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null) }}
                    className="toggle-btn"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  <span>Already an editor?</span>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null) }}
                    className="toggle-btn"
                  >
                    Sign in instead
                  </button>
                </>
              )}
            </div>

            {/* Back to site */}
            <button
              type="button"
              className="btn-back"
              onClick={() => (onNavigate ?? navigate)('/')}
            >
              ← Back to Delta Update
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
