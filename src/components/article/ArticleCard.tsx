import { Article } from '../../data/articles'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useBookmarks } from '../../contexts/BookmarkContext'
import { useReveal } from '../../hooks/useReveal'

interface ArticleCardProps {
  article: Article
  onNavigate: (path: string) => void
  variant?: 'default' | 'compact' | 'sidebar' | 'grid'
  reveal?: boolean
  revealDelay?: number
}

export default function ArticleCard({
  article,
  onNavigate,
  variant = 'default',
  reveal = false,
  revealDelay = 0,
}: ArticleCardProps) {
  const { toggleBookmark, isBookmarked } = useBookmarks()
  const { ref, visible } = useReveal<HTMLElement>({ threshold: 0.05 })

  return (
    <article
      ref={reveal ? ref : undefined}
      className={`article-card ${variant} ${reveal ? `reveal reveal-fade-up ${visible ? 'is-visible' : ''}` : ''}`}
      style={reveal && revealDelay ? { transitionDelay: `${revealDelay}ms` } : undefined}
      onClick={() => onNavigate(`/article/${article.slug}`)}
    >
      <div className="article-card-image">
        <img src={article.image} alt={article.title} loading="lazy" width={400} height={225} />
        <span className="kicker">{article.category}</span>
      </div>
      <div className="article-card-body">
        <h3 className="article-card-title">{article.title}</h3>
        <p className="article-card-dek">{article.dek}</p>
        <div className="article-card-meta">
          <span className="article-card-author">{article.author}</span>
          <span className="article-card-sep">·</span>
          <span className="article-card-date">{article.publishedAt}</span>
          <span className="article-card-sep">·</span>
          <span className="article-card-readtime">{article.readTime} min read</span>
          <button
            className="bookmark-btn"
            onClick={(e) => {
              e.stopPropagation()
              toggleBookmark(article.id)
            }}
            title={isBookmarked(article.id) ? 'Remove bookmark' : 'Bookmark'}
          >
            {isBookmarked(article.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>
    </article>
  )
}