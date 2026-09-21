import { useState, useEffect } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import { signOutUser } from '../../supabase/auth'
import { logger } from '../../utils/logger'

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (path: string) => void
  notificationBadge?: number
  breadcrumb?: { label: string; path?: string }[]
}

export default function AdminLayout({
  children,
  currentPage,
  onNavigate,
  notificationBadge,
  breadcrumb
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1023) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.querySelector('.admin-layout-sidebar')
      const toggle = document.getElementById('mobile-menu-toggle')
      if (sidebarOpen && sidebar && !sidebar.contains(e.target as Node) && !toggle?.contains(e.target as Node)) {
        setSidebarOpen(false)
      }
    }
    if (sidebarOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (sidebarOpen && window.innerWidth <= 1023) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [sidebarOpen])

  const handleLogout = async () => {
    try {
      await signOutUser()
    } catch (error) {
      logger.error('Logout error', error)
    }
  }

  return (
    <div className="admin-layout-container">
      <div className={`admin-layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <AdminSidebar
          currentPage={currentPage}
          onNavigate={(path) => {
            onNavigate(path)
            setSidebarOpen(false)
          }}
          notificationBadge={notificationBadge}
          onLogout={handleLogout}
        />
      </div>

      <div className="admin-layout-main">
        <AdminHeader
          breadcrumb={breadcrumb}
          onBreadcrumbClick={onNavigate}
          onNavigate={onNavigate}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="admin-content-main">
          {children}
        </div>
      </div>
    </div>
  )
}
