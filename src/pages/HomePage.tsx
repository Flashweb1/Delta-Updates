import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import type { Article } from '../data/articles'
import { getFeaturedArticles, getLatestArticles, getArticlesByCategory } from '../supabase/articles'
import HeroSection from '../components/home/HeroSection'
import TopStoriesSidebar from '../components/home/TopStoriesSidebar'
import LatestStoriesGrid from '../components/home/LatestStoriesGrid'
import FeaturedMoreNewsletter from '../components/home/FeaturedMoreNewsletter'
import TrendingSection from '../components/home/TrendingSection'
import OpinionSection from '../components/home/OpinionSection'
import VideoSection from '../components/home/VideoSection'
import NewsletterCTA from '../components/home/NewsletterCTA'
import { SkeletonHero, SkeletonCard, SkeletonLine } from '../components/common/SkeletonLoader'
import { buildCanonicalUrl, getSiteConfig } from '../utils/security'
import '../components/home/home.css'

interface HomePageProps {
  onNavigate: (path: string) => void
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const cfg = getSiteConfig()
  const [featured, setFeatured] = useState<Article[]>([])
  const [latest, setLatest] = useState<Article[]>([])
  const [politics, setPolitics] = useState<Article[]>([])
  const [business, setBusiness] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let cancelled = false

    void Promise.allSettled([
      getFeaturedArticles(12),
      getLatestArticles(24),
      getArticlesByCategory('Politics'),
      getArticlesByCategory('Business'),
    ]).then((results) => {
      if (cancelled) return
      const f = results[0].status === 'fulfilled' ? results[0].value : []
      const l = results[1].status === 'fulfilled' ? results[1].value : []
      const p = results[2].status === 'fulfilled' ? results[2].value : []
      const b = results[3].status === 'fulfilled' ? results[3].value : []
      setFeatured(f)
      setLatest(l)
      setPolitics(p.slice(0, 5))
      setBusiness(b.slice(0, 5))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  return (
    <main className="home-page">
      <Helmet>
        <title>{cfg.name} — Information for living</title>
        <meta name="description" content={cfg.description} />
        <meta property="og:title" content={`${cfg.name} — Information for living`} />
        <meta property="og:description" content={cfg.description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={buildCanonicalUrl('/')} />
      </Helmet>

      {loading ? (
        <div className="section" style={{ paddingBlock: '2.5rem 1rem' }} aria-busy="true">
          <SkeletonHero />
          <div className="section-header" style={{ marginTop: '2.5rem', marginBottom: '0.5rem' }}>
            <SkeletonLine width="28%" height="22px" />
            <div className="section-rule" />
          </div>
          <div className="article-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="home-page-container">
          {/* Main Editorial Hero & Editor's Picks Split Layout */}
          {(() => {
            const hero = featured[0]
            if (!hero) return null
            return (
              <section className="section hero-editorial-section" aria-label="Top stories">
                <div className="hero-editorial-grid">
                  <div className="hero-main-column">
                    <HeroSection article={hero} onNavigate={onNavigate} />
                  </div>
                  {featured.length > 1 && (
                    <div className="hero-sidebar-column">
                      <TopStoriesSidebar articles={featured.slice(1, 6)} onNavigate={onNavigate} />
                    </div>
                  )}
                </div>
              </section>
            )
          })()}

          {/* Latest Stories Grid */}
          <div className="section">
            <LatestStoriesGrid articles={latest} onNavigate={onNavigate} />
          </div>

          {/* Featured + More News + Newsletter */}
          {(() => {
            const primary = featured[0]
            const fallback = featured[6] ?? primary
            if (!fallback) return null
            return (
              <div className="section">
                <FeaturedMoreNewsletter
                  featuredArticle={fallback}
                  moreNewsArticles={latest.slice(0, 5)}
                  onNavigate={onNavigate}
                />
              </div>
            )
          })()}

          {/* Trending Section */}
          {latest.length > 0 && (
            <div className="section">
              <TrendingSection articles={latest} onNavigate={onNavigate} />
            </div>
          )}

          {/* Politics & Policy Section */}
          {politics.length > 0 && (
            <div className="section">
              <OpinionSection
                articles={politics}
                onNavigate={onNavigate}
                title="Politics & Governance"
                subtitle="National affairs, policy decisions, and state governance updates"
                categorySlug="politics"
              />
            </div>
          )}

          {/* Video Section */}
          {(() => {
            const videoArticle = featured[8]
            if (!videoArticle) return null
            return (
              <div className="section">
                <VideoSection
                  title="Featured Video Story"
                  description="Watch our latest video report covering the most important stories of the day."
                  thumbnail={videoArticle.image}
                />
              </div>
            )
          })()}

          {/* Business & Economy Section */}
          {business.length > 0 && (
            <div className="section">
              <OpinionSection
                articles={business}
                onNavigate={onNavigate}
                title="Business & Markets"
                subtitle="Quarterly trends, commerce, tech innovation, and trade indicators"
                categorySlug="business"
              />
            </div>
          )}

          {/* Newsletter CTA */}
          <div className="section">
            <NewsletterCTA />
          </div>
        </div>
      )}
    </main>
  )
}
