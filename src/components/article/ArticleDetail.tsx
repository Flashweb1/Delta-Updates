import { useState, useEffect } from 'react'
import { Article } from '../../data/articles'
import {
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Clock,
  Share2,
  Type,
  Play,
  Pause,
  Check,
  Volume2,
  ChevronRight,
  Camera,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useBookmarks } from '../../contexts/BookmarkContext'
import { summarizeArticle, isAIEnabled } from '../../utils/ai'

interface ArticleDetailProps {
  article: Article
  onNavigate: (path: string) => void
  relatedArticles?: Article[]
}

export default function ArticleDetail({
  article,
  onNavigate,
  relatedArticles = [],
}: ArticleDetailProps) {
  const { toggleBookmark, isBookmarked } = useBookmarks()
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal')
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [aiSummary, setAiSummary] = useState<string[]>([])
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryLoaded, setAiSummaryLoaded] = useState(false)

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [article.id])

  // Load AI summary on mount if AI is enabled
  useEffect(() => {
    if (!isAIEnabled() || aiSummaryLoaded) return
    setAiSummaryLoading(true)
    summarizeArticle(article.title, article.body)
      .then((bullets) => {
        setAiSummary(bullets)
        setAiSummaryLoaded(true)
      })
      .catch(() => {})
      .finally(() => setAiSummaryLoading(false))
  }, [article.id])

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: article.dek,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const toggleAudio = () => {
    if (!isPlayingAudio) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const textToRead = `${article.title}. ${article.dek}. ${article.body.join(' ')}`
        const utterance = new SpeechSynthesisUtterance(textToRead)
        utterance.rate = 1.0
        utterance.onend = () => setIsPlayingAudio(false)
        utterance.onerror = () => setIsPlayingAudio(false)
        window.speechSynthesis.speak(utterance)
      }
      setIsPlayingAudio(true)
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsPlayingAudio(false)
    }
  }

  return (
    <article
      className={`article-detail font-size-${fontSize} font-family-${fontFamily}`}
      itemScope
      itemType="https://schema.org/NewsArticle"
    >
      {showToast && (
        <div className="toast-notification" role="status" aria-live="polite">
          <Check size={16} /> Link copied to clipboard
        </div>
      )}

      {/* Top Breadcrumbs & Utility Actions */}
      <div className="article-detail-topbar">
        <nav className="article-breadcrumbs" aria-label="Breadcrumb">
          <button className="breadcrumb-link" onClick={() => onNavigate('/')}>
            <ArrowLeft size={15} /> Home
          </button>
          <ChevronRight size={13} className="breadcrumb-sep" aria-hidden="true" />
          <button
            className="breadcrumb-link"
            onClick={() => onNavigate(`/category/${article.category.toLowerCase()}`)}
          >
            {article.category}
          </button>
        </nav>

        {/* Reader Customization Toolbar */}
        <div className="article-reader-toolbar" role="toolbar" aria-label="Reading options">
          <div className="toolbar-group" title="Adjust text size">
            <button
              className={`toolbar-btn ${fontSize === 'normal' ? 'active' : ''}`}
              onClick={() => setFontSize('normal')}
              aria-label="Normal text size"
            >
              A<sup>-</sup>
            </button>
            <button
              className={`toolbar-btn ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => setFontSize('large')}
              aria-label="Large text size"
            >
              A
            </button>
            <button
              className={`toolbar-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setFontSize('xlarge')}
              aria-label="Extra large text size"
            >
              A<sup>+</sup>
            </button>
          </div>

          <div className="toolbar-divider" aria-hidden="true" />

          <button
            className={`toolbar-btn ${fontFamily === 'serif' ? 'active' : ''}`}
            onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
            title="Toggle Serif / Sans Font"
            aria-label="Toggle typography typeface"
          >
            <Type size={15} />
            <span>{fontFamily === 'serif' ? 'Serif' : 'Sans'}</span>
          </button>

          <div className="toolbar-divider" aria-hidden="true" />

          <button
            className={`toolbar-btn ${isBookmarked(article.id) ? 'active' : ''}`}
            onClick={() => toggleBookmark(article.id)}
            title={isBookmarked(article.id) ? 'Remove bookmark' : 'Bookmark story'}
            aria-label="Bookmark this article"
          >
            {isBookmarked(article.id) ? (
              <BookmarkCheck size={16} className="bookmarked-icon" />
            ) : (
              <Bookmark size={16} />
            )}
            <span className="btn-label">{isBookmarked(article.id) ? 'Saved' : 'Save'}</span>
          </button>

          <button
            className="toolbar-btn"
            onClick={handleShare}
            title="Share article"
            aria-label="Share article"
          >
            <Share2 size={16} />
            <span className="btn-label">Share</span>
          </button>
        </div>
      </div>

      {/* Editorial Header Section */}
      <header className="article-detail-header-editorial">
        <div className="article-kicker-badge">
          <span className="kicker-pill">{article.category}</span>
          <span className="kicker-edition">Exclusive Report</span>
        </div>

        <h1 className="article-headline-editorial" itemProp="headline">
          {article.title}
        </h1>

        <p className="article-dek-editorial" itemProp="description">
          {article.dek}
        </p>

        <div className="article-byline-editorial">
          <div className="author-details">
            <div className="author-avatar-initials" aria-hidden="true">
              {article.author
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="author-meta">
              <span className="author-name" itemProp="author">
                {article.author}
              </span>
              <span className="author-role">{article.authorRole}</span>
            </div>
          </div>

          <div className="publication-meta">
            <time className="publish-date" dateTime={article.publishedAt}>
              {article.publishedAt}
            </time>
            <span className="meta-sep" aria-hidden="true">·</span>
            <span className="read-time-pill">
              <Clock size={13} aria-hidden="true" />
              <span>{article.readTime} min read</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Photography & Caption */}
      <figure className="article-hero-figure">
        <div className="article-hero-image-wrap">
          <img
            src={article.image}
            alt={article.title}
            className="article-hero-img"
            itemProp="image"
            width={1200}
            height={675}
          />
        </div>
        <figcaption className="article-hero-caption">
          <Camera size={13} aria-hidden="true" />
          <span>
            Featured documentation: {article.title}. Photo via Delta Update Editorial Archive.
          </span>
        </figcaption>
      </figure>

      {/* Audio Listen Bar */}
      <section className="audio-listen-bar" aria-label="Listen to audio version">
        <button
          className={`audio-play-btn ${isPlayingAudio ? 'is-playing' : ''}`}
          onClick={toggleAudio}
          aria-label={isPlayingAudio ? 'Pause audio narration' : 'Play audio narration'}
        >
          {isPlayingAudio ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="audio-info">
          <div className="audio-title">
            <Volume2 size={15} />
            <span>Listen to this story</span>
            {isPlayingAudio && <span className="audio-live-pill">Playing</span>}
          </div>
          <div className="audio-subtitle">
            {isPlayingAudio
              ? 'Reading full story via voice narration...'
              : `${article.readTime} min audio briefing available`}
          </div>
        </div>
      </section>

      {/* Article Content Container */}
      <div className="article-detail-content">
        {/* AI-Powered Executive Summary */}
        <aside className="key-takeaways" aria-label="Executive summary">
          <div className="takeaways-header">
            <span className="gold-bullet" aria-hidden="true">❖</span>
            <h4>
              Executive Briefing
              {isAIEnabled() && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Sparkles size={11} /> AI
                </span>
              )}
            </h4>
          </div>
          {aiSummaryLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink-3)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
              <Loader2 size={14} className="ai-spin" /> Generating summary…
            </div>
          ) : aiSummary.length > 0 ? (
            <ul>
              {aiSummary.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          ) : (
            <ul>
              <li>Key strategic developments, infrastructure expansion, and regional milestones outlined in this report.</li>
              <li>Direct implications for local commerce, administrative governance, and stakeholder partnerships.</li>
            </ul>
          )}
        </aside>

        {/* Article Body */}
        <div className="article-body" itemProp="articleBody">
          {article.body.map((paragraph, i) => (
            <p key={i} className={i === 0 ? 'first-paragraph' : ''}>
              {i === 0 && <span className="drop-cap">{paragraph.charAt(0)}</span>}
              {i === 0 ? paragraph.slice(1) : paragraph}
            </p>
          ))}
        </div>

        {/* Tags Pill Cloud */}
        <div className="article-tags" aria-label="Article topics">
          <span className="tags-label">Related Topics:</span>
          {article.tags.map((tag) => (
            <button
              key={tag}
              className="tag-pill"
              onClick={() => onNavigate(`/search?q=${encodeURIComponent(tag)}`)}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Editorial End Mark */}
        <div className="article-end-mark" aria-hidden="true">
          <span>❖ ❖ ❖</span>
        </div>
      </div>

      {/* Related Stories Section */}
      {relatedArticles.length > 0 && (
        <aside className="related-articles" aria-label="Related stories">
          <div className="section-header-home">
            <div className="section-title-wrapper">
              <h2 className="section-title">Related Stories</h2>
              <p className="section-subtitle">More from {article.category}</p>
            </div>
            <div className="section-rule" />
          </div>

          <div className="related-editorial-grid">
            {relatedArticles.map((related) => (
              <article
                key={related.id}
                className="related-card-item"
                onClick={() => onNavigate(`/article/${related.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onNavigate(`/article/${related.slug}`)
                  }
                }}
              >
                <div className="related-card-image">
                  <img src={related.image} alt={related.title} loading="lazy" width={400} height={225} />
                  <span className="related-card-badge">{related.category}</span>
                </div>
                <div className="related-card-body">
                  <h3 className="related-card-title">{related.title}</h3>
                  <div className="related-card-meta">
                    <span>{related.publishedAt}</span>
                    <span className="sep">·</span>
                    <span>{related.readTime} min read</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      )}
    </article>
  )
}