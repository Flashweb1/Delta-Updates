/**
 * Delta Update — AI Service
 *
 * All AI generation is proxied through the Supabase Edge Function `ai-proxy`.
 * API keys live only in function secrets (OPENROUTER_API_KEY, GEMINI_API_KEY,
 * OPENAI_API_KEY) and never reach the browser bundle. The proxy also checks the
 * caller's Supabase JWT and applies rate limiting.
 *
 * Falls back gracefully if the proxy is unreachable.
 */

import { getSupabase } from '../supabase/client'

const AI_PROXY_URL = import.meta.env.VITE_SUPABASE_AI_PROXY_URL || ''

export const isAIEnabled = () => Boolean(AI_PROXY_URL)

interface AiProxyResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

async function callAI<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const { data, error } = await client.functions.invoke('ai-proxy', { body: { action, payload } })
  if (error) throw error
  const body = data as AiProxyResponse<T> | null
  if (!body || body.ok !== true) {
    throw new Error(body?.error || 'AI request failed')
  }
  return body.data as T
}

// ─── Article Editor Helpers ───────────────────────────────────────────────────

/** Generate a compelling subtitle (dek) from headline + body */
export async function generateDek(title: string, body: string): Promise<string> {
  return callAI<string>('generateDek', { title, body })
}

/** Suggest up to 8 relevant tags from article content */
export async function suggestTags(title: string, body: string, category: string): Promise<string[]> {
  const tags = await callAI<string[]>('suggestTags', { title, body, category })
  return Array.isArray(tags) ? tags.slice(0, 8) : []
}

/** Generate an SEO meta description (max 160 chars) */
export async function generateSEODescription(title: string, body: string): Promise<string> {
  return callAI<string>('generateSEODescription', { title, body })
}

/** Improve/polish a paragraph of body text */
export async function improveText(text: string): Promise<string> {
  return callAI<string>('improveText', { text })
}

// ─── Comment Moderation ───────────────────────────────────────────────────────

export type ModerationResult = {
  verdict: 'approve' | 'reject' | 'review'
  reason: string
  toxicity: 'none' | 'low' | 'medium' | 'high'
}

/** Moderate a comment — returns verdict, reason, and toxicity level */
export async function moderateComment(commentBody: string, articleTitle: string): Promise<ModerationResult> {
  try {
    return await callAI<ModerationResult>('moderateComment', { commentBody, articleTitle })
  } catch {
    return { verdict: 'review', reason: 'AI moderation unavailable.', toxicity: 'none' }
  }
}

// ─── Article Summarizer (Reader-facing) ───────────────────────────────────────

/** Generate a 3-bullet executive summary for readers */
export async function summarizeArticle(title: string, body: string[]): Promise<string[]> {
  try {
    const bullets = await callAI<string[]>('summarizeArticle', { title, body })
    return Array.isArray(bullets) ? bullets.slice(0, 3) : []
  } catch {
    return []
  }
}