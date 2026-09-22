import { beforeEach, describe, expect, it } from 'vitest'
import { addArticle, getAllArticlesAdmin } from './articles'

describe('article dev fallback', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores a published article locally when Supabase is unavailable in dev', async () => {
    const result = await addArticle({
      title: 'Delta Launches Solar Power Drive',
      dek: 'Local communities begin receiving clean, affordable electricity through a new public-private rollout.',
      body: ['Residents are getting a cleaner and more reliable electricity supply as new solar installations begin.', 'Officials say the program will expand gradually across the state.'],
      category: 'News',
      tags: ['Delta', 'Energy', 'Solar'],
      author: 'Dev Admin',
      authorRole: 'Administrator',
      publishedAt: 'Sep 22, 2026',
      image: '',
      slug: 'delta-launches-solar-power-drive',
      readTime: 3,
      featured: false,
      status: 'published',
    })

    expect(result.title).toBe('Delta Launches Solar Power Drive')
    const adminList = await getAllArticlesAdmin()
    expect(adminList.some((article) => article.slug === 'delta-launches-solar-power-drive')).toBe(true)
  })
})
