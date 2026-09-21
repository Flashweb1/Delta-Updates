import { getSupabase } from './client'

export interface MediaItemRow {
  id: string
  url: string
  name: string
  uploadedAt: string
}

interface MediaRow {
  id: string
  url: string
  name: string
  created_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toMediaItem(row: MediaRow): MediaItemRow {
  return {
    id: String(row.id),
    url: row.url,
    name: row.name || 'Untitled',
    uploadedAt: formatDate(row.created_at),
  }
}

async function fetchAll(): Promise<MediaRow[]> {
  const client = getSupabase()
  if (!client) return []
  const { data, error } = await client.from('media').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MediaRow[]
}

export function subscribeToMedia(callback: (items: MediaItemRow[]) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback([])
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchAll()
      callback(rows.map(toMediaItem))
    } catch {
      callback([])
    }
  }

  const channel = client.channel(`media-${Math.random().toString(36).slice(2)}`)
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => {
      void apply()
    })
    .subscribe()
  void apply()

  return () => {
    void getSupabase()?.removeChannel(channel)
  }
}

export async function addMediaItem(url: string, name?: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('media').insert({
    url,
    name: name || url.split('/').pop() || 'image.jpg',
  })
  if (error) throw error
}

export async function deleteMediaItem(id: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('media').delete().eq('id', id)
  if (error) throw error
}