import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function PendingApprovalPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, signOut } = useAuth()

  return (
    <main style={{ padding: '4rem 1rem', maxWidth: 840, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Welcome</h1>
        <p>Your account ({user?.email}) is active and ready to use.</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn" onClick={() => (onNavigate || (() => {}))('/')}>Back to home</button>
          <button className="btn" onClick={async () => { await signOut(); (onNavigate || (() => {}))('/admin/login') }}>Sign out</button>
        </div>
      </div>
    </main>
  )
}
