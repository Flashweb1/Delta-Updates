import { useState, useEffect } from 'react'
import { Check, XCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { subscribeToPendingUsers, approveUser, rejectUser, type PendingUserRow } from '../../supabase/users'
import { logger } from '../../utils/logger'

interface UsersPageProps {
  onNavigate: (path: string) => void
}

export default function UsersPage({ onNavigate }: UsersPageProps) {
  const [pending, setPending] = useState<PendingUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToPendingUsers((arr) => {
      setPending(arr)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const approve = async (uid: string, role: string = 'editor') => {
    try {
      await approveUser(uid, role)
    } catch (e) {
      logger.error('approve error', e)
      setError('Failed to approve user. Please try again.')
      setTimeout(() => setError(null), 3000)
    }
  }

  const reject = async (uid: string) => {
    try {
      await rejectUser(uid)
    } catch (e) {
      logger.error('reject error', e)
      setError('Failed to reject user. Please try again.')
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <AdminLayout currentPage="users" onNavigate={onNavigate}>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">{pending.length} pending approval</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', background: 'var(--admin-error-soft)', color: 'var(--admin-error)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div className="admin-card">
        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading users...
            </div>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Created</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--admin-accent), var(--admin-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>{(u.displayName || (u.email || '').split('@')[0] || 'U').charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.displayName || 'User'}</div>
                        <div className="admin-text-sm admin-text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-text-sm admin-text-muted">{u.createdAt}</td>
                  <td>
                    <button className="btn-admin-primary" onClick={() => approve(u.uid)} title="Approve"><Check size={14} /> Approve</button>
                    <button className="btn-admin-danger" style={{ marginLeft: 8 }} onClick={() => reject(u.uid)} title="Reject"><XCircle size={14} /> Reject</button>
                  </td>
                </tr>
              ))}
              {!pending.length && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem' }}>No pending users</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
