import { getSupabase } from './client'
import { logger } from '../utils/logger'

/** Uploads an image to the "articles" Storage bucket and returns its public URL. */
export async function uploadImageFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  onProgress?.(5)
  const path = `articles/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
  const { error } = await client.storage
    .from('articles')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' })
  if (error) {
    logger.error('[storage] upload failed', error)
    throw error
  }
  onProgress?.(75)
  const { data } = client.storage.from('articles').getPublicUrl(path)
  onProgress?.(100)
  return data.publicUrl
}