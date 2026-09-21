import { useState, useEffect, useRef } from 'react'
import { Check, Plus, Trash2, GripVertical, AlertTriangle, Search, Star, Eye, EyeOff, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSiteConfig, saveSiteConfig, DEFAULT_CONFIG, type SiteConfig, type BreakingNewsItem, type HomepageSection } from '../../supabase/siteConfig'
import { getCategories, type Category } from '../../supabase/categories'
import { getLatestArticles } from '../../supabase/articles'
import type { Article } from '../../data/articles'


interface HomepagePageProps {
  onNavigate: (path: string) => void
}

const LABEL_OPTIONS: BreakingNewsItem['label'][] = ['Breaking', 'Developing', 'Update']

export default function HomepagePage({ onNavigate }: HomepagePageProps) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG)
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [heroSearch, setHeroSearch] = useState('')
  const [heroArticle, setHeroArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [newTickerText, setNewTickerText] = useState('')
  const [newTickerLabel, setNewTickerLabel] = useState<BreakingNewsItem['label']>('Breaking')
  const [editTickerId, setEditTickerId] = useState<string | null>(null)
  const [editTickerText, setEditTickerText] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const markUnsaved = () => setUnsaved(true)

  useEffect(() => {
    const load = async () => {
      const [cfg, cats, arts] = await Promise.all([getSiteConfig(), getCategories(), getLatestArticles(50)])
      setConfig(cfg)
      setCategories(cats)
      setArticles(arts)
      if (cfg.featuredArticleId) {
        const hero = arts.find((a) => a.id === cfg.featuredArticleId) ?? null
        setHeroArticle(hero)
      }
      setLoading(false)
    }
    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await saveSiteConfig(config)
      setUnsaved(false)
      showToast('Homepage settings saved ✓')
    } catch {
      showToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (patch: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    markUnsaved()
  }

  // Breaking News handlers
  const addTickerItem = () => {
    if (!newTickerText.trim()) return
    const item: BreakingNewsItem = { id: `item-${Date.now()}`, text: newTickerText.trim(), label: newTickerLabel }
    update({ breakingNews: [...config.breakingNews, item] })
    setNewTickerText('')
  }

  const removeTickerItem = (id: string) => {
    update({ breakingNews: config.breakingNews.filter((i) => i.id !== id) })
  }

  const moveTickerItem = (idx: number, dir: -1 | 1) => {
    const next = [...config.breakingNews]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
    update({ breakingNews: next })
  }

  const saveTickerEdit = (id: string) => {
    update({ breakingNews: config.breakingNews.map((i) => i.id === id ? { ...i, text: editTickerText } : i) })
    setEditTickerId(null)
    setEditTickerText('')
  }

  // Section order/visibility
  const getSections = (): HomepageSection[] => {
    const existing = config.homepageSections
    const catSlugs = categories.map((c) => c.slug)
    const merged: HomepageSection[] = []
    for (const slug of catSlugs) {
      const found = existing.find((s) => s.categorySlug === slug)
      merged.push(found ?? { categorySlug: slug, visible: true, order: merged.length + 1 })
    }
    return merged.sort((a, b) => a.order - b.order)
  }

  const toggleSection = (slug: string) => {
    const sections = getSections().map((s) => s.categorySlug === slug ? { ...s, visible: !s.visible } : s)
    update({ homepageSections: sections })
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const sections = getSections()
    const swap = idx + dir
    if (swap < 0 || swap >= sections.length) return
    ;[sections[idx], sections[swap]] = [sections[swap]!, sections[idx]!]
    update({ homepageSections: sections.map((s, i) => ({ ...s, order: i + 1 })) })
  }

  const getCatEmoji = (slug: string) => categories.find((c) => c.slug === slug)?.emoji ?? '📰'
  const getCatName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug

  const filteredArticles = heroSearch.trim().length > 1
    ? articles.filter((a) => a.title.toLowerCase().includes(heroSearch.toLowerCase()) || a.category.toLowerCase().includes(heroSearch.toLowerCase()))
    : []

  const sections = getSections()

  const QuickToggle = ({ label, value, field }: { label: string; value: boolean; field: keyof SiteConfig }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
      <span className="admin-text-sm" style={{ fontWeight: 500 }}>{label}</span>
      <div
        role="switch"
        aria-checked={value}
        onClick={() => update({ [field]: !value } as Partial<SiteConfig>)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
          background: value ? '#10B981' : 'var(--color-text-muted)', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', display: 'block',
        }} />
      </div>
    </div>
  )

  return (
    <AdminLayout currentPage="homepage" onNavigate={onNavigate}>
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title">Homepage Builder</h1>
          <p className="admin-page-subtitle">
            Control your front page layout — changes go live immediately after saving.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unsaved && (
            <span style={{ fontSize: 12, color: '#F2A900', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F2A900', display: 'inline-block' }} />
              Unsaved changes
            </span>
          )}
          <button className="btn-admin-primary" onClick={save} disabled={saving || !unsaved}>
            <Check size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12 }}>Loading…</p>
        </div>
      ) : (
        <div className="homepage-builder-grid">
          {/* LEFT COLUMN */}
          <div className="homepage-builder-left">

            {/* Hero Story */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={16} style={{ color: '#F2A900' }} /> Hero / Featured Story
                </h2>
              </div>
              <div className="admin-card-body">
                {heroArticle ? (
                  <div className="hero-preview-card">
                    {heroArticle.image && <img src={heroArticle.image} alt="" className="hero-preview-img" />}
                    <div className="hero-preview-info">
                      <span className="kicker" style={{ marginBottom: 4 }}>{heroArticle.category}</span>
                      <div className="hero-preview-title">{heroArticle.title}</div>
                      <div className="hero-preview-meta">{heroArticle.author} · {heroArticle.readTime} min read</div>
                    </div>
                    <button className="btn-icon btn-icon--danger" title="Unpin" onClick={() => { setHeroArticle(null); update({ featuredArticleId: null }) }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 12, padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>
                    No article pinned as hero. The most recent featured article will be used.
                  </div>
                )}
                <div className="homepage-search-box">
                  <Search size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <input
                    className="homepage-search-input"
                    placeholder="Search published articles to pin as hero…"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                  />
                </div>
                {filteredArticles.length > 0 && (
                  <div className="hero-search-results">
                    {filteredArticles.slice(0, 6).map((a) => (
                      <button
                        key={a.id}
                        className="hero-search-item"
                        onClick={() => {
                          setHeroArticle(a)
                          update({ featuredArticleId: a.id })
                          setHeroSearch('')
                        }}
                      >
                        {a.image && <img src={a.image} alt="" className="hero-search-thumb" />}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.category}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section Order */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GripVertical size={16} /> Section Order & Visibility
                </h2>
                <span className="admin-text-sm admin-text-muted">Toggle and reorder homepage sections</span>
              </div>
              <div className="cat-list">
                {sections.map((section, idx) => (
                  <div key={section.categorySlug} className="cat-row">
                    <div className="cat-order-btns">
                      <button className="cat-order-btn" onClick={() => moveSection(idx, -1)} disabled={idx === 0}><ChevronUp size={12} /></button>
                      <button className="cat-order-btn" onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}><ChevronDown size={12} /></button>
                    </div>
                    <div className="cat-identity">
                      <span className="cat-emoji" style={{ fontSize: 20 }}>{getCatEmoji(section.categorySlug)}</span>
                      <span className="cat-name">{getCatName(section.categorySlug)}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className={`cat-visible-badge ${section.visible ? 'visible' : 'hidden'}`}
                        onClick={() => toggleSection(section.categorySlug)}
                      >
                        {section.visible ? <><Eye size={12} /> Visible</> : <><EyeOff size={12} /> Hidden</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="homepage-builder-right">

            {/* Breaking News Ticker */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E32626', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Breaking News Ticker
                </h2>
              </div>
              <div className="admin-card-body">
                <div className="ticker-items-list">
                  {config.breakingNews.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No ticker items. Add one below.
                    </div>
                  )}
                  {config.breakingNews.map((item, idx) => (
                    <div key={item.id} className="ticker-item-row">
                      <div className="cat-order-btns">
                        <button className="cat-order-btn" onClick={() => moveTickerItem(idx, -1)} disabled={idx === 0}><ChevronUp size={11} /></button>
                        <button className="cat-order-btn" onClick={() => moveTickerItem(idx, 1)} disabled={idx === config.breakingNews.length - 1}><ChevronDown size={11} /></button>
                      </div>
                      <span className={`ticker-label-badge ticker-label--${(item.label ?? 'Breaking').toLowerCase()}`}>{item.label ?? 'Breaking'}</span>
                      {editTickerId === item.id ? (
                        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                          <input className="admin-input" style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} value={editTickerText} onChange={(e) => setEditTickerText(e.target.value)} autoFocus />
                          <button className="btn-admin-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => saveTickerEdit(item.id)}><Check size={12} /></button>
                          <button className="btn-admin-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setEditTickerId(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <span className="ticker-item-text" onDoubleClick={() => { setEditTickerId(item.id); setEditTickerText(item.text) }}>{item.text}</span>
                      )}
                      <button className="btn-icon btn-icon--danger" onClick={() => removeTickerItem(item.id)} title="Remove"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>

                {/* Add new ticker item */}
                <div className="ticker-add-row">
                  <select
                    className="admin-select"
                    style={{ width: 110, fontSize: 12, padding: '6px 8px' }}
                    value={newTickerLabel}
                    onChange={(e) => setNewTickerLabel(e.target.value as BreakingNewsItem['label'])}
                  >
                    {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    className="admin-input"
                    style={{ flex: 1, fontSize: 13 }}
                    placeholder="Add a ticker headline…"
                    value={newTickerText}
                    onChange={(e) => setNewTickerText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTickerItem()}
                  />
                  <button className="btn-admin-primary" style={{ padding: '0 14px', height: 38 }} onClick={addTickerItem} disabled={!newTickerText.trim()}>
                    <Plus size={15} />
                  </button>
                </div>
                <p className="admin-text-sm admin-text-muted" style={{ marginTop: 8 }}>Double-click any item to edit inline</p>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">⚡ Quick Settings</h2>
              </div>
              <div className="admin-card-body">
                <QuickToggle label="Show Editor's Pick section" value={config.showEditorsPick} field="showEditorsPick" />
                <QuickToggle label="Show Newsletter CTA" value={config.showNewsletter} field="showNewsletter" />
                <QuickToggle label="Show Opinion section" value={config.showOpinion} field="showOpinion" />
                <QuickToggle label="Show Top Stories sidebar" value={config.showTopStories} field="showTopStories" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
                  <span className="admin-text-sm" style={{ fontWeight: 500 }}>Articles per section</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="cat-order-btn" onClick={() => update({ articlesPerSection: Math.max(2, config.articlesPerSection - 1) })}>−</button>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{config.articlesPerSection}</span>
                    <button className="cat-order-btn" onClick={() => update({ articlesPerSection: Math.min(8, config.articlesPerSection + 1) })}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}


