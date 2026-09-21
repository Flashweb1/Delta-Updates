import { useState, useEffect, useRef } from 'react'
import { Plus, Edit3, Trash2, GripVertical, Check, X, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  seedCategoriesIfEmpty,
  type Category,
} from '../../supabase/categories'
import { getAllArticlesAdmin } from '../../supabase/articles'
import { normalizeSlug } from '../../utils/security'

interface CategoriesPageProps {
  onNavigate: (path: string) => void
}

const PRESET_COLORS = ['#E32626', '#F2A900', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6']
const PRESET_EMOJIS = ['📰', '🏛️', '💼', '💻', '⚽', '❤️', '📚', '🌍', '🎬', '✝️', '🎵', '🔬', '🌿', '💡', '🏙️', '🌐']

interface EditState {
  name: string
  slug: string
  emoji: string
  color: string
  description: string
  visible: boolean
}

function emptyEdit(): EditState {
  return { name: '', slug: '', emoji: '📰', color: '#E32626', description: '', visible: true }
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 44, height: 44, fontSize: 22, borderRadius: 8,
          border: '1px solid var(--color-border-light)',
          background: 'var(--color-bg-surface)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {value}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 50, left: 0, zIndex: 200,
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
          borderRadius: 10, padding: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
        }}>
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e} type="button"
              onClick={() => { onChange(e); setOpen(false) }}
              style={{
                width: 36, height: 36, fontSize: 20, border: 'none',
                borderRadius: 6, cursor: 'pointer',
                background: value === e ? 'var(--color-bg-surface)' : 'transparent',
              }}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>(emptyEdit())
  const [showCreate, setShowCreate] = useState(false)
  const [createState, setCreateState] = useState<EditState>(emptyEdit())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const load = async () => {
      await seedCategoriesIfEmpty()
      const [cats, articles] = await Promise.all([getCategories(), getAllArticlesAdmin()])
      setCategories(cats)
      const counts: Record<string, number> = {}
      for (const a of articles) {
        const slug = a.category.toLowerCase()
        counts[slug] = (counts[slug] ?? 0) + 1
      }
      setArticleCounts(counts)
      setLoading(false)
    }
    void load()
  }, [])

  const moveRow = async (idx: number, dir: -1 | 1) => {
    const next = [...categories]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
    setCategories(next)
    await reorderCategories(next.map((c) => c.id))
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditState({ name: cat.name, slug: cat.slug, emoji: cat.emoji, color: cat.color, description: cat.description, visible: cat.visible })
  }

  const cancelEdit = () => { setEditingId(null); setEditState(emptyEdit()) }

  const saveEdit = async () => {
    if (!editingId || !editState.name.trim()) return
    setSaving(true)
    try {
      await updateCategory(editingId, { ...editState, slug: normalizeSlug(editState.slug || editState.name) })
      setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, ...editState } : c))
      setEditingId(null)
      showToast('Category updated ✓')
    } catch {
      showToast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const handleCreate = async () => {
    if (!createState.name.trim()) return
    setSaving(true)
    try {
      const slug = normalizeSlug(createState.slug || createState.name)
      const maxOrder = Math.max(0, ...categories.map((c) => c.order))
      const cat = await addCategory({ ...createState, slug, order: maxOrder + 1 })
      setCategories((prev) => [...prev, cat])
      setShowCreate(false)
      setCreateState(emptyEdit())
      showToast('Category created ✓')
    } catch {
      showToast('Failed to create', 'error')
    } finally { setSaving(false) }
  }

  const confirmDelete = async (id: string) => {
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      showToast('Category deleted')
    } catch {
      showToast('Failed to delete', 'error')
    } finally { setDeletingId(null) }
  }

  const FormRow = ({ state, onChange, onSave, onCancel, isCreating = false }: {
    state: EditState
    onChange: (s: EditState) => void
    onSave: () => void
    onCancel: () => void
    isCreating?: boolean
  }) => (
    <div className="cat-form-panel">
      <div className="cat-form-grid">
        <div className="admin-form-group">
          <label className="admin-label">Name *</label>
          <input
            className="admin-input"
            value={state.name}
            onChange={(e) => onChange({ ...state, name: e.target.value, slug: isCreating ? normalizeSlug(e.target.value) : state.slug })}
            placeholder="e.g. Politics"
            autoFocus
          />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Slug</label>
          <input
            className="admin-input"
            value={state.slug}
            onChange={(e) => onChange({ ...state, slug: normalizeSlug(e.target.value) })}
            placeholder="auto-generated"
          />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Icon</label>
          <EmojiPicker value={state.emoji} onChange={(e) => onChange({ ...state, emoji: e })} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c} type="button"
                onClick={() => onChange({ ...state, color: c })}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                  cursor: 'pointer', outline: state.color === c ? `3px solid ${c}` : 'none',
                  outlineOffset: 2, transform: state.color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="admin-form-group" style={{ marginTop: 12 }}>
        <label className="admin-label">Description</label>
        <input
          className="admin-input"
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          placeholder="Short description (optional)"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <div
            role="switch"
            aria-checked={state.visible}
            onClick={() => onChange({ ...state, visible: !state.visible })}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: state.visible ? '#10B981' : 'var(--color-text-muted)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: state.visible ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', display: 'block',
            }} />
          </div>
          Visible on nav and homepage
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-admin-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn-admin-primary" onClick={onSave} disabled={saving || !state.name.trim()}>
            <Check size={14} /> {saving ? 'Saving…' : isCreating ? 'Create Category' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <AdminLayout currentPage="categories" onNavigate={onNavigate}>
      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="admin-page-title">Categories</h1>
          <p className="admin-page-subtitle">Manage your content taxonomy — changes reflect on the live site immediately.</p>
        </div>
        <button className="btn-admin-primary" onClick={() => { setShowCreate(true); setEditingId(null) }} disabled={showCreate}>
          <Plus size={16} /> New Category
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="admin-card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-red-brand)', borderWidth: 1 }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Create New Category
            </h2>
          </div>
          <div className="admin-card-body">
            <FormRow
              state={createState}
              onChange={setCreateState}
              onSave={handleCreate}
              onCancel={() => { setShowCreate(false); setCreateState(emptyEdit()) }}
              isCreating
            />
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">All Categories</h2>
          <span className="admin-text-sm admin-text-muted">
            Drag ↕ to reorder · changes appear on the nav bar immediately
          </span>
        </div>

        {loading ? (
          <div className="admin-card-body">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="cat-row-skeleton" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="admin-card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📂</p>
            <p>No categories yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="cat-list">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="cat-row-wrapper">
                {/* Main row */}
                {editingId !== cat.id && (
                  <div className={`cat-row ${deletingId === cat.id ? 'cat-row--danger' : ''}`}>
                    {/* Order arrows */}
                    <div className="cat-order-btns">
                      <button className="cat-order-btn" onClick={() => moveRow(idx, -1)} disabled={idx === 0} title="Move up">
                        <ChevronUp size={12} />
                      </button>
                      <button className="cat-order-btn" onClick={() => moveRow(idx, 1)} disabled={idx === categories.length - 1} title="Move down">
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Emoji + Name */}
                    <div className="cat-identity">
                      <span className="cat-emoji" style={{ background: cat.color + '18' }}>{cat.emoji}</span>
                      <div>
                        <div className="cat-name">{cat.name}</div>
                        <div className="cat-slug">/{cat.slug}</div>
                      </div>
                    </div>

                    {/* Article count */}
                    <div className="cat-count">
                      <span className="cat-count-badge">
                        {articleCounts[cat.slug] ?? 0} article{(articleCounts[cat.slug] ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Color dot */}
                    <div className="cat-color-dot" style={{ background: cat.color }} title={cat.color} />

                    {/* Visibility */}
                    <div
                      className={`cat-visible-badge ${cat.visible ? 'visible' : 'hidden'}`}
                      onClick={async () => {
                        await updateCategory(cat.id, { visible: !cat.visible })
                        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, visible: !c.visible } : c))
                      }}
                      title={cat.visible ? 'Click to hide' : 'Click to show'}
                    >
                      {cat.visible ? '● Visible' : '○ Hidden'}
                    </div>

                    {/* Actions */}
                    {deletingId === cat.id ? (
                      <div className="cat-delete-confirm">
                        <AlertTriangle size={14} style={{ color: 'var(--color-status-error)' }} />
                        <span>Delete "{cat.name}"?</span>
                        {(articleCounts[cat.slug] ?? 0) > 0 && (
                          <span style={{ color: 'var(--color-status-error)', fontSize: 11 }}>
                            {articleCounts[cat.slug]} articles will be uncategorized
                          </span>
                        )}
                        <button className="btn-admin-danger-sm" onClick={() => confirmDelete(cat.id)}>Delete</button>
                        <button className="btn-admin-ghost-sm" onClick={() => setDeletingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="cat-actions">
                        <button className="btn-icon" title="Edit" onClick={() => startEdit(cat)}>
                          <Edit3 size={15} />
                        </button>
                        <button className="btn-icon btn-icon--danger" title="Delete" onClick={() => setDeletingId(cat.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline edit form */}
                {editingId === cat.id && (
                  <div className="cat-edit-expanded">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>{editState.emoji}</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>Editing: {cat.name}</span>
                    </div>
                    <FormRow
                      state={editState}
                      onChange={setEditState}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
