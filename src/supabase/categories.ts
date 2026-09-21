import { getSupabase } from './client'
import { categories as staticCategories } from '../data/articles'
import { logger } from '../utils/logger'

export interface Category {
  id: string
  name: string
  slug: string
  emoji: string
  color: string
  description: string
  visible: boolean
  order: number
  createdAt?: Date
  updatedAt?: Date
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  emoji: string
  color: string
  description: string
  visible: boolean
  ord: number
  created_at: string
  updated_at: string
}

function toCategory(row: CategoryRow): Category {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    emoji: row.emoji,
    color: row.color,
    description: row.description,
    visible: row.visible,
    order: row.ord,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function staticFallback(): Category[] {
  const defaultEmojis: Record<string, string> = {
    politics: '🏛️',
    news: '📰',
    business: '💼',
    world: '🌍',
    tech: '💻',
    health: '❤️',
    sports: '⚽',
    religion: '✝️',
    education: '📚',
    stories: '🎬',
  }
  const defaultColors: Record<string, string> = {
    politics: '#E32626',
    news: '#3B82F6',
    business: '#F2A900',
    world: '#10B981',
    tech: '#6366F1',
    health: '#EC4899',
    sports: '#F97316',
    religion: '#8B5CF6',
    education: '#14B8A6',
    stories: '#F59E0B',
  }
  return staticCategories.map((c) => ({
    id: c.slug,
    name: c.label,
    slug: c.slug,
    emoji: defaultEmojis[c.slug] ?? '📌',
    color: defaultColors[c.slug] ?? '#6B7280',
    description: '',
    visible: true,
    order: c.order,
  }))
}

async function fetchAll(): Promise<CategoryRow[]> {
  const client = getSupabase()
  if (!client) return []
  const { data, error } = await client.from('categories').select('*').order('ord', { ascending: true })
  if (error) throw error
  return (data ?? []) as CategoryRow[]
}

// Seed the default static categories if the table is empty.
export async function seedCategoriesIfEmpty(): Promise<void> {
  const client = getSupabase()
  if (!client) return
  try {
    const { count, error } = await client.from('categories').select('id', { count: 'exact', head: true })
    if (error) throw error
    if (count && count > 0) return
    const defaultEmojis: Record<string, string> = {
      politics: '🏛️',
      news: '📰',
      business: '💼',
      world: '🌍',
      tech: '💻',
      health: '❤️',
      sports: '⚽',
      religion: '✝️',
      education: '📚',
      stories: '🎬',
    }
    const defaultColors: Record<string, string> = {
      politics: '#E32626',
      news: '#3B82F6',
      business: '#F2A900',
      world: '#10B981',
      tech: '#6366F1',
      health: '#EC4899',
      sports: '#F97316',
      religion: '#8B5CF6',
      education: '#14B8A6',
      stories: '#F59E0B',
    }
    const rows = staticCategories.map((cat) => ({
      name: cat.label,
      slug: cat.slug,
      emoji: defaultEmojis[cat.slug] ?? '📌',
      color: defaultColors[cat.slug] ?? '#6B7280',
      description: '',
      visible: true,
      ord: cat.order,
    }))
    const { error: insertErr } = await client.from('categories').insert(rows)
    if (insertErr) throw insertErr
  } catch (err) {
    logger.warn('[categories] seed failed (may be offline)', { error: String(err) })
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await fetchAll()
    if (rows.length > 0) return rows.map(toCategory)
    return staticFallback()
  } catch {
    return staticFallback()
  }
}

export function subscribeToCategories(callback: (cats: Category[]) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback(staticFallback())
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchAll()
      callback(rows.length > 0 ? rows.map(toCategory) : staticFallback())
    } catch {
      callback(staticFallback())
    }
  }

  const channel = client.channel(`categories-${Math.random().toString(36).slice(2)}`)
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
      void apply()
    })
    .subscribe()
  void apply()

  return () => {
    void getSupabase()?.removeChannel(channel)
  }
}

export async function addCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { data: row, error } = await client
    .from('categories')
    .insert({
      name: data.name,
      slug: data.slug,
      emoji: data.emoji,
      color: data.color,
      description: data.description,
      visible: data.visible,
      ord: data.order,
    })
    .select('*')
    .single()
  if (error) throw error
  return toCategory(row as CategoryRow)
}

export async function updateCategory(id: string, data: Partial<Omit<Category, 'id'>>): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.slug !== undefined) patch.slug = data.slug
  if (data.emoji !== undefined) patch.emoji = data.emoji
  if (data.color !== undefined) patch.color = data.color
  if (data.description !== undefined) patch.description = data.description
  if (data.visible !== undefined) patch.visible = data.visible
  if (data.order !== undefined) patch.ord = data.order
  const { error } = await client.from('categories').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const client = getSupabase()
  if (!client) return
  try {
    for (let idx = 0; idx < orderedIds.length; idx++) {
      const { error } = await client
        .from('categories')
        .update({ ord: idx + 1 })
        .eq('id', orderedIds[idx]!)
      if (error) throw error
    }
  } catch (err) {
    logger.error('[categories] reorder failed', err)
  }
}