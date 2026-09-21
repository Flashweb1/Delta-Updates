import { Search, Bell, Settings, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface AdminHeaderProps {
  breadcrumb?: { label: string; path?: string }[]
  onBreadcrumbClick?: (path: string) => void
  onNavigate?: (path: string) => void
  onMenuToggle?: () => void
}

export default function AdminHeader({ breadcrumb, onBreadcrumbClick, onNavigate, onMenuToggle }: AdminHeaderProps) {
  const { user } = useAuth()
  const userInitial = user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'

  const defaultBreadcrumb = breadcrumb || [
    { label: 'Admin', path: '/admin' },
    { label: 'Dashboard' }
  ]

  return (
    <div className="admin-header-top">
      <div className="header-left">
        <button
          className="header-icon-btn"
          onClick={onMenuToggle}
          id="mobile-menu-toggle"
          title="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="breadcrumb">
          {defaultBreadcrumb.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.path ? (
                <button
                  className="breadcrumb-item"
                  onClick={() => onBreadcrumbClick?.(item.path!)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {item.label}
                </button>
              ) : (
                <span className="breadcrumb-current">{item.label}</span>
              )}
              {index < defaultBreadcrumb.length - 1 && (
                <span className="breadcrumb-separator">/</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="header-right">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search articles, comments, users..."
          />
          <div className="search-shortcut">⌘ K</div>
        </div>

        <button className="header-icon-btn" title="Notifications">
          <Bell size={18} />
          <div className="notification-dot"></div>
        </button>

        <button className="header-icon-btn" title="Settings" onClick={() => onNavigate?.('/admin/settings')}>
          <Settings size={18} />
        </button>

        <button className="header-icon-btn" style={{ marginLeft: '8px' }}>
          <div className="header-user-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-red-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
            {userInitial}
          </div>
        </button>
      </div>
    </div>
  )
}
