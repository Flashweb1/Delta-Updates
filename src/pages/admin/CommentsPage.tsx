import { useState, useEffect } from 'react'
import { Check, X, Trash2, Flag, MessageSquare, Sparkles, Loader2 } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { moderateComment, isAIEnabled, type ModerationResult } from '../../utils/ai'
import { subscribeToComments, updateCommentStatus, updateCommentAiVerdict, deleteComment, type AdminCommentRow } from '../../supabase/comments'
import { logger } from '../../utils/logger'

interface CommentsPageProps {
  onNavigate: (path: string) => void
}

type Comment = AdminCommentRow

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function CommentsPage({ onNavigate }: CommentsPageProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set())
  const [bulkAiLoading, setBulkAiLoading] = useState(false)
  const aiEnabled = isAIEnabled()

  useEffect(() => {
    const unsub = subscribeToComments((list) => {
      setComments(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filteredComments = statusFilter === 'all'
    ? comments
    : comments.filter((c) => c.status === statusFilter)

  const pendingCount = comments.filter((c) => c.status === 'pending').length

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredComments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredComments.map((c) => c.id)))
    }
  }

  const approve = async (id: string) => {
    try {
      await updateCommentStatus(id, 'approved')
    } catch (err) {
      logger.error('[CommentsPage] Approve failed', err)
    }
  }

  const reject = async (id: string) => {
    try {
      await updateCommentStatus(id, 'rejected')
    } catch (err) {
      logger.error('[CommentsPage] Reject failed', err)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteComment(id)
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    } catch (err) {
      logger.error('[CommentsPage] Delete failed', err)
    }
  }

  const bulkApprove = async () => {
    const promises = Array.from(selectedIds).map((id) =>
      updateCommentStatus(id, 'approved')
    )
    await Promise.allSettled(promises)
    setSelectedIds(new Set())
  }

  const bulkReject = async () => {
    const promises = Array.from(selectedIds).map((id) =>
      updateCommentStatus(id, 'rejected')
    )
    await Promise.allSettled(promises)
    setSelectedIds(new Set())
  }

  const bulkDelete = async () => {
    const promises = Array.from(selectedIds).map((id) =>
      deleteComment(id)
    )
    await Promise.allSettled(promises)
    setSelectedIds(new Set())
  }

  const runAIModerate = async (id: string) => {
    const comment = comments.find(c => c.id === id)
    if (!comment) return
    setAiLoadingIds(prev => new Set(prev).add(id))
    try {
      const result = await moderateComment(comment.body, comment.articleTitle)
      await Promise.all([
        updateCommentAiVerdict(id, result),
        updateCommentStatus(id, result.verdict === 'approve' ? 'approved' : result.verdict === 'reject' ? 'rejected' : comment.status),
      ])
    } catch {
      // manual moderation still available
    } finally {
      setAiLoadingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const runBulkAIModerate = async () => {
    const pending = comments.filter(c => c.status === 'pending')
    if (!pending.length) return
    setBulkAiLoading(true)
    for (const comment of pending) {
      try {
        const result = await moderateComment(comment.body, comment.articleTitle)
        const newStatus = result.verdict === 'approve' ? 'approved' : result.verdict === 'reject' ? 'rejected' : comment.status
        await Promise.all([
          updateCommentAiVerdict(comment.id, result),
          updateCommentStatus(comment.id, newStatus),
        ])
      } catch { /* continue */ }
    }
    setBulkAiLoading(false)
  }

  const toxicityColor = (t: ModerationResult['toxicity']) => ({
    none: 'var(--admin-success)',
    low: 'var(--admin-warning)',
    medium: '#f97316',
    high: 'var(--admin-error)',
  }[t])

  const statusBadge = (status: Comment['status']) => {
    const statusStyles: Record<Comment['status'], { bg: string; color: string }> = {
      pending: { bg: 'var(--admin-warning-soft)', color: 'var(--admin-warning)' },
      approved: { bg: 'var(--admin-success-soft)', color: 'var(--admin-success)' },
      rejected: { bg: 'var(--admin-error-soft)', color: 'var(--admin-error)' },
    }
    const s = statusStyles[status]
    return (
      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '100px', fontSize: '0.6875rem', fontWeight: 600, background: s.bg, color: s.color }}>
        {status}
      </span>
    )
  }

  return (
    <AdminLayout currentPage="comments" onNavigate={onNavigate}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Comments</h1>
          <p className="admin-page-subtitle">
            {comments.length} total · {pendingCount} pending review
          </p>
        </div>
        {aiEnabled && pendingCount > 0 && (
          <button
            className="btn-admin-primary"
            onClick={runBulkAIModerate}
            disabled={bulkAiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {bulkAiLoading
              ? <Loader2 size={15} className="ai-spin" />
              : <Sparkles size={15} />}
            {bulkAiLoading ? 'Moderating…' : `AI Moderate All (${pendingCount})`}
          </button>
        )}
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon warning">
            <Flag size={20} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-value">{pendingCount}</span>
            <div className="admin-stat-label">Pending Review</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Check size={20} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-value">{comments.filter((c) => c.status === 'approved').length}</span>
            <div className="admin-stat-label">Approved</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon info">
            <MessageSquare size={20} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-value">{comments.length}</span>
            <div className="admin-stat-label">Total Comments</div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-filters">
          <div className="admin-filter-group">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                className={`admin-filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span style={{ marginLeft: '0.375rem', opacity: 0.7 }}>
                    ({status === 'pending' ? pendingCount : comments.filter((c) => c.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--admin-accent)', fontWeight: 500 }}>
                {selectedIds.size} selected
              </span>
              <button className="btn-admin-ghost" onClick={bulkApprove}><Check size={14} /> Approve</button>
              <button className="btn-admin-ghost" onClick={bulkReject}><X size={14} /> Reject</button>
              <button className="btn-admin-danger" onClick={bulkDelete}><Trash2 size={14} /> Delete</button>
              <button className="btn-admin-ghost" onClick={() => setSelectedIds(new Set())}>Clear</button>
            </div>
          )}
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading comments...
            </div>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="admin-table-checkbox"
                    checked={selectedIds.size === filteredComments.length && filteredComments.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Comment</th>
                <th>Article</th>
                <th>Author</th>
                <th>Status</th>
                {aiEnabled && <th>AI Verdict</th>}
                <th>Date</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={aiEnabled ? 8 : 7} className="admin-table-empty">
                    No {statusFilter !== 'all' ? statusFilter : ''} comments found.
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="admin-table-checkbox"
                        checked={selectedIds.has(comment.id)}
                        onChange={() => toggleSelect(comment.id)}
                      />
                    </td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>{comment.body}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '200px', fontSize: '0.8125rem' }}>
                        <div className="admin-truncate" title={comment.articleTitle}>
                          {comment.articleTitle}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        <div>{comment.author}</div>
                        <div className="admin-text-faded">{comment.authorEmail}</div>
                      </div>
                    </td>
                    <td>{statusBadge(comment.status)}</td>
                    {aiEnabled && (
                      <td>
                        {comment.aiVerdict ? (
                          <div style={{ fontSize: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: toxicityColor(comment.aiVerdict.toxicity), textTransform: 'capitalize' }}>
                              {comment.aiVerdict.verdict}
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 2, maxWidth: 160 }}>
                              {comment.aiVerdict.reason}
                            </div>
                          </div>
                        ) : comment.status === 'pending' ? (
                          <button
                            className="btn-admin-ghost"
                            style={{ fontSize: '0.75rem', gap: '0.25rem' }}
                            onClick={() => runAIModerate(comment.id)}
                            disabled={aiLoadingIds.has(comment.id)}
                            title="Run AI moderation"
                          >
                            {aiLoadingIds.has(comment.id)
                              ? <Loader2 size={12} className="ai-spin" />
                              : <Sparkles size={12} />}
                            Analyse
                          </button>
                        ) : <span className="admin-text-faded">—</span>}
                      </td>
                    )}
                    <td className="admin-text-sm admin-text-muted">{comment.createdAt}</td>
                    <td>
                      <div className="admin-table-actions">
                        {comment.status === 'pending' && (
                          <>
                            <button
                              className="btn-admin-icon"
                              style={{ color: 'var(--admin-success)' }}
                              onClick={() => approve(comment.id)}
                              title="Approve"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="btn-admin-icon"
                              style={{ color: 'var(--admin-error)' }}
                              onClick={() => reject(comment.id)}
                              title="Reject"
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn-admin-danger"
                          onClick={() => remove(comment.id)}
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
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
