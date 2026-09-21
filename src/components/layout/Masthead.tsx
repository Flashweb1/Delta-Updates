import { useTheme } from '../../contexts/ThemeContext'
import { Sun, Moon, Bookmark, Menu, X, Search, LogIn, CloudSun, Globe } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

interface MastheadProps {
  onNavigate: (path: string) => void
}

export default function Masthead({ onNavigate }: MastheadProps) {
  const { isDark, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <header className="masthead-wrapper" role="banner">
      {/* Top Editorial Utility Bar */}
      <div className="masthead-utility-bar">
        <div className="utility-bar-inner">
          <div className="utility-left">
            <span className="utility-date" aria-label={`Current date: ${todayStr}`}>
              <span className="location-dot" aria-hidden="true" />
              Lagos, NG • {todayStr}
            </span>
            <span className="utility-sep" aria-hidden="true">|</span>
            <span className="utility-weather" title="Lagos Weather Forecast">
              <CloudSun size={13} aria-hidden="true" />
              <span>28°C Partial Sun</span>
            </span>
            <span className="utility-sep" aria-hidden="true">|</span>
            <span className="utility-edition">
              <Globe size={12} aria-hidden="true" />
              <span>West Africa Edition</span>
            </span>
          </div>

          <div className="utility-right">
            <button
              className="icon-btn theme-toggle-btn"
              onClick={toggle}
              aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-pressed={isDark}
            >
              {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span className="btn-tooltip" aria-hidden="true">{isDark ? 'Light' : 'Dark'}</span>
            </button>
            <button
              className="icon-btn"
              onClick={() => onNavigate('/bookmarks')}
              aria-label="Saved Bookmarks"
              title="Saved Bookmarks"
            >
              <Bookmark size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Masthead Banner */}
      <div className="masthead-main">
        <div className="masthead-main-inner">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          <div className="masthead-side-block left">
            <span className="masthead-tagline-text">Independent Journalism</span>
            <span className="masthead-tagline-sub">Integrity • Truth • Speed</span>
          </div>

          <button
            className="logo"
            onClick={() => onNavigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Delta Update - Home"
          >
            <span className="logo-text">
              Delta<span className="accent"> Update</span>
            </span>
            <span className="logo-slogan">Information for living</span>
          </button>

          <div className="masthead-side-block right">
            <button
              type="button"
              className="masthead-newsletter-btn"
              onClick={() => {
                const el = document.getElementById('newsletter-section')
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' })
                } else {
                  onNavigate('/')
                }
              }}
            >
              Subscribe
            </button>
            <button
              type="button"
              className="masthead-login-btn"
              onClick={() => onNavigate('/admin/login')}
              style={{ marginLeft: '0.5rem' }}
            >
              Login
            </button>
          </div>

          <button
            type="button"
            className="icon-btn mobile-search-btn"
            onClick={() => onNavigate('/search')}
            aria-label="Open search"
            title="Search"
          >
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay — portal to body so header backdrop-filter doesn't clip the fixed layer */}
      {typeof document !== 'undefined' &&
        menuOpen &&
        createPortal(
          <div
            className="mobile-nav-overlay"
            onClick={() => setMenuOpen(false)}
            role="dialog"
            aria-label="Navigation menu"
          >
          <nav
            className="mobile-nav-panel"
            id="mobile-nav-panel"
            onClick={(e) => e.stopPropagation()}
            aria-label="Main navigation"
          >
            <div className="mobile-nav-header">
              <span className="logo-small">
                Delta<span className="accent">.</span>
              </span>
              <button
                className="icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/')
                setMenuOpen(false)
              }}
            >
              Home
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/politics')
                setMenuOpen(false)
              }}
            >
              Politics
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/news')
                setMenuOpen(false)
              }}
            >
              News
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/business')
                setMenuOpen(false)
              }}
            >
              Business
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/world')
                setMenuOpen(false)
              }}
            >
              World
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/tech')
                setMenuOpen(false)
              }}
            >
              Tech
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/health')
                setMenuOpen(false)
              }}
            >
              Health
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/sports')
                setMenuOpen(false)
              }}
            >
              Sports
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/religion')
                setMenuOpen(false)
              }}
            >
              Religion
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/category/education')
                setMenuOpen(false)
              }}
            >
              Education
            </a>
            <a
              role="menuitem"
              onClick={() => {
                onNavigate('/bookmarks')
                setMenuOpen(false)
              }}
            >
              Saved Bookmarks
            </a>

            <div className="mobile-nav-footer">
              <button
                type="button"
                className="mobile-nav-action"
                onClick={() => {
                  onNavigate('/admin/login')
                  setMenuOpen(false)
                }}
              >
                <LogIn size={16} aria-hidden="true" />
                Login
              </button>
              <button
                type="button"
                className="mobile-nav-action"
                onClick={toggle}
                aria-pressed={isDark}
              >
                {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </header>
  )
}