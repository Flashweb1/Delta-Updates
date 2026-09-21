import { useParams } from 'react-router-dom'
import { categories } from '../data/articles'
import { getArticlesByCategory } from '../supabase/articles'
import ArticleCard from '../components/article/ArticleCard'
import CategoryIndex from '../components/article/CategoryIndex'
import SectionHeader from '../components/ui/SectionHeader'
import Reveal from '../components/ui/Reveal'
import { SkeletonCard, SkeletonLine } from '../components/common/SkeletonLoader'
import { useState, useEffect } from 'react'
import type { Article } from '../data/articles'

interface CategoryPageProps {
  onNavigate: (path: string) => void
  slug?: string
}

export default function CategoryPage({ onNavigate, slug: propSlug }: CategoryPageProps) {
  const { slug: routeSlug } = useParams<{ slug: string }>()
  const slug = (propSlug ?? routeSlug ?? '').toLowerCase()
  const category = categories.find((c) => c.slug === slug)
  const [articlesList, setArticlesList] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const label = category?.label ?? slug
      const data = await getArticlesByCategory(label)
      if (!cancelled) {
        setArticlesList(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, category])

  return (
    <main className="category-page">
      <CategoryIndex onNavigate={onNavigate} activeCategory={slug} />

      <div className="section">
        <Reveal>
          <SectionHeader
            title={category?.label || slug.charAt(0).toUpperCase() + slug.slice(1) || 'Category'}
            accent="Section"
            count={!loading ? articlesList.length : undefined}
            as="h1"
          />
        </Reveal>
        <div className="section-rule" />

        {loading ? (
          <div className="article-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ paddingBottom: '0.5rem' }}>
                <SkeletonLine width="30%" height="12px" />
                <div style={{ height: '0.4rem' }} />
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : articlesList.length > 0 ? (
          <div className="article-grid">
            {articlesList.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                onNavigate={onNavigate}
                variant="grid"
                reveal
                revealDelay={(i % 3) * 90}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No articles found in this category yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}