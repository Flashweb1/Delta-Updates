import { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, Eye, Clock, FileText, Users, AlertTriangle } from 'lucide-react'
import type { Article } from '../../data/articles'
import { getAllArticlesAdmin } from '../../supabase/articles'
import AdminLayout from '../../components/admin/AdminLayout'
import StatsCard from '../../components/admin/StatsCard'

interface AnalyticsPageProps {
  onNavigate: (path: string) => void
}

type Period = 'week' | 'month' | 'year'

function bucketTs(ts: number, period: Period): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  if (period === 'week') {
    const day = d.getDay()
    d.setDate(d.getDate() - day)
  } else if (period === 'month') {
    d.setDate(1)
  } else if (period === 'year') {
    d.setMonth(0, 1)
  }
  return d.getTime()
}

function formatBucket(ts: number, period: Period): string {
  const d = new Date(ts)
  if (period === 'week') return `${d.getMonth() + 1}/${d.getDate()}`
  if (period === 'month') return d.toLocaleString('en-US', { month: 'short' })
  return String(d.getFullYear())
}

function parseAnyDate(a: Article): number {
  const raw =
    (a.createdAt instanceof Date
      ? a.createdAt.getTime()
      : (a as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.()) ??
    (a.publishedAt ? new Date(a.publishedAt).getTime() : 0)
  return Number.isNaN(raw) ? 0 : raw
}

interface ComputedAnalytics {
  totalArticles: number
  totalPublished: number
  totalCategories: number
  avgReadTime: number
  buckets: { label: string; value: number }[]
  categoryPerformance: { category: string; views: number; percentage: number }[]
  topArticles: { title: string; views: number; reads: number }[]
}

function computeAnalytics(articles: Article[], period: Period): ComputedAnalytics {
  const now = Date.now()
  const YEAR = 365 * 24 * 60 * 60 * 1000
  const published = articles.filter((a) => a.status === 'published')
  const inWindow = published.filter((a) => {
    const ts = parseAnyDate(a)
    return ts > 0 && now - ts <= YEAR
  })

  // Time buckets
  const agg = new Map<number, number>()
  for (const a of inWindow) {
    const key = bucketTs(parseAnyDate(a), period)
    agg.set(key, (agg.get(key) ?? 0) + 1)
  }
  const keys = [...agg.keys()].sort((a, b) => a - b)
  // Pad / limit to last 8 buckets
  const recent = keys.slice(-8)
  while (recent.length < 8 && recent.length > 0) {
    const step = period === 'week' ? 7 : period === 'month' ? 30 : 365
    const firstTs = recent[0]! - step * 24 * 60 * 60 * 1000
    recent.unshift(firstTs)
    if (!agg.has(firstTs)) agg.set(firstTs, 0)
  }
  const buckets = recent.map((k) => ({ label: formatBucket(k, period), value: agg.get(k) ?? 0 }))

  // Category performance (based on article counts since views aren't tracked)
  const byCat = new Map<string, number>()
  for (const a of published) byCat.set(a.category, (byCat.get(a.category) ?? 0) + 1)
  const catTotal = published.length || 1
  const categoryPerformance = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({
      category,
      views: count,
      percentage: Math.round((count / catTotal) * 100),
    }))
  // Fix percentages summing to 100
  let cum = 0
  for (let i = 0; i < categoryPerformance.length; i++) {
    const want = Math.round((categoryPerformance[i]!.views / catTotal) * 100)
    if (i === categoryPerformance.length - 1 && cum + want !== 100) {
      categoryPerformance[i]!.percentage = Math.max(0, 100 - cum)
    } else {
      categoryPerformance[i]!.percentage = want
      cum += want
    }
  }

  // Top articles (most recent published; views not tracked yet)
  const sorted = [...published].sort((a, b) => parseAnyDate(b) - parseAnyDate(a))
  const topArticles = sorted.slice(0, 5).map((a) => ({
    title: a.title,
    views: 0,
    reads: 0,
  }))

  const avgReadTime =
    published.length > 0
      ? Math.round((published.reduce((acc, a) => acc + (Number(a.readTime) || 0), 0) / published.length) * 10) / 10
      : 0

  return {
    totalArticles: articles.length,
    totalPublished: published.length,
    totalCategories: byCat.size,
    avgReadTime,
    buckets: buckets.length > 0 ? buckets : [
      { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
      { label: 'Apr', value: 0 }, { label: 'May', value: 0 }, { label: 'Jun', value: 0 },
      { label: 'Jul', value: 0 }, { label: 'Aug', value: 0 },
    ],
    categoryPerformance,
    topArticles,
  }
}

const TRAFFIC_NOTICE = (
  <div
    className="notice-card"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, rgba(255,221,153,0.12), rgba(255,221,153,0.04))',
      border: '1px solid rgba(230,167,86,0.25)',
      color: 'var(--admin-text-muted, #7a7f8a)',
      fontSize: '0.8rem',
      lineHeight: 1.5,
    }}
  >
    <AlertTriangle size={16} style={{ color: '#e6a756', flexShrink: 0, marginTop: 2 }} />
    <div>
      <strong style={{ color: 'var(--admin-text, #23262d)' }}>Traffic analytics pending.</strong>
      {' '}Page views, unique visitors, and traffic sources require Firebase Analytics or GA4 integration.
      Shown below are content-centric metrics computed from your Firestore article corpus.
    </div>
  </div>
)

export default function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const [period, setPeriod] = useState<Period>('month')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await getAllArticlesAdmin()
        if (!cancelled) setArticles(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const analytics = useMemo(() => computeAnalytics(articles, period), [articles, period])
  const maxValue = Math.max(1, ...analytics.buckets.map((d) => d.value))

  return (
    <AdminLayout currentPage="analytics" onNavigate={onNavigate}>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Content performance derived from your published articles.</p>
        </div>
        <div className="admin-filter-group">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              className={`admin-filter-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {TRAFFIC_NOTICE}

      <div className="admin-stats-grid" style={{ marginTop: '1.25rem' }}>
        <StatsCard
          icon={<Eye size={20} />}
          value={analytics.totalArticles.toString()}
          label="Total Articles"
          trend={{ value: analytics.buckets.reduce((a, b) => a + b.value, 0), direction: 'up', label: `This ${period} buckets` }}
          variant="primary"
        />
        <StatsCard
          icon={<Users size={20} />}
          value={analytics.totalPublished.toString()}
          label="Published"
          trend={{ value: analytics.totalCategories, direction: 'up', label: `Categories used` }}
          variant="info"
        />
        <StatsCard
          icon={<Clock size={20} />}
          value={analytics.avgReadTime > 0 ? `${analytics.avgReadTime} min` : '—'}
          label="Avg. Read Time"
          trend={{ value: 0, direction: 'up', label: 'From article metadata' }}
          variant="success"
        />
        <StatsCard
          icon={<FileText size={20} />}
          value={`${analytics.totalCategories}`}
          label="Active Categories"
          trend={{ value: analytics.categoryPerformance.length, direction: 'up', label: `With published content` }}
          variant="warning"
        />
      </div>

      <div className="admin-analytics-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Published Articles</h2>
            <span className="admin-text-sm admin-text-muted">
              Last 8 {period === 'week' ? 'weeks' : period === 'month' ? 'months' : 'years'}
            </span>
          </div>
          <div className="admin-chart-container" style={{ height: '260px' }}>
            <div className="admin-chart-bars">
              {analytics.buckets.map((item) => (
                <div key={item.label} className="admin-chart-bar">
                  <div
                    className="admin-chart-bar-fill"
                    style={{ height: `${(item.value / maxValue) * 100}%` }}
                    title={`${item.value} articles published`}
                  />
                  <span className="admin-chart-bar-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Content Mix</h2>
            <span className="admin-text-sm admin-text-muted">By category share</span>
          </div>
          <div className="admin-card-body">
            {analytics.categoryPerformance.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.categoryPerformance.map((cat) => (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span className="admin-text-sm" style={{ fontWeight: 500 }}>{cat.category}</span>
                      <span className="admin-text-sm admin-text-muted">
                        {cat.views} {cat.views === 1 ? 'article' : 'articles'} ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--admin-surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${cat.percentage}%`,
                          background: 'linear-gradient(90deg, var(--admin-accent), var(--admin-gold))',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                No published categories yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Latest Published Articles</h2>
            <span className="admin-text-sm admin-text-muted">By most recent</span>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Views</th>
                  <th>Reads</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topArticles.length > 0 ? (
                  analytics.topArticles.map((article, index) => (
                    <tr key={index}>
                      <td className="admin-text-muted">{index + 1}</td>
                      <td>
                        <div style={{ maxWidth: '280px' }}>
                          <div className="admin-text-sm admin-truncate">{article.title}</div>
                        </div>
                      </td>
                      <td className="admin-text-sm">—</td>
                      <td className="admin-text-sm admin-text-muted">—</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#888', fontSize: '0.85rem' }}>
                      No published articles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Category Count</h2>
            <span className="admin-text-sm admin-text-muted">Published per category</span>
          </div>
          <div className="admin-card-body">
            {analytics.categoryPerformance.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.categoryPerformance.map((cat) => (
                  <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="kicker" style={{ marginBottom: 0, minWidth: '80px' }}>{cat.category}</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--admin-surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(cat.percentage, 4)}%`,
                          background: 'var(--admin-accent)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span className="admin-text-sm admin-text-muted" style={{ minWidth: '50px', textAlign: 'right' }}>
                      {cat.views}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                No categories yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'none',
        }} />
      )}
    </AdminLayout>
  )
}
