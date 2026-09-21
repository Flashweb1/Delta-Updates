import { useBookmarks } from '../contexts/BookmarkContext'
import { getArticlesByIds } from '../supabase/articles'
import ArticleCard from '../components/article/ArticleCard'
import { SkeletonCard, SkeletonLine } from '../components/common/SkeletonLoader'
import { useState, useEffect } from 'react'
import type { Article } from '../data/articles'

interface BookmarksPageProps {
  onNavigate: (path: string) => void
}

export default function BookmarksPage({ onNavigate }: BookmarksPageProps) {
  const { bookmarks } = useBookmarks()
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const data = await getArticlesByIds(bookmarks)
      if (!cancelled) {
        setBookmarkedArticles(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bookmarks])

  return (
    <main className="bookmarks-page">
      <div className="section-header">
        <h1>Bookmarks</h1>
        {!loading && (
          <p className="section-count">{bookmarkedArticles.length} saved articles</p>
        )}
      </div>
      <div className="section-rule" />

      {loading ? (
        <div className="article-grid">
          {Array.from({ length: Math.min(4, bookmarks.length || 2) }).map((_, i) => (
            <div key={i} style={{ paddingBottom: '0.5rem' }}>
              <SkeletonLine width="30%" height="12px" />
              <div style={{ height: '0.4rem' }} />
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : bookmarkedArticles.length > 0 ? (
        <div className="article-grid">
          {bookmarkedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} onNavigate={onNavigate} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No bookmarks yet. Save articles to read later by clicking the bookmark icon.</p>
          <button className="btn-primary" onClick={() => onNavigate('/')}>
            Browse Articles
          </button>
        </div>
      )}
    </main>
  )
}