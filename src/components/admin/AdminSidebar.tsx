import { LayoutDashboard, FileText, Image, MessageSquare, BarChart3, Users, Settings, PlusCircle, Eye, LogOut, FolderTree, LayoutTemplate } from 'lucide-react'
import { signOutUser } from '../../supabase/auth'
import { useAuth } from '../../contexts/AuthContext'
import { logger } from '../../utils/logger'

interface AdminSidebarProps {
  currentPage: string
  onNavigate: (path: string) => void
  notificationBadge?: number
  onLogout?: () => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  path: string
  badge?: number
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'articles', label: 'Articles', icon: FileText, path: '/admin/articles' },
  { id: 'categories', label: 'Categories', icon: FolderTree, path: '/admin/categories' },
  { id: 'homepage', label: 'Homepage', icon: LayoutTemplate, path: '/admin/homepage' },
  { id: 'media', label: 'Media', icon: Image, path: '/admin/media' },
  { id: 'comments', label: 'Comments', icon: MessageSquare, path: '/admin/comments', badge: 3 },
]

const analyticsNavItems: NavItem[] = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
]

const managementNavItems: NavItem[] = [
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
]

export default function AdminSidebar({ currentPage, onNavigate, notificationBadge, onLogout }: AdminSidebarProps) {
  const { user } = useAuth()
  const userInitial = user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Editor'
  const userRole = 'Administrator'

  const handleLogout = async () => {
    try {
      await signOutUser()
      onLogout?.()
      onNavigate('/admin/login')
    } catch (error) {
      logger.error('Logout error', error)
    }
  }

  return (
    <>
      {/* Branding */}
      <div className="sidebar-branding">
        <img
          src="/Logo Icon.png"
          alt="Delta Update"
          className="sidebar-logo-icon"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            objectFit: 'contain',
          }}
        />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-text-main">Delta Update</div>
          <div className="sidebar-logo-text-sub">Admin</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">
          <div className="sidebar-nav-label">Main</div>

          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="sidebar-nav-item-badge">{item.badge}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="sidebar-nav-section">
          <div className="sidebar-nav-label">Analytics</div>

          {analyticsNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="sidebar-nav-section">
          <div className="sidebar-nav-label">Management</div>

          {managementNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="sidebar-nav-section">
          <div className="sidebar-nav-label">Quick Actions</div>

          <button
            onClick={() => onNavigate('/admin/editor')}
            className="sidebar-nav-item"
          >
            <PlusCircle size={18} />
            <span>New Article</span>
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="sidebar-nav-item"
          >
            <Eye size={18} />
            <span>View Site</span>
          </button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="sidebar-user">
        <button className="sidebar-user-item" onClick={handleLogout} title="Sign out">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">{userRole}</div>
          </div>
          <LogOut size={14} className="sidebar-user-logout" />
        </button>
      </div>
    </>
  )
}
