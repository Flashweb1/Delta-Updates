const ID_RE = /^[\w-]{1,64}$/
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CATEGORY_RE = /^[A-Za-z][\w\s\-\&]{1,32}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/(?:[-\w]+\.)+[-\w]+(?:\/[^\s]*)?$/i
const TAGS_MAX = 10
const TAG_LEN_MAX = 32

export function isValidArticleId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug.length <= 200 && SLUG_RE.test(slug)
}

export function isValidCategory(category: unknown): category is string {
  return (
    typeof category === 'string' && CATEGORY_RE.test(category) && category.length <= 40
  )
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email)
}

export function isValidExternalUrl(url: unknown): url is string {
  return typeof url === 'string' && url.length <= 2048 && URL_RE.test(url)
}

export function isValidTags(tags: unknown): tags is string[] {
  return (
    Array.isArray(tags) &&
    tags.length <= TAGS_MAX &&
    tags.every((t) => typeof t === 'string' && t.length > 0 && t.length <= TAG_LEN_MAX)
  )
}

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

export function sanitizePlainText(input: string, maxLen: number = 10_000): string {
  let out = String(input ?? '')
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  if (out.length > maxLen) out = out.slice(0, maxLen)
  return out
}

export function truncate(input: string, n: number): string {
  if (input.length <= n) return input
  return `${input.slice(0, Math.max(0, n - 1)).trimEnd()}\u2026`
}

export function generateReadTime(paragraphs: string[], wordsPerMinute: number = 220): number {
  const words = paragraphs.reduce(
    (acc, p) => acc + p.trim().split(/\s+/).filter(Boolean).length,
    0
  )
  const minutes = Math.ceil(words / wordsPerMinute)
  return Math.max(1, minutes)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (import.meta.env.VITE_ADMIN_EMAILS || 'ajikesamuel4@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export function buildCanonicalUrl(path: string = '/'): string {
  const base = (import.meta.env.VITE_SITE_URL || 'https://deltaupdates.vercel.app').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function getSiteConfig() {
  return {
    name: import.meta.env.VITE_SITE_NAME || 'Delta Update',
    description:
      import.meta.env.VITE_SITE_DESCRIPTION ||
      'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.',
    locale: import.meta.env.VITE_SITE_LOCALE || 'en_NG',
    url: import.meta.env.VITE_SITE_URL || 'https://deltaupdates.vercel.app',
    contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'editor@deltaupdates.com',
    showCookieBanner: import.meta.env.VITE_SHOW_COOKIE_BANNER !== 'false',
  }
}

export function formatDateAsText(d: Date | string | number): string {
  try {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
    if (Number.isNaN(date.getTime())) return String(d ?? '')
    return new Intl.DateTimeFormat('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch (_e: unknown) {
    return String(d ?? '')
  }
}
