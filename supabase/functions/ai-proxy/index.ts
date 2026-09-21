// ai-proxy — Delta Update server-side AI gateway.
//
// Replaces the client-side ai.ts direct API calls. API keys live here as
// Edge Function secrets (OPENROUTER_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY)
// and never touch the browser bundle.
//
// Actions map 1:1 to the previous client exports:
//   generateDek(title, body)
//   suggestTags(title, body, category)
//   generateSEODescription(title, body)
//   improveText(text)
//   moderateComment(commentBody, articleTitle)
//   summarizeArticle(title, body[])
//
// All actions return { ok: true, data } or { ok: false, error }.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── JWT verification against Supabase ───────────────────────────────
async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token || token === 'undefined' || token === 'null') return false

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await supabase.auth.getUser(token)
  return Boolean(data?.user)
}

// ── Simple in-memory rate limiter (per container instance) ──────────
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const rec = hits.get(key)
  if (!rec || rec.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > MAX_PER_WINDOW
}

// ── Provider configuration (secrets) ────────────────────────────────
function envSecret(name: string): string {
  return Deno.env.get(name) ?? ''
}

// ── OpenRouter (primary) ────────────────────────────────────────────
async function openrouterCompletion(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const key = envSecret('OPENROUTER_API_KEY')
  if (!key) throw new Error('OPENROUTER_API_KEY not configured')
  const base = envSecret('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
  const model = envSecret('OPENROUTER_MODEL') || 'nex-agi/nex-n2.5-mini:free'

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://deltaupdates.vercel.app',
      'X-Title': 'Delta Update',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 512,
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── Gemini (fallback) ───────────────────────────────────────────────
async function geminiCompletion(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const key = envSecret('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  const model = 'gemini-2.0-flash-lite'
  const base = 'https://generativelanguage.googleapis.com/v1beta'

  const systemMsg = messages.find((m) => m.role === 'system')
  const userMsgs = messages.filter((m) => m.role !== 'system')
  const contents = userMsgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens ?? 512,
    },
  }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const res = await fetch(`${base}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}

// ── OpenAI-compatible (last resort) ─────────────────────────────────
async function openaiCompletion(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const key = envSecret('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const base = envSecret('OPENAI_BASE_URL') || 'https://api.openai.com/v1'
  const model = envSecret('OPENAI_MODEL') || 'gpt-4o-mini'

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 512,
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── Unified dispatcher: OpenRouter → Gemini → OpenAI ────────────────
async function chatCompletion(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number },
): Promise<string> {
  if (envSecret('OPENROUTER_API_KEY')) {
    try {
      return await openrouterCompletion(messages, options)
    } catch {
      // fall through
    }
  }
  if (envSecret('GEMINI_API_KEY')) {
    try {
      return await geminiCompletion(messages, options)
    } catch {
      // fall through
    }
  }
  return openaiCompletion(messages, options)
}

// ── Action handlers ─────────────────────────────────────────────────

async function generateDek(title: string, body: string): Promise<string> {
  return chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are an expert Nigerian news editor. Write a single compelling subtitle (dek) for the article. ' +
          'It must be 1–2 sentences, max 160 characters, journalistic in tone, and capture the key angle. ' +
          'Return ONLY the dek text, no quotes, no labels.',
      },
      { role: 'user', content: `Headline: ${title}\n\nArticle body:\n${body.slice(0, 2000)}` },
    ],
    { temperature: 0.6, max_tokens: 100 },
  )
}

async function suggestTags(title: string, body: string, category: string): Promise<string[]> {
  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a Nigerian news tagging expert. Return a JSON array of 5–8 short, relevant tags for the article. ' +
          'Tags should be title-cased, max 3 words each, specific and searchable. ' +
          'Return ONLY valid JSON array, e.g. ["Delta State","Governor","Infrastructure"]',
      },
      { role: 'user', content: `Category: ${category}\nHeadline: ${title}\n\nBody:\n${body.slice(0, 1500)}` },
    ],
    { temperature: 0.4, max_tokens: 120 },
  )
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as unknown[]
    return parsed.filter((t): t is string => typeof t === 'string').slice(0, 8)
  } catch {
    return []
  }
}

async function generateSEODescription(title: string, body: string): Promise<string> {
  return chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are an SEO expert for a Nigerian news website. Write a Google meta description for this article. ' +
          'Must be under 155 characters, include the key topic, and encourage clicks. ' +
          'Return ONLY the description text, no quotes.',
      },
      { role: 'user', content: `Headline: ${title}\n\nBody:\n${body.slice(0, 1500)}` },
    ],
    { temperature: 0.5, max_tokens: 80 },
  )
}

async function improveText(text: string): Promise<string> {
  return chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a senior Nigerian news editor. Improve the clarity, flow, and journalistic quality of the text. ' +
          'Keep the same facts and meaning. Do not add new information. ' +
          'Return ONLY the improved text, no explanations.',
      },
      { role: 'user', content: text },
    ],
    { temperature: 0.5, max_tokens: 600 },
  )
}

async function moderateComment(commentBody: string, articleTitle: string) {
  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a content moderator for a Nigerian news website. Analyze the comment and return a JSON object with:\n' +
          '- verdict: "approve" (safe, constructive), "reject" (spam, hate, explicit, dangerous), or "review" (borderline)\n' +
          '- reason: one short sentence explaining your decision\n' +
          '- toxicity: "none", "low", "medium", or "high"\n' +
          'Return ONLY valid JSON, no markdown.',
      },
      { role: 'user', content: `Article: "${articleTitle}"\n\nComment: "${commentBody}"` },
    ],
    { temperature: 0.2, max_tokens: 120 },
  )
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON from model')
  const parsed = JSON.parse(match[0]) as {
    verdict?: string
    reason?: string
    toxicity?: string
  }
  return {
    verdict: parsed.verdict ?? 'review',
    reason: parsed.reason ?? 'Could not determine.',
    toxicity: parsed.toxicity ?? 'none',
  }
}

async function summarizeArticle(title: string, body: string[]): Promise<string[]> {
  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a Nigerian news summarizer. Create exactly 3 concise bullet points summarizing the key facts of this article. ' +
          'Each bullet must be 1 sentence, factual, and under 120 characters. ' +
          'Return ONLY a JSON array of 3 strings, e.g. ["Point one.", "Point two.", "Point three."]',
      },
      { role: 'user', content: `Headline: ${title}\n\nBody:\n${body.join('\n\n').slice(0, 3000)}` },
    ],
    { temperature: 0.3, max_tokens: 200 },
  )
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as unknown[]
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, 3)
  } catch {
    return []
  }
}

// ── Router ──────────────────────────────────────────────────────────

async function dispatch(action: string, payload: Record<string, unknown>): Promise<unknown> {
  switch (action) {
    case 'generateDek':
      return generateDek(String(payload.title ?? ''), String(payload.body ?? ''))
    case 'suggestTags':
      return suggestTags(String(payload.title ?? ''), String(payload.body ?? ''), String(payload.category ?? ''))
    case 'generateSEODescription':
      return generateSEODescription(String(payload.title ?? ''), String(payload.body ?? ''))
    case 'improveText':
      return improveText(String(payload.text ?? ''))
    case 'moderateComment':
      return moderateComment(String(payload.commentBody ?? ''), String(payload.articleTitle ?? ''))
    case 'summarizeArticle':
      return summarizeArticle(String(payload.title ?? ''), Array.isArray(payload.body) ? payload.body.map(String) : [])
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Auth gate (mirrors the old Cloud Function's unauthenticated guard).
  const authed = await verifyAuth(req)
  if (!authed) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ ok: false, error: 'Rate limited. Try again shortly.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { action, payload } = await req.json()
    if (!action || typeof action !== 'string') {
      throw new Error('Missing action')
    }
    const data = await dispatch(action, payload ?? {})
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})