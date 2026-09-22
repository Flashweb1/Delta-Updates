import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search } from 'lucide-react'
import Masthead from './components/layout/Masthead'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import ReadingProgress from './components/layout/ReadingProgress'
import HomePage from './pages/HomePage'
import CookieConsent from './components/common/CookieConsent'
import { SkeletonLine, SkeletonCard, SkeletonHero } from './components/common/SkeletonLoader'
import { attachGlobalErrorHandlers } from './utils/logger'
import { buildCanonicalUrl, getSiteConfig, isValidCategory, isValidSlug } from './utils/security'
import { useAuth } from './contexts/AuthContext'
import { initReactSentry } from './utils/sentry'
import { analytics } from './analytics'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'
import './styles/admin-premium.css'

const ArticlePage = lazy(() => import('./pages/ArticlePage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'))
const ArticlesPage = lazy(() => import('./pages/admin/ArticlesPage'))
const MediaPage = lazy(() => import('./pages/admin/MediaPage'))
const CommentsPage = lazy(() => import('./pages/admin/CommentsPage'))
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'))
const HomepagePage = lazy(() => import('./pages/admin/HomepagePage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))

type PageKind =
  | 'home'
  | 'article'
  | 'category'
  | 'search'
  | 'bookmarks'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-articles'
  | 'admin-categories'
  | 'admin-homepage'
  | 'admin-media'
  | 'admin-comments'
  | 'admin-analytics'
  | 'admin-users'
  | 'admin-settings'
  | 'admin-editor'
  | 'privacy'
  | 'terms'

function classifyPath(pathname: string): PageKind {
  if (pathname === '/' || pathname === '') return 'home'
  if (pathname.startsWith('/article/')) return 'article'
  if (pathname.startsWith('/category/')) return 'category'
  if (pathname === '/search') return 'search'
  if (pathname === '/bookmarks') return 'bookmarks'
  if (pathname === '/admin/login') return 'admin-login'
  if (pathname === '/admin') return 'admin-dashboard'
  if (pathname === '/admin/articles') return 'admin-articles'
  if (pathname === '/admin/categories') return 'admin-categories'
  if (pathname === '/admin/homepage') return 'admin-homepage'
  if (pathname === '/admin/media') return 'admin-media'
  if (pathname === '/admin/comments') return 'admin-comments'
  if (pathname === '/admin/analytics') return 'admin-analytics'
  if (pathname === '/admin/users') return 'admin-users'
  if (pathname === '/admin/settings') return 'admin-settings'
  if (pathname.startsWith('/admin/editor')) return 'admin-editor'
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/terms') return 'terms'
  return 'home'
}

function isArticleReading(kind: PageKind): boolean {
  return kind === 'article'
}

function isAdminPage(kind: PageKind): boolean {
  return kind.startsWith('admin-')
}

function isPolicyPage(kind: PageKind): boolean {
  return kind === 'privacy' || kind === 'terms'
}

function PageFallback({ dense = false }: { dense?: boolean }) {
  return (
    <div className="section" aria-hidden style={{ paddingBlock: dense ? '2rem' : '3rem' }}>
      <div style={{ marginBottom: '1rem', width: 'min(880px, 100%)' }}>
        <SkeletonLine width="28%" height="12px" />
        <div style={{ height: '0.6rem' }} />
        <SkeletonLine width="72%" height="28px" />
      </div>
      {!dense && <SkeletonHero />}
      <div className="section-header" style={{ marginTop: '2.5rem', marginBottom: '0.5rem' }}>
        <SkeletonLine width="28%" height="22px" />
        <div className="section-rule" />
      </div>
      <div className="article-grid" style={{ opacity: 0.9 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user || !isAdmin) {
      navigate('/admin/login', { replace: true })
    }
  }, [user, isAdmin, loading, navigate])

  if (loading) return <PageFallback dense />
  if (!user || !isAdmin) return null
  return <>{children}</>
}

function NotFoundRoute({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <NotFoundPage onNavigate={onNavigate} />
}

function SlugRoute({
  validator,
  render,
}: {
  validator: (slug: string) => boolean
  render: (slug: string) => ReactNode
}) {
  const { slug = '' } = useParams<{ slug: string }>()
  if (slug && !validator(slug)) return <Navigate to="/" replace />
  return <>{render(slug)}</>
}

function EditorIdRoute({ render }: { render: (id: string | undefined) => ReactNode }) {
  const { articleId } = useParams<{ articleId: string }>()
  if (articleId && !/^[\w-]{1,64}$/.test(articleId)) return <Navigate to="/admin" replace />
  return <>{render(articleId)}</>
}

function Layout() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const cfg = getSiteConfig()

  const kind = classifyPath(location.pathname)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    attachGlobalErrorHandlers()
    const t = setTimeout(() => setIsInitializing(false), 50)
    return () => clearTimeout(t)
  }, [])

  // Track page views with analytics
  useEffect(() => {
    analytics.logPageView(location.pathname)
  }, [location.pathname])

  const navigate = (path: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    routerNavigate(path)
  }

  const showNav = !isArticleReading(kind) && !isAdminPage(kind)
  const showTicker = showNav && !isPolicyPage(kind)
  const showFooter = !isArticleReading(kind) && !isAdminPage(kind)
  const activeCategory =
    kind === 'category'
      ? (location.pathname.split('/').filter(Boolean)[1] ?? '').toLowerCase()
      : undefined

  return (
    <div className="app">
      <Helmet
        prioritizeSeoTags
        htmlAttributes={{ lang: 'en-NG' }}
        titleTemplate={`%s — ${cfg.name}`}
        defaultTitle={`${cfg.name} — Information for living`}
      >
        <link rel="canonical" href={buildCanonicalUrl(location.pathname)} />
      </Helmet>

      <ReadingProgress />

      {!isAdminPage(kind) && <Masthead onNavigate={navigate} />}

      {showNav && (
        <div className="nav-wrapper">
          <Nav onNavigate={navigate} activeCategory={activeCategory} />
          <button
            type="button"
            className="search-btn"
            aria-label="Open search"
            onClick={() => navigate('/search')}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      )}

      {showTicker && <Ticker />}

      <div className="page-content">
        <Suspense fallback={<PageFallback dense={kind !== 'home'} />}>
          {isInitializing ? (
            <PageFallback dense={kind !== 'home'} />
          ) : (
            <Routes location={location}>
              <Route path="/" element={<HomePage onNavigate={navigate} />} />
              <Route
                path="/article/:slug"
                element={
                  <SlugRoute
                    validator={isValidSlug}
                    render={(slug) => <ArticlePage onNavigate={navigate} slug={slug} />}
                  />
                }
              />
              <Route
                path="/category/:slug"
                element={
                  <SlugRoute
                    validator={isValidCategory}
                    render={(slug) => <CategoryPage onNavigate={navigate} slug={slug} />}
                  />
                }
              />
              <Route path="/search" element={<SearchPage onNavigate={navigate} />} />
              <Route path="/bookmarks" element={<BookmarksPage onNavigate={navigate} />} />
              <Route path="/admin/login" element={<AdminLogin onNavigate={navigate} />} />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminDashboard onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/articles"
                element={
                  <RequireAdmin>
                    <ArticlesPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <RequireAdmin>
                    <CategoriesPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/homepage"
                element={
                  <RequireAdmin>
                    <HomepagePage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/media"
                element={
                  <RequireAdmin>
                    <MediaPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/comments"
                element={
                  <RequireAdmin>
                    <CommentsPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <RequireAdmin>
                    <AnalyticsPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireAdmin>
                    <UsersPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RequireAdmin>
                    <SettingsPage onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/editor"
                element={
                  <RequireAdmin>
                    <ArticleEditor onNavigate={navigate} />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/editor/:articleId"
                element={
                  <RequireAdmin>
                    <EditorIdRoute
                      render={(id) => <ArticleEditor onNavigate={navigate} articleId={id} />}
                    />
                  </RequireAdmin>
                }
              />
              <Route path="/privacy" element={<PrivacyPage onNavigate={navigate} />} />
              <Route path="/terms" element={<TermsPage onNavigate={navigate} />} />
              <Route path="*" element={<NotFoundRoute onNavigate={navigate} />} />
            </Routes>
          )}
        </Suspense>
      </div>

      {showFooter && <Footer onNavigate={navigate} />}

      <CookieConsent />
    </div>
  )
}

export default function App() {
  return <Layout />
}
