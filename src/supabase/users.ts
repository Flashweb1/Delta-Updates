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

const DEV_PENDING_USERS_KEY = 'delta-dev-pending-users-v1'

function getLocalPendingUsers(): PendingUserDb[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DEV_PENDING_USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalPendingUsers(rows: PendingUserDb[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEV_PENDING_USERS_KEY, JSON.stringify(rows))
}

async function fetchAll(): Promise<PendingUserDb[]> {
  const client = getSupabase()
  if (!client) {
    if (import.meta.env.DEV && typeof window !== 'undefined') return getLocalPendingUsers()
    return []
  }

  try {
    const { data, error } = await client.from('pending_users').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const rows = (data ?? []) as PendingUserDb[]
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const local = getLocalPendingUsers()
      if (rows.length === 0 && local.length > 0) return local
      if (rows.length > 0) saveLocalPendingUsers(rows)
    }
    return rows
  } catch {
    if (import.meta.env.DEV && typeof window !== 'undefined') return getLocalPendingUsers()
    return []
  }
}

export function subscribeToPendingUsers(callback: (users: PendingUserRow[]) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback(import.meta.env.DEV && typeof window !== 'undefined' ? getLocalPendingUsers().map(toRow) : [])
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchAll()
      callback(rows.map(toRow))
    } catch {
      callback(import.meta.env.DEV && typeof window !== 'undefined' ? getLocalPendingUsers().map(toRow) : [])
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
  if (!client) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const rows = getLocalPendingUsers().filter((row) => row.uid !== uid)
      saveLocalPendingUsers(rows)
      return
    }
    throw new Error('Supabase is not configured.')
  }

  try {
    const { error } = await client.rpc('approve_user', { target_uid: uid, target_role: role })
    if (error) throw error
  } catch (error) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const rows = getLocalPendingUsers().filter((row) => row.uid !== uid)
      saveLocalPendingUsers(rows)
      return
    }
    throw error
  }
}

export async function rejectUser(uid: string): Promise<void> {
  const client = getSupabase()
  if (!client) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const rows = getLocalPendingUsers().filter((row) => row.uid !== uid)
      saveLocalPendingUsers(rows)
      return
    }
    throw new Error('Supabase is not configured.')
  }

  try {
    const { error } = await client.from('pending_users').delete().eq('uid', uid)
    if (error) throw error
  } catch (error) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const rows = getLocalPendingUsers().filter((row) => row.uid !== uid)
      saveLocalPendingUsers(rows)
      return
    }
    throw error
  }
}