import { useState, useEffect } from 'react'
import { FileText, Eye, Clock, AlertCircle } from 'lucide-react'
import type { Article } from '../../data/articles'
import { getAllArticlesAdmin } from '../../supabase/articles'
import AdminLayout from '../../components/admin/AdminLayout'
import RecentArticlesTable from '../../components/admin/RecentArticlesTable'
import RecentActivity from '../../components/admin/RecentActivity'
import TopPerformingStories from '../../components/admin/TopPerformingStories'
import ContentPerformanceChart from '../../components/admin/ContentPerformanceChart'
import PublishingOverview from '../../components/admin/PublishingOverview'
import { logger } from '../../utils/logger'

interface AdminDashboardProps {
  onNavigate: (path: string) => void
}

type Stats = { total: number; published: number; drafts: number; reviews: number }

function compute7DayTrend(articles: Article[], status?: string): { current: number; previous: number } {
  const now = Date.now()
  const D7 = 7 * 24 * 60 * 60 * 1000
  const D14 = 14 * 24 * 60 * 60 * 1000
  let current = 0
  let previous = 0
  for (const a of articles) {
    if (status && a.status !== status) continue
    const ts = a.createdAt instanceof Date
      ? a.createdAt.getTime()
      : (a as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? Number(new Date(a.publishedAt || 0))
    if (Number.isNaN(ts)) continue
    const age = now - ts
    if (age < D7) current++
    else if (age < D14) previous++
  }
  return { current, previous }
}

function formatTrend({ current, previous }: { current: number; previous: number }): { label: string; cls: 'positive' | 'negative' | 'neutral' } {
  if (previous === 0 && current === 0) return { label: 'No data', cls: 'neutral' }
  if (previous === 0) return { label: current > 0 ? 'New' : 'No data', cls: current > 0 ? 'positive' : 'neutral' }
  const pct = Math.round(((current - previous) / previous) * 100)
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  const cls: 'positive' | 'negative' | 'neutral' = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral'
  return { label: `${arrow} ${Math.abs(pct)}% vs last 7 days`, cls }
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, drafts: 0, reviews: 0 })
  const [articles, setArticles] = useState<Article[]>([])
  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetched = await getAllArticlesAdmin()
        setAllArticles(fetched)
        setArticles(fetched.slice(0, 5))
        setStats({
          total: fetched.length,
          published: fetched.filter((a) => a.status === 'published').length,
          drafts: fetched.filter((a) => a.status === 'draft').length,
          reviews: fetched.filter((a) => a.status === 'review').length,
        })
      } catch (error: unknown) {
        logger.error('[admin] Error loading dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  const totalTrend = formatTrend(compute7DayTrend(allArticles))
  const pubTrend = formatTrend(compute7DayTrend(allArticles, 'published'))
  const draftTrend = formatTrend(compute7DayTrend(allArticles, 'draft'))
  const reviewTrend = formatTrend(compute7DayTrend(allArticles, 'review'))

  const formattedArticles = articles.map(a => ({
    id: a.id,
    title: a.title,
    category: a.category,
    author: a.author || 'Editor',
    status: a.status as 'published' | 'draft' | 'review',
    views: 0,
    date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    thumbnail: a.image
  }))

  const topStories = allArticles
    .filter(a => a.status === 'published')
    .slice(0, 5)
    .map((a, idx) => ({
      rank: idx + 1,
      title: a.title,
      views: 0
    }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <AdminLayout currentPage="dashboard" onNavigate={onNavigate}>
      {/* Greeting Section */}
      <div className="dashboard-greeting">
        <div className="greeting-content">
          <h1 className="greeting-title">
            {greeting}, Editor<span className="greeting-accent">.</span>
          </h1>
          <p className="greeting-subtitle">{date}</p>
        </div>
        <div className="greeting-actions">
          <button className="btn-primary-new" onClick={() => onNavigate('/admin/editor')}>
            <span>+</span>
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon">
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total Articles</div>
          <div className={`kpi-trend ${totalTrend.cls}`}>{totalTrend.label}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon">
              <Eye size={20} />
            </div>
          </div>
          <div className="kpi-value">{stats.published}</div>
          <div className="kpi-label">Published</div>
          <div className={`kpi-trend ${pubTrend.cls}`}>{pubTrend.label}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon">
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value">{stats.drafts}</div>
          <div className="kpi-label">Drafts</div>
          <div className={`kpi-trend ${draftTrend.cls}`}>{draftTrend.label}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon">
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value">{stats.reviews}</div>
          <div className="kpi-label">In Review</div>
          <div className={`kpi-trend ${reviewTrend.cls}`}>{reviewTrend.label}</div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="analytics-grid">
        {/* Content Performance Chart */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h2 className="analytics-card-title">Content Performance</h2>
            <button className="analytics-dropdown">Last 7 days ▼</button>
          </div>
          <ContentPerformanceChart />
        </div>

        {/* Publishing Overview */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h2 className="analytics-card-title">Publishing Overview</h2>
          </div>
          <div className="card-body">
            <PublishingOverview
              published={stats.published}
              drafts={stats.drafts}
              inReview={stats.reviews}
            />
          </div>
        </div>
      </div>

      {/* Content Grid - Recent Articles + Activity */}
      <div className="content-grid">
        <div className="content-main">
          {loading ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                Loading articles...
              </div>
            </div>
          ) : (
            <RecentArticlesTable 
              articles={formattedArticles}
              onNavigate={onNavigate}
            />
          )}
        </div>

        <div className="content-sidebar">
          <RecentActivity onNavigate={onNavigate} />
          <TopPerformingStories stories={topStories} />
        </div>
      </div>
    </AdminLayout>
  )
}
