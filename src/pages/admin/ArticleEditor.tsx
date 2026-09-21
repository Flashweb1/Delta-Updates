import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Eye, Send, Sparkles, Tag, FileText, Wand2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { generateDek, suggestTags, generateSEODescription, improveText, isAIEnabled } from '../../utils/ai'
import type { Article } from '../../data/articles'
import { categories } from '../../data/articles'
import { addArticle, updateArticle, getArticleById, generateUniqueSlug } from '../../supabase/articles'
import { uploadImageFile } from '../../supabase/storage'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  generateReadTime,
  isValidCategory,
  isValidExternalUrl,
  isValidTags,
  normalizeSlug,
  sanitizePlainText,
} from '../../utils/security'
import { logger } from '../../utils/logger'

interface ArticleEditorProps {
  onNavigate: (path: string) => void
  articleId?: string
}

type Status = 'draft' | 'review' | 'published'

export default function ArticleEditor({ onNavigate, articleId }: ArticleEditorProps) {
  const { user, isApproved } = useAuth()
  const navigate = useNavigate()

  const [existingArticle, setExistingArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState<string>('')
  const [dek, setDek] = useState<string>('')
  const [category, setCategory] = useState<string>('Politics')
  const [body, setBody] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [image, setImage] = useState<string>('')
  const [fileUploading, setFileUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [readTime, setReadTime] = useState<number>(3)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // AI state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null) // which task is running
  const [aiError, setAiError] = useState<string | null>(null)
  const [seoDesc, setSeoDesc] = useState('')
  const [improveTarget, setImproveTarget] = useState<'dek' | 'body' | null>(null)
  const aiEnabled = isAIEnabled()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user) {
      void navigate('/admin/login', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!articleId || !user) return
    let cancelled = false
    void (async () => {
      try {
        const found = await getArticleById(articleId)
        if (cancelled || !found) return
        setExistingArticle(found)
        setTitle(found.title)
        setDek(found.dek)
        if (isValidCategory(found.category)) setCategory(found.category)
        setBody(Array.isArray(found.body) ? found.body.join('\n\n') : String(found.body ?? ''))
        setTags(Array.isArray(found.tags) ? found.tags.join(', ') : '')
        setImage(found.image ?? '')
        setReadTime(Number(found.readTime) || 3)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error('[editor] Error loading article', msg)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [articleId, user])

  if (!user) return null

  const validate = (): null | {
    title: string
    dek: string
    category: string
    body: string[]
    tags: string[]
    image: string
    readTime: number
    slug: string
    author: string
    authorRole: string
    publishedAt: string
  } => {
    const cleanTitle = sanitizePlainText(title, 240).trim()
    const cleanDek = sanitizePlainText(dek, 600).trim()
    const cleanCategory = isValidCategory(category) ? category : 'News'
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p: string) => sanitizePlainText(p, 4000).trim())
      .filter(Boolean)

    const tagArr = tags
      .split(',')
      .map((t: string) => sanitizePlainText(t.trim(), 40))
      .filter((t): t is string => Boolean(t))
      .slice(0, 10)

    const safeImage = image ? (isValidExternalUrl(image) ? image : '') : ''
    const slug = existingArticle?.slug
      ? existingArticle.slug
      : normalizeSlug(cleanTitle || 'article') || `article-${Date.now()}`

    if (!cleanTitle || !cleanDek || paragraphs.length === 0 || !isValidTags(tagArr)) {
      setError('Please fill in headline, dek, body, and up to 10 tags (max 32 chars).')
      return null
    }

    const author = user?.displayName?.trim() || 'Editorial Staff'
    const authorRole = 'Staff Writer'
    const publishedAt =
      existingArticle?.publishedAt ||
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

    const autoRt = Number(readTime) || generateReadTime(paragraphs)

    setError(null)
    return {
      title: cleanTitle,
      dek: cleanDek,
      category: cleanCategory,
      body: paragraphs,
      tags: tagArr,
      image: safeImage,
      readTime: autoRt,
      slug,
      author,
      authorRole,
      publishedAt,
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadImageFile(file, (p) => setUploadProgress(p))
      setImage(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(`Image upload failed: ${msg}`)
    } finally {
      setFileUploading(false)
      setUploadProgress(0)
    }
  }

  const runAI = async (task: string, fn: () => Promise<void>) => {
    setAiLoading(task)
    setAiError(null)
    try {
      await fn()
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI request failed.')
    } finally {
      setAiLoading(null)
    }
  }

  const handleAIDek = () =>
    runAI('dek', async () => {
      if (!title.trim() && !body.trim()) { setAiError('Add a headline or body first.'); return }
      const result = await generateDek(title, body)
      if (result) setDek(result)
    })

  const handleAITags = () =>
    runAI('tags', async () => {
      if (!title.trim() && !body.trim()) { setAiError('Add a headline or body first.'); return }
      const result = await suggestTags(title, body, category)
      if (result.length) setTags(result.join(', '))
    })

  const handleAISEO = () =>
    runAI('seo', async () => {
      if (!title.trim() && !body.trim()) { setAiError('Add a headline or body first.'); return }
      const result = await generateSEODescription(title, body)
      if (result) setSeoDesc(result)
    })

  const handleAIImprove = (target: 'dek' | 'body') =>
    runAI(`improve-${target}`, async () => {
      const text = target === 'dek' ? dek : body
      if (!text.trim()) { setAiError(`Add ${target === 'dek' ? 'a subtitle' : 'body text'} first.`); return }
      setImproveTarget(target)
      const result = await improveText(text.slice(0, 2000))
      if (result) {
        if (target === 'dek') setDek(result)
        else setBody(result)
      }
      setImproveTarget(null)
    })

  const handleSave = async (status: Status) => {
    const valid = validate()
    if (!valid) return
    setLoading(true)
    try {
      const finalSlug = await generateUniqueSlug(valid.slug, existingArticle?.id)
      const base = {
        title: valid.title,
        dek: valid.dek,
        category: valid.category,
        body: valid.body,
        tags: valid.tags,
        image: valid.image,
        readTime: valid.readTime,
        status,
      }

      let result: Article | null = null

      if (articleId && existingArticle) {
        result = await updateArticle(articleId, {
          ...existingArticle,
          ...base,
          slug: finalSlug,
          author: valid.author,
          authorRole: valid.authorRole,
          publishedAt: valid.publishedAt,
        })
      } else {
        const payload: Omit<Article, 'id'> = {
          ...base,
          slug: finalSlug,
          author: valid.author,
          authorRole: valid.authorRole,
          publishedAt: valid.publishedAt,
          featured: false,
          status,
        }
        result = await addArticle(payload)
      }

      if (result) {
        void navigate('/admin')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Error saving article: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const previewParagraphs = body
    .split(/\n\s*\n/)
    .map((p) => sanitizePlainText(p, 4000).trim())
    .filter(Boolean)

  return (
    <main className="admin-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={() => onNavigate('/admin')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <div className="editor-actions">
          <button className="btn-secondary" onClick={() => setShowPreview((s) => !s)}>
            <Eye size={16} /> {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button className="btn-secondary" onClick={() => handleSave('draft')} disabled={loading || fileUploading}>
            <Save size={16} /> Save Draft
          </button>
          {isApproved ? (
            <button className="btn-primary" onClick={() => handleSave('published')} disabled={loading || fileUploading}>
              <Send size={16} /> Post
            </button>
          ) : (
            <button className="btn-primary" onClick={() => handleSave('review')} disabled={loading || fileUploading}>
              <Send size={16} /> Submit for Review
            </button>
          )}
        </div>
      </div>

      {showPreview ? (
        <div className="editor-preview">
          <div className="preview-card">
            {image && <img src={image} alt={title} className="preview-image" />}
            <span className="kicker">{category}</span>
            <h1>{sanitizePlainText(title, 240) || 'Untitled Article'}</h1>
            <p className="preview-dek">{sanitizePlainText(dek, 600)}</p>
            <div className="preview-body">
              {previewParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-form">
          {error && <div className="error-banner" role="alert">{error}</div>}

          {/* ── AI Writing Assistant Panel ── */}
          <div className="ai-panel">
            <button
              type="button"
              className="ai-panel-toggle"
              onClick={() => setAiOpen(o => !o)}
            >
              <Sparkles size={15} />
              <span>AI Writing Assistant</span>
              {!aiEnabled && <span className="ai-badge-off">Configure API key</span>}
              {aiEnabled && <span className="ai-badge-on">Active</span>}
              {aiOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {aiOpen && (
              <div className="ai-panel-body">
                {aiError && (
                  <div className="ai-error" role="alert">⚠ {aiError}</div>
                )}

                <div className="ai-actions">
                  {/* Generate Dek */}
                  <div className="ai-action-card">
                    <div className="ai-action-header">
                      <FileText size={14} />
                      <span>Auto-generate Subtitle</span>
                    </div>
                    <p className="ai-action-desc">Creates a compelling dek from your headline and body.</p>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={handleAIDek}
                      disabled={!aiEnabled || aiLoading !== null}
                    >
                      {aiLoading === 'dek' ? <Loader2 size={13} className="ai-spin" /> : <Sparkles size={13} />}
                      Generate Dek
                    </button>
                  </div>

                  {/* Suggest Tags */}
                  <div className="ai-action-card">
                    <div className="ai-action-header">
                      <Tag size={14} />
                      <span>Suggest Tags</span>
                    </div>
                    <p className="ai-action-desc">Generates 5–8 relevant tags from your article content.</p>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={handleAITags}
                      disabled={!aiEnabled || aiLoading !== null}
                    >
                      {aiLoading === 'tags' ? <Loader2 size={13} className="ai-spin" /> : <Tag size={13} />}
                      Suggest Tags
                    </button>
                  </div>

                  {/* SEO Description */}
                  <div className="ai-action-card">
                    <div className="ai-action-header">
                      <Wand2 size={14} />
                      <span>SEO Meta Description</span>
                    </div>
                    <p className="ai-action-desc">Generates a Google-optimised meta description (≤155 chars).</p>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={handleAISEO}
                      disabled={!aiEnabled || aiLoading !== null}
                    >
                      {aiLoading === 'seo' ? <Loader2 size={13} className="ai-spin" /> : <Wand2 size={13} />}
                      Generate SEO
                    </button>
                    {seoDesc && (
                      <div className="ai-result">
                        <p className="ai-result-text">{seoDesc}</p>
                        <span className={`ai-char-count ${seoDesc.length > 155 ? 'over' : ''}`}>
                          {seoDesc.length}/155
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Improve Dek */}
                  <div className="ai-action-card">
                    <div className="ai-action-header">
                      <Wand2 size={14} />
                      <span>Polish Subtitle</span>
                    </div>
                    <p className="ai-action-desc">Rewrites your subtitle for clarity and impact.</p>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={() => handleAIImprove('dek')}
                      disabled={!aiEnabled || aiLoading !== null || !dek.trim()}
                    >
                      {aiLoading === 'improve-dek' ? <Loader2 size={13} className="ai-spin" /> : <Wand2 size={13} />}
                      Polish Dek
                    </button>
                  </div>

                  {/* Improve Body */}
                  <div className="ai-action-card">
                    <div className="ai-action-header">
                      <Wand2 size={14} />
                      <span>Polish Body Text</span>
                    </div>
                    <p className="ai-action-desc">Improves flow and clarity of your article body (first 2000 chars).</p>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={() => handleAIImprove('body')}
                      disabled={!aiEnabled || aiLoading !== null || !body.trim()}
                    >
                      {aiLoading === 'improve-body' ? <Loader2 size={13} className="ai-spin" /> : <Wand2 size={13} />}
                      Polish Body
                    </button>
                  </div>
                </div>

                {!aiEnabled && (
                  <p className="ai-setup-hint">
                    Add <code>VITE_AI_API_KEY</code> to your <code>.env</code> file to enable AI features.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title">Headline</label>
            <input
              id="title"
              type="text"
              placeholder="Enter article headline..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="editor-title-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dek">Subtitle / Dek</label>
            <textarea
              id="dek"
              placeholder="Brief summary of the article..."
              value={dek}
              onChange={(e) => setDek(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="readTime">Read Time (min)</label>
              <input
                id="readTime"
                type="number"
                min={1}
                max={60}
                value={readTime}
                onChange={(e) => setReadTime(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="image">Cover Image</label>
            <input
              id="image"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
            <div className="image-upload-row">
              <input id="imageFile" type="file" accept="image/*" onChange={handleFileChange} />
              {fileUploading && (
                <div className="upload-progress">Uploading {uploadProgress}%</div>
              )}
            </div>
            {image && isValidExternalUrl(image) && (
              <img src={image} alt="Preview" className="image-preview" />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input
              id="tags"
              type="text"
              placeholder="Politics, Delta State, Governance"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Article Body</label>
            <textarea
              id="body"
              placeholder="Write your article here. Separate paragraphs with blank lines..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="editor-body"
            />
          </div>
        </div>
      )}
    </main>
  )
}
