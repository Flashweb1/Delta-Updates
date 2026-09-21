import { type SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from './client'
import { Article, sampleArticles } from '../data/articles'
import { logger } from '../utils/logger'
import { logErrorToSentry } from '../utils/sentry'

const IS_DEV = import.meta.env.DEV === true
const IN_BATCH = 30

/** Raw row shape from the articles table. */
interface ArticleRow {
  id: string
  title: string
  dek: string
  body: string[]
  category: string
  tags: string[]
  author: string
  author_role: string
  published_at: string
  published_at_ts: string
  image: string
  slug: string
  read_time: number
  featured: boolean
  status: 'draft' | 'review' | 'published' | 'archived'
  created_at: string
  updated_at: string
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    dek: row.dek,
    body: row.body,
    category: row.category,
    tags: row.tags,
    author: row.author,
    authorRole: row.author_role,
    publishedAt: row.published_at,
    image: row.image,
    slug: row.slug,
    readTime: row.read_time,
    featured: row.featured,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function fallbackOrEmpty<T extends unknown[]>(fallback: T, label: string, err?: unknown): T {
  if (err !== undefined) {
    logger.error(`[supabase:articles] ${label} failed`, err, { label })
    if (!IS_DEV) logErrorToSentry(err, `supabase:articles:${label}`)
  }
  if (IS_DEV) return fallback
  return [] as unknown as T
}

function fallbackOrUndefined<T>(fallback: T | undefined, label: string, err?: unknown): T | undefined {
  if (err !== undefined) {
    logger.error(`[supabase:articles] ${label} failed`, err, { label })
    if (!IS_DEV) logErrorToSentry(err, `supabase:articles:${label}`)
  }
  if (IS_DEV) return fallback
  return undefined
}

function getClient(): SupabaseClient | null {
  return getSupabase()
}

type ListParams = {
  status?: string
  category?: string
  featured?: boolean
  slug?: string
  limit?: number
  admin?: boolean
}

async function fetchList(params: ListParams = {}): Promise<ArticleRow[]> {
  const client = getClient()
  if (!client) return []
  let q = client.from('articles').select('*').order('published_at_ts', { ascending: false })
  if (params.status) q = q.eq('status', params.status)
  if (params.category) q = q.eq('category', params.category)
  if (params.featured !== undefined) q = q.eq('featured', params.featured)
  if (params.slug) q = q.eq('slug', params.slug)
  if (params.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ArticleRow[]
}

export const subscribeToArticles = (
  callback: (articles: Article[]) => void,
  statusFilter?: string
): (() => void) => {
  const client = getClient()
  if (!client) {
    callback(fallbackOrEmpty(sampleArticles, 'subscribeToArticles.setup'))
    return () => {}
  }

  const apply = async () => {
    try {
      const rows = await fetchList(statusFilter ? { status: statusFilter } : {})
      const list: Article[] = rows.map(toArticle)
      callback(list.length > 0 ? list : fallbackOrEmpty(sampleArticles, 'subscribeToArticles.empty'))
    } catch (err) {
      callback(fallbackOrEmpty(sampleArticles, 'subscribeToArticles', err))
    }
  }

  const channel = client.channel(`articles-${Math.random().toString(36).slice(2)}`)
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: statusFilter ? `status=eq.${statusFilter}` : undefined,
      },
      () => {
        void apply()
      }
    )
    .subscribe()
  void apply()

  return () => {
    void getClient()?.removeChannel(channel)
  }
}

export const getArticles = async (): Promise<Article[]> => {
  try {
    const rows = await fetchList()
    return rows.length > 0 ? rows.map(toArticle) : fallbackOrEmpty(sampleArticles, 'getArticles.empty')
  } catch (err) {
    return fallbackOrEmpty(sampleArticles, 'getArticles', err)
  }
}

export const getArticlesByCategory = async (category: string): Promise<Article[]> => {
  try {
    const rows = await fetchList({ category, status: 'published' })
    if (rows.length > 0) return rows.map(toArticle)
    return fallbackOrEmpty(
      sampleArticles.filter((a) => a.category.toLowerCase() === category.toLowerCase()),
      'getArticlesByCategory.empty'
    )
  } catch (err) {
    return fallbackOrEmpty(
      sampleArticles.filter((a) => a.category.toLowerCase() === category.toLowerCase()),
      'getArticlesByCategory',
      err
    )
  }
}

export const getArticleBySlug = async (slug: string): Promise<Article | undefined> => {
  try {
    const rows = await fetchList({ slug, status: 'published' })
    const first = rows[0]
    if (first) return toArticle(first)
    return fallbackOrUndefined(
      sampleArticles.find((a) => a.slug === slug),
      'getArticleBySlug.empty'
    )
  } catch (err) {
    return fallbackOrUndefined(
      sampleArticles.find((a) => a.slug === slug),
      'getArticleBySlug',
      err
    )
  }
}

export const getFeaturedArticle = async (): Promise<Article | undefined> => {
  const featured = await getFeaturedArticles()
  return featured[0]
}

export const getFeaturedArticles = async (count: number = 4): Promise<Article[]> => {
  try {
    const rows = await fetchList({ featured: true, status: 'published', limit: count })
    const docs = rows.map(toArticle)
    if (docs.length > 0) return docs.slice(0, count)
    const featured = sampleArticles.filter((a) => a.featured)
    const pad =
      featured.length >= count
        ? featured.slice(0, count)
        : (() => {
            const idSet = new Set(featured.map((a) => a.id))
            return featured.concat(sampleArticles.filter((a) => !idSet.has(a.id))).slice(0, count)
          })()
    return fallbackOrEmpty(pad, 'getFeaturedArticles.empty')
  } catch (err) {
    const featured = sampleArticles.filter((a) => a.featured)
    const pad =
      featured.length >= count
        ? featured.slice(0, count)
        : (() => {
            const idSet = new Set(featured.map((a) => a.id))
            return featured.concat(sampleArticles.filter((a) => !idSet.has(a.id))).slice(0, count)
          })()
    return fallbackOrEmpty(pad, 'getFeaturedArticles', err)
  }
}

export const getLatestArticles = async (count: number = 6): Promise<Article[]> => {
  try {
    const rows = await fetchList({ status: 'published', limit: count })
    const docs = rows.map(toArticle)
    if (docs.length > 0) return docs
    return fallbackOrEmpty(sampleArticles.slice(0, count), 'getLatestArticles.empty')
  } catch (err) {
    return fallbackOrEmpty(sampleArticles.slice(0, count), 'getLatestArticles', err)
  }
}

export const getRelatedArticles = async (
  articleId: string,
  category: string,
  maxResults: number = 3
): Promise<Article[]> => {
  try {
    const rows = await fetchList({ status: 'published', category, limit: maxResults + 1 })
    const docs = rows.map(toArticle).filter((a) => a.id !== articleId)
    if (docs.length > 0) return docs.slice(0, maxResults)
    return fallbackOrEmpty(
      sampleArticles.filter((a) => a.id !== articleId).slice(0, maxResults),
      'getRelatedArticles.empty'
    )
  } catch (err) {
    return fallbackOrEmpty(
      sampleArticles.filter((a) => a.id !== articleId).slice(0, maxResults),
      'getRelatedArticles',
      err
    )
  }
}

export const searchArticles = async (queryText: string): Promise<Article[]> => {
  const client = getClient()
  if (!client) return []
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at_ts', { ascending: false })
      .limit(100)
    if (error) throw error
    const articles = ((data ?? []) as ArticleRow[]).map(toArticle)
    const lowerQuery = queryText.toLowerCase()
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.dek.toLowerCase().includes(lowerQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    )
  } catch (err) {
    logger.error('[supabase:articles] searchArticles failed', err, { label: 'searchArticles' })
    if (!IS_DEV) logErrorToSentry(err, 'supabase:articles:searchArticles')
    return []
  }
}

export const addArticle = async (articleData: Omit<Article, 'id'>): Promise<Article> => {
  const client = getClient()
  if (!client) throw new Error('Supabase is not configured.')
  const { data, error } = await client
    .from('articles')
    .insert({
      title: articleData.title,
      dek: articleData.dek,
      body: articleData.body,
      category: articleData.category,
      tags: articleData.tags,
      author: articleData.author,
      author_role: articleData.authorRole,
      published_at: articleData.publishedAt,
      image: articleData.image,
      slug: articleData.slug,
      read_time: articleData.readTime,
      featured: articleData.featured ?? false,
      status: articleData.status,
    })
    .select('*')
    .single()
  if (error) throw error
  return toArticle(data as ArticleRow)
}

export const updateArticle = async (articleId: string, articleData: Partial<Article>): Promise<Article> => {
  const client = getClient()
  if (!client) throw new Error('Supabase is not configured.')
  const patch: Record<string, unknown> = {}
  if (articleData.title !== undefined) patch.title = articleData.title
  if (articleData.dek !== undefined) patch.dek = articleData.dek
  if (articleData.body !== undefined) patch.body = articleData.body
  if (articleData.category !== undefined) patch.category = articleData.category
  if (articleData.tags !== undefined) patch.tags = articleData.tags
  if (articleData.author !== undefined) patch.author = articleData.author
  if (articleData.authorRole !== undefined) patch.author_role = articleData.authorRole
  if (articleData.publishedAt !== undefined) patch.published_at = articleData.publishedAt
  if (articleData.image !== undefined) patch.image = articleData.image
  if (articleData.slug !== undefined) patch.slug = articleData.slug
  if (articleData.readTime !== undefined) patch.read_time = articleData.readTime
  if (articleData.featured !== undefined) patch.featured = articleData.featured
  if (articleData.status !== undefined) patch.status = articleData.status

  const { data, error } = await client
    .from('articles')
    .update(patch)
    .eq('id', articleId)
    .select('*')
    .single()
  if (error) throw error
  return toArticle(data as ArticleRow)
}

export const deleteArticle = async (articleId: string): Promise<void> => {
  const client = getClient()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('articles').delete().eq('id', articleId)
  if (error) throw error
}

export const getArticleById = async (articleId: string): Promise<Article | undefined> => {
  const client = getClient()
  if (!client) return undefined
  const { data, error } = await client.from('articles').select('*').eq('id', articleId).maybeSingle()
  if (error || !data) return undefined
  return toArticle(data as ArticleRow)
}

export const getAllArticlesAdmin = async (): Promise<Article[]> => {
  const client = getClient()
  if (!client) return []
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return ((data ?? []) as ArticleRow[]).map(toArticle)
  } catch {
    return []
  }
}

export const doesSlugExist = async (slug: string, excludeId?: string): Promise<boolean> => {
  const client = getClient()
  if (!client) return false
  try {
    const { data, error } = await client.from('articles').select('id').eq('slug', slug).limit(1)
    if (error) throw error
    const rows = (data ?? []) as { id: string }[]
    if (rows.length === 0) return false
    if (excludeId) return rows[0]!.id !== excludeId
    return true
  } catch {
    return false
  }
}

export const generateUniqueSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
  if (!baseSlug) return `article-${Date.now()}`
  let candidate = baseSlug
  let suffix = 2
  while (await doesSlugExist(candidate, excludeId)) {
    candidate = `${baseSlug}-${suffix}`
    suffix++
    if (suffix > 100) {
      candidate = `${baseSlug}-${Date.now()}`
      break
    }
  }
  return candidate
}

export const getArticlesByStatus = async (status: string): Promise<Article[]> => {
  const client = getClient()
  if (!client) return []
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as ArticleRow[]).map(toArticle)
  } catch (err) {
    logger.error('[supabase:articles] getArticlesByStatus failed', err, { status })
    if (!IS_DEV) logErrorToSentry(err, 'supabase:articles:getArticlesByStatus')
    return []
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export const getArticlesByIds = async (ids: string[]): Promise<Article[]> => {
  if (ids.length === 0) return []
  const client = getClient()
  if (!client) return []
  try {
    const batches = chunkArray([...new Set(ids)], IN_BATCH)
    const promises = batches.map((batch) =>
      client.from('articles').select('*').in('id', batch)
    )
    const results = await Promise.all(promises)
    const map = new Map<string, Article>()
    for (const res of results) {
      if (res.error) throw res.error
      for (const row of (res.data ?? []) as ArticleRow[]) map.set(String(row.id), toArticle(row))
    }
    const order = new Map(ids.map((id, idx) => [id, idx]))
    return [...map.values()].sort(
      (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    )
  } catch (err) {
    logger.error('[supabase:articles] getArticlesByIds failed', err, { count: ids.length })
    if (!IS_DEV) logErrorToSentry(err, 'supabase:articles:getArticlesByIds')
    return []
  }
}