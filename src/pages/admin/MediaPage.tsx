import { useState, useEffect } from 'react'
import { Upload, Trash2, Copy, Check, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { subscribeToMedia, addMediaItem, deleteMediaItem, type MediaItemRow } from '../../supabase/media'
import { logger } from '../../utils/logger'

interface MediaPageProps {
  onNavigate: (path: string) => void
}

type MediaItem = MediaItemRow

export default function MediaPage({ onNavigate }: MediaPageProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  useEffect(() => {
    const unsub = subscribeToMedia((items) => {
      setMedia(items)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddByUrl = async () => {
    if (!newImageUrl.trim()) return
    try {
      await addMediaItem(newImageUrl)
      setNewImageUrl('')
      setShowUrlInput(false)
    } catch (err) {
      logger.error('[MediaPage] Failed to add image', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMediaItem(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (err) {
      logger.error('[MediaPage] Failed to delete image', err)
    }
  }

  return (
    <AdminLayout currentPage="media" onNavigate={onNavigate}>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="admin-page-title">Media Library</h1>
          <p className="admin-page-subtitle">{media.length} image{media.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-admin-primary" onClick={() => setShowUrlInput(true)}>
          <Upload size={16} /> Add Image
        </button>
      </div>

      {showUrlInput && (
        <div className="admin-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div className="admin-form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="admin-label">Image URL</label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://images.unsplash.com/..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByUrl()}
              />
            </div>
            <button className="btn-admin-primary" onClick={handleAddByUrl}>Add</button>
            <button className="btn-admin-secondary" onClick={() => { setShowUrlInput(false); setNewImageUrl('') }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading media...
          </div>
        ) : (
        <div className="admin-media-grid">
          {media.map((item) => (
            <div
              key={item.id}
              className="admin-media-item"
              onClick={() => setSelectedItem(item)}
            >
              <img src={item.url} alt={item.name} loading="lazy" />
              <div className="admin-media-item-overlay">
                <button
                  className="btn-admin-icon"
                  style={{ background: 'white' }}
                  onClick={(e) => { e.stopPropagation(); handleCopyUrl(item) }}
                  title="Copy URL"
                >
                  {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  className="btn-admin-icon"
                  style={{ background: 'var(--admin-error)', color: 'white' }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          <div
            className="admin-media-item admin-media-upload"
            onClick={() => setShowUrlInput(true)}
          >
            <Upload size={24} />
            <span className="admin-text-sm">Add Image</span>
          </div>
        </div>
        )}
      </div>

      {selectedItem && (
        <div className="admin-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="admin-modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Image Details</h3>
              <button className="btn-admin-icon" onClick={() => setSelectedItem(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="admin-modal-body" style={{ padding: 0 }}>
              <img
                src={selectedItem.url}
                alt={selectedItem.name}
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }}
                loading="lazy"
              />
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{selectedItem.name}</div>
                <div className="admin-text-sm admin-text-muted" style={{ marginBottom: '0.25rem' }}>
                  Uploaded: {selectedItem.uploadedAt}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-admin-secondary"
                    style={{ flex: 1 }}
                    onClick={() => handleCopyUrl(selectedItem)}
                  >
                    {copiedId === selectedItem.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === selectedItem.id ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    className="btn-admin-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
