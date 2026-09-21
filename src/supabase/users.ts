import { getSupabase } from './client'

export interface PendingUserRow {
  uid: string
  email: string
  displayName: string
  createdAt: string
}

interface PendingUserDb {
  uid: string
  email: string
  display_name: string | null
  created_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toRow(row: PendingUserDb): PendingUserRow {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name || '',
    createdAt: formatDate(row.created_at),
  }
}

async function fetchAll(): Promise<PendingUserDb[]> {
  const client = getSupabase()
  if (!client) return []
  const { data, error } = await client.from('pending_users').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PendingUserDb[]
}

export function subscribeToPendingUsers(callback: (users: PendingUserRow[]) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback([])
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchAll()
      callback(rows.map(toRow))
    } catch {
      callback([])
    }
  }

  const channel = client.channel(`pending-users-${Math.random().toString(36).slice(2)}`)
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_users' }, () => {
      void apply()
    })
    .subscribe()
  void apply()

  return () => {
    void getSupabase()?.removeChannel(channel)
  }
}

export async function approveUser(uid: string, role: string = 'editor'): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.rpc('approve_user', { target_uid: uid, target_role: role })
  if (error) throw error
}

export async function rejectUser(uid: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('pending_users').delete().eq('uid', uid)
  if (error) throw error
}