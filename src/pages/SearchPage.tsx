import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { searchArticles } from '../supabase/articles'
import ArticleCard from '../components/article/ArticleCard'
import { SkeletonCard, SkeletonLine } from '../components/common/SkeletonLoader'
import { useLocation } from 'react-router-dom'
import type { Article } from '../data/articles'

interface SearchPageProps {
  onNavigate: (path: string) => void
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const location = useLocation()
  const [query, setQuery] = useState(() => location.state?.query || '')
  const [results, setResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      let cancelled = false
      void (async () => {
        try {
          const r = await searchArticles(query)
          if (!cancelled) setResults(r)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => { cancelled = true }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <main className="search-page">
      <div className="search-header">
        <h1>Search</h1>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search articles, topics, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="search-input"
          />
        </div>
      </div>

      <div className="search-results">
        {query.length >= 2 && !loading && (
          <p className="search-count">
            {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
          </p>
        )}

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
        ) : results.length > 0 ? (
          <div className="article-grid">
            {results.map((article) => (
              <ArticleCard key={article.id} article={article} onNavigate={onNavigate} />
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="empty-state">
            <p>No articles found matching your search.</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Start typing to search for articles.</p>
          </div>
        )}
      </div>
    </main>
  )
}
