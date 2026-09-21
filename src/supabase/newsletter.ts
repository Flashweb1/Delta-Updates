import { getSupabase } from './client'

/** Adds an email to the newsletter_subscribers table (public insert policy). */
export async function subscribeEmail(email: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { error } = await client.from('newsletter_subscribers').insert({
    email: email.toLowerCase().trim(),
    active: true,
  })
  if (error) throw error
}