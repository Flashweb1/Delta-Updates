import { getSupabase } from './client'

export type AdminCommentStatus = 'pending' | 'approved' | 'rejected'

export interface AdminCommentRow {
  id: string
  articleId: string
  articleTitle: string
  author: string
  authorEmail: string
  body: string
  createdAt: string
  status: AdminCommentStatus
  aiVerdict?: { verdict: 'approve' | 'reject' | 'review'; reason: string; toxicity: 'none' | 'low' | 'medium' | 'high' }
}

interface CommentRow {
  id: string
  article_id: string
  article_title: string
  author: string
  author_email: string
  body: string
  status: AdminCommentStatus
  ai_verdict: AdminCommentRow['aiVerdict'] | null
  created_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toAdminComment(row: CommentRow): AdminCommentRow {
  return {
    id: String(row.id),
    articleId: String(row.article_id),
    articleTitle: row.article_title,
    author: row.author,
    authorEmail: row.author_email,
    body: row.body,
    createdAt: formatDate(row.created_at),
    status: row.status,
    aiVerdict: row.ai_verdict ?? undefined,
  }
}

async function fetchAll(): Promise<CommentRow[]> {
  const client = getSupabase()
  if (!client) return []
  const { data, error } = await client.from('comments').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CommentRow[]
}

export function subscribeToComments(callback: (comments: AdminCommentRow[]) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback([])
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchAll()
      callback(rows.map(toAdminComment))
    } catch {
      callback([])
    }
  }

  const channel = client.channel(`comments-${Math.random().toString(36).slice(2)}`)
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
      void apply()
    })
    .subscribe()
  void apply()

  return () => {
    void getSupabase()?.removeChannel(channel)
  }
}

export async function updateCommentStatus(id: string, status: AdminCommentStatus): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('comments').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateCommentAiVerdict(
  id: string,
  verdict: AdminCommentRow['aiVerdict']
): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('comments').update({ ai_verdict: verdict }).eq('id', id)
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('comments').delete().eq('id', id)
  if (error) throw error
}