// auth-bridge: verifies a Firebase ID token and mints a Supabase access token
// so the app's Supabase RLS policies continue to work (auth.uid()/auth.jwt()).
// This is intentionally the only edge function with verify_jwt = false — it is
// the identity entry point for users who do not have a Supabase session yet.
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? ''
const SUPABASE_JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
const FIREBASE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }
  if (!FIREBASE_PROJECT_ID || !SUPABASE_JWT_SECRET || !SUPABASE_URL) {
    return json({ error: 'server not configured' }, 500)
  }

  let body: { id_token?: unknown; display_name?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const idToken = typeof body.id_token === 'string' ? body.id_token : ''
  if (!idToken || idToken.length > 4096) {
    return json({ error: 'missing id_token' }, 400)
  }

  let payload: Record<string, unknown>
  try {
    const { payload: verified } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    })
    payload = verified as Record<string, unknown>
  } catch {
    return json({ error: 'invalid id token' }, 401)
  }

  const uid = typeof payload.sub === 'string' ? payload.sub : ''
  if (!uid) return json({ error: 'invalid id token' }, 401)
  const email = typeof payload.email === 'string' ? payload.email : null
  const emailVerified = payload.email_verified === true
  const signInProvider = typeof payload.firebase === 'object' && payload.firebase !== null
    ? (payload.firebase as { sign_in_provider?: unknown }).sign_in_provider
    : undefined
  const displayName = typeof body.display_name === 'string' ? body.display_name : undefined

  const now = Math.floor(Date.now() / 1000)
  const accessToken = await new SignJWT({
    role: 'authenticated',
    email: email ?? undefined,
    email_verified: emailVerified,
    app_metadata: { provider: typeof signInProvider === 'string' ? signInProvider : 'firebase' },
    user_metadata: displayName ? { full_name: displayName } : {},
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(uid)
    .setIssuer(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(SUPABASE_JWT_SECRET))

  return json({ access_token: accessToken, uid, email }, 200)
})