import { describe, it, expect } from 'vitest'
import {
  isValidArticleId,
  isValidSlug,
  isValidCategory,
  isValidEmail,
  isValidExternalUrl,
  isValidTags,
  normalizeSlug,
  sanitizePlainText,
  truncate,
  generateReadTime,
  buildCanonicalUrl,
  formatDateAsText,
} from './security'

describe('isValidArticleId', () => {
  it('accepts word chars and dashes up to 64 chars', () => {
    expect(isValidArticleId('abc-123')).toBe(true)
    expect(isValidArticleId('a'.repeat(64))).toBe(true)
  })
  it('rejects empty, too long, or invalid chars', () => {
    expect(isValidArticleId('')).toBe(false)
    expect(isValidArticleId('a'.repeat(65))).toBe(false)
    expect(isValidArticleId('has space')).toBe(false)
    expect(isValidArticleId('has/slash')).toBe(false)
    expect(isValidArticleId(null)).toBe(false)
    expect(isValidArticleId(undefined)).toBe(false)
    expect(isValidArticleId(123)).toBe(false)
  })
})

describe('isValidSlug', () => {
  it('accepts kebab-case slugs', () => {
    expect(isValidSlug('governor-commissions-complex')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
    expect(isValidSlug('abc-123-def')).toBe(true)
  })
  it('rejects uppercase, spaces, special chars', () => {
    expect(isValidSlug('Hello World')).toBe(false)
    expect(isValidSlug('foo_bar')).toBe(false)
    expect(isValidSlug('-leading')).toBe(false)
    expect(isValidSlug('trailing-')).toBe(false)
    expect(isValidSlug('--double--dash')).toBe(false)
    expect(isValidSlug('a'.repeat(201))).toBe(false)
  })
})

describe('isValidCategory', () => {
  it('accepts reasonable category names', () => {
    expect(isValidCategory('Politics')).toBe(true)
    expect(isValidCategory('World News')).toBe(true)
    expect(isValidCategory('Tech & Science')).toBe(true)
  })
  it('rejects too-short or too-long values', () => {
    expect(isValidCategory('a')).toBe(false)
    expect(isValidCategory('a'.repeat(50))).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts normal email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('name+tag@sub.domain.co')).toBe(true)
  })
  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a@b.c'.padEnd(260, 'x'))).toBe(false)
  })
})

describe('isValidExternalUrl', () => {
  it('accepts http and https', () => {
    expect(isValidExternalUrl('https://example.com')).toBe(true)
    expect(isValidExternalUrl('http://example.com/path?q=1')).toBe(true)
  })
  it('rejects malformed or oversized URLs', () => {
    expect(isValidExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isValidExternalUrl('//no-protocol')).toBe(false)
    expect(isValidExternalUrl('not a url')).toBe(false)
  })
})

describe('isValidTags', () => {
  it('accepts up to 10 short tags', () => {
    expect(isValidTags(['a', 'b', 'c'])).toBe(true)
    expect(isValidTags(Array.from({ length: 10 }, (_, i) => `t${i}`))).toBe(true)
  })
  it('rejects more than 10 or oversized tags', () => {
    expect(isValidTags(Array.from({ length: 11 }, (_, i) => `t${i}`))).toBe(false)
    expect(isValidTags(['a'.repeat(33)])).toBe(false)
    expect(isValidTags([''])).toBe(false)
    expect(isValidTags('not-an-array' as unknown as string[])).toBe(false)
  })
})

describe('normalizeSlug', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(normalizeSlug('Hello World')).toBe('hello-world')
  })
  it('strips unsafe characters and collapses dashes', () => {
    expect(normalizeSlug('  Foo!!  Bar??  Baz--Quux  ')).toBe('foo-bar-baz-quux')
  })
  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(250)
    expect(normalizeSlug(long).length).toBe(200)
  })
  it('handles empty input', () => {
    expect(normalizeSlug('')).toBe('')
    expect(normalizeSlug('   ')).toBe('')
  })
})

describe('sanitizePlainText', () => {
  it('strips control characters but keeps printable text', () => {
    expect(sanitizePlainText('hello\u0000world')).toBe('helloworld')
    expect(sanitizePlainText('ok\u0007text')).toBe('oktext')
  })
  it('truncates to maxLen', () => {
    expect(sanitizePlainText('abcdef', 3)).toBe('abc')
  })
  it('handles null and undefined', () => {
    expect(sanitizePlainText(null as unknown as string)).toBe('')
    expect(sanitizePlainText(undefined as unknown as string)).toBe('')
  })
})

describe('truncate', () => {
  it('returns input unchanged when shorter than limit', () => {
    expect(truncate('hi', 10)).toBe('hi')
  })
  it('truncates with an ellipsis when longer than limit', () => {
    expect(truncate('hello world', 5)).toBe('hell\u2026')
  })
})

describe('generateReadTime', () => {
  it('returns at least 1 minute', () => {
    expect(generateReadTime([])).toBe(1)
  })
  it('computes minutes from word count', () => {
    const paragraph = 'word '.repeat(220).trim()
    expect(generateReadTime([paragraph])).toBe(1)
    const twoPages = 'word '.repeat(440).trim()
    expect(generateReadTime([twoPages])).toBe(2)
  })
})

describe('buildCanonicalUrl', () => {
  it('joins site URL and path', () => {
    expect(buildCanonicalUrl('/article/foo')).toBe('https://deltaupdates.vercel.app/article/foo')
  })
  it('adds leading slash if missing', () => {
    expect(buildCanonicalUrl('foo/bar')).toBe('https://deltaupdates.vercel.app/foo/bar')
  })
  it('defaults to root', () => {
    expect(buildCanonicalUrl()).toBe('https://deltaupdates.vercel.app/')
  })
})

describe('formatDateAsText', () => {
  it('formats an ISO date', () => {
    const out = formatDateAsText('2026-08-25T10:00:00Z')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })
  it('returns the input for invalid dates', () => {
    expect(formatDateAsText('not-a-date')).toBe('not-a-date')
  })
  it('accepts a Date object', () => {
    const out = formatDateAsText(new Date('2026-01-01T00:00:00Z'))
    expect(typeof out).toBe('string')
  })
})
