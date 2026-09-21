import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react'
import type { Article } from '../../data/articles'
import { getAllArticlesAdmin, deleteArticle, updateArticle } from '../../supabase/articles'
import AdminLayout from '../../components/admin/AdminLayout'
import { logger } from '../../utils/logger'

interface ArticlesPageProps {
  onNavigate: (path: string) => void
}

type SortField = 'title' | 'category' | 'status' | 'author' | 'publishedAt'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'published' | 'draft' | 'review' | 'archived'

const ITEMS_PER_PAGE = 10

export default function ArticlesPage({ onNavigate }: ArticlesPageProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('publishedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllArticlesAdmin()
        setArticles(data)
      } catch (err) {
        logger.error('Error loading articles', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filteredArticles = useMemo(() => {
    let result = [...articles]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter)
    }

    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'category':
          aVal = a.category
          bVal = b.category
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'author':
          aVal = a.author.toLowerCase()
          bVal = b.author.toLowerCase()
          break
        case 'publishedAt': {
          const ad = new Date(a.publishedAt).getTime()
          const bd = new Date(b.publishedAt).getTime()
          aVal = Number.isNaN(ad) ? 0 : ad
          bVal = Number.isNaN(bd) ? 0 : bd
          break
        }
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [articles, search, statusFilter, sortField, sortDirection])

  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE)
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedArticles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedArticles.map((a) => a.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle(id)
      setArticles((prev) => prev.filter((a) => a.id !== id))
      setShowDeleteConfirm(null)
    } catch (err) {
      logger.error('Error deleting article', err)
    }
  }

  const handleBulkDelete = async () => {
    const results = await Promise.allSettled(
      Array.from(selectedIds).map((id) => deleteArticle(id))
    )
    results.forEach((r, i) => {
      if (r.status === 'rejected') logger.error('Bulk delete failed', r.reason)
    })
    setArticles((prev) => prev.filter((a) => !selectedIds.has(a.id)))
    setSelectedIds(new Set())
    setBulkAction('')
  }

  const handleBulkStatusChange = async (status: Article['status']) => {
    const updates = Array.from(selectedIds).map((id) => {
      const article = articles.find((a) => a.id === id)
      if (!article) return Promise.resolve()
      return updateArticle(id, { ...article, status })
    })
    await Promise.allSettled(updates)
    setArticles((prev) =>
      prev.map((a) => (selectedIds.has(a.id) ? { ...a, status } : a))
    )
    setSelectedIds(new Set())
    setBulkAction('')
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="sort-icon" style={{ opacity: 0.3 }} />
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="sort-icon" />
    ) : (
      <ChevronDown size={14} className="sort-icon" />
    )
  }

  return (
    <AdminLayout currentPage="articles" onNavigate={onNavigate}>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="admin-page-title">Articles</h1>
          <p className="admin-page-subtitle">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` (${statusFilter})`}
          </p>
        </div>
        <button className="btn-admin-primary" onClick={() => onNavigate('/admin/editor')}>
          <Plus size={16} /> New Article
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-filters">
          <div className="admin-filter-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="admin-filter-group">
            {(['all', 'published', 'draft', 'review', 'archived'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                className={`admin-filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(status)
                  setCurrentPage(1)
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="admin-bulk-actions">
            <span>{selectedIds.size} selected</span>
            <button className="btn-admin-ghost" onClick={() => handleBulkStatusChange('published')}>
              Publish
            </button>
            <button className="btn-admin-ghost" onClick={() => handleBulkStatusChange('draft')}>
              Set Draft
            </button>
            <button className="btn-admin-ghost" onClick={() => handleBulkStatusChange('archived')}>
              Archive
            </button>
            <button className="btn-admin-danger" onClick={handleBulkDelete}>
              <Trash2 size={14} /> Delete
            </button>
            <button className="btn-admin-ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        )}

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="admin-table-checkbox"
                    checked={selectedIds.size === paginatedArticles.length && paginatedArticles.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className={`sortable ${sortField === 'title' ? 'sorted' : ''}`} onClick={() => handleSort('title')}>
                  Title <SortIcon field="title" />
                </th>
                <th className={`sortable ${sortField === 'category' ? 'sorted' : ''}`} onClick={() => handleSort('category')}>
                  Category <SortIcon field="category" />
                </th>
                <th className={`sortable ${sortField === 'status' ? 'sorted' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
                <th className={`sortable ${sortField === 'author' ? 'sorted' : ''}`} onClick={() => handleSort('author')}>
                  Author <SortIcon field="author" />
                </th>
                <th className={`sortable ${sortField === 'publishedAt' ? 'sorted' : ''}`} onClick={() => handleSort('publishedAt')}>
                  Date <SortIcon field="publishedAt" />
                </th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">Loading articles...</td>
                </tr>
              ) : paginatedArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    {search || statusFilter !== 'all'
                      ? 'No articles match your filters.'
                      : 'No articles yet. Create your first article!'}
                  </td>
                </tr>
              ) : (
                paginatedArticles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="admin-table-checkbox"
                        checked={selectedIds.has(article.id)}
                        onChange={() => toggleSelect(article.id)}
                      />
                    </td>
                    <td>
                      <div className="admin-table-title">
                        <button
                          type="button"
                          className="admin-table-title-link"
                          onClick={() => onNavigate(`/admin/editor/${article.id}`)}
                        >
                          {article.title}
                        </button>
                        {article.featured && (
                          <span className="admin-badge" style={{ marginLeft: '0.5rem', background: 'var(--admin-gold-soft)', color: 'var(--admin-gold)' }}>
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="kicker" style={{ marginBottom: 0 }}>{article.category}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${article.status || 'draft'}`}>
                        {article.status || 'draft'}
                      </span>
                    </td>
                    <td className="admin-text-sm">{article.author}</td>
                    <td className="admin-text-sm admin-text-muted">{article.publishedAt}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          className="btn-admin-icon"
                          onClick={() => onNavigate(`/admin/editor/${article.id}`)}
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn-admin-icon"
                          onClick={() => onNavigate(`/article/${article.slug}`)}
                          title="View"
                        >
                          <ExternalLink size={15} />
                        </button>
                        <button
                          className="btn-admin-danger"
                          onClick={() => setShowDeleteConfirm(article.id)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <div className="admin-pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)} of {filteredArticles.length}
            </div>
            <div className="admin-pagination-controls">
              <button
                className="admin-pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
                return (
                  <button
                    key={page}
                    className={`admin-pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                className="admin-pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Delete Article</h3>
            </div>
            <div className="admin-modal-body">
              <p>Are you sure you want to delete this article? This action cannot be undone.</p>
              <p className="admin-text-sm admin-text-muted" style={{ marginTop: '0.5rem' }}>
                &quot;{articles.find((a) => a.id === showDeleteConfirm)?.title}&quot;
              </p>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-admin-secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn-admin-primary" style={{ background: 'var(--admin-error)' }} onClick={() => handleDelete(showDeleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}


