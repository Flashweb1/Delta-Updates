import { useParams } from 'react-router-dom'
import { getArticleBySlug, getRelatedArticles } from '../supabase/articles'
import { useState, useEffect } from 'react'
import ArticleDetail from '../components/article/ArticleDetail'
import type { Article } from '../data/articles'
import { logger } from '../utils/logger'

interface ArticlePageProps {
  onNavigate: (path: string) => void
  slug?: string
}

export default function ArticlePage({ onNavigate, slug: propSlug }: ArticlePageProps) {
  const { slug: routeSlug } = useParams<{ slug: string }>()
  const slug = propSlug || routeSlug
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    const loadArticle = async () => {
      try {
        const articleData = await getArticleBySlug(slug)
        if (cancelled) return
        setArticle(articleData ?? null)

        if (articleData) {
          try {
            const relatedData = await getRelatedArticles(articleData.id, articleData.category)
            if (!cancelled) setRelated(relatedData)
          } catch (err) {
            logger.error('[ArticlePage] Failed to load related articles', err)
          }
        }
      } catch (err) {
        logger.error('[ArticlePage] Failed to load article', err)
        if (!cancelled) setError(true)
      }
    }

    void loadArticle()
    return () => { cancelled = true }
  }, [slug])

  if (error) {
    return (
      <main className="error-page">
        <h1>Something went wrong</h1>
        <p>We couldn't load this article. Please try again later.</p>
        <button onClick={() => onNavigate('/')}>← Back to Home</button>
      </main>
    )
  }

  if (!article) {
    return (
      <main className="error-page">
        <h1>Article Not Found</h1>
        <p>The article you're looking for doesn't exist or has been moved.</p>
        <button onClick={() => onNavigate('/')}>← Back to Home</button>
      </main>
    )
  }

  return <ArticleDetail article={article} onNavigate={onNavigate} relatedArticles={related} />
}
