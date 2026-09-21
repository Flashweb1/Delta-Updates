import { useState, useEffect, useRef } from 'react'
import {
  Globe, Mail, Bell, Shield, Eye, BookOpen, Search, Plus, Trash2, Check, AlertTriangle,
  RefreshCw, Twitter, Instagram, Youtube
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSiteConfig, saveSiteConfig, DEFAULT_CONFIG, type SiteConfig } from '../../supabase/siteConfig'
import { isValidEmail } from '../../utils/security'

interface SettingsPageProps {
  onNavigate: (path: string) => void
}

type Tab = 'general' | 'seo' | 'reading' | 'social' | 'notifications' | 'security'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'social', label: 'Social', icon: Twitter },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>
      <div>
        <div className="admin-text-sm" style={{ fontWeight: 500 }}>{label}</div>
        {description && <div className="admin-text-sm admin-text-muted" style={{ marginTop: 2 }}>{description}</div>}
      </div>
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
          background: checked ? '#10B981' : 'var(--color-text-muted)', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0, marginTop: 2,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', display: 'block',
        }} />
      </div>
    </div>
  )
}

function FormField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
      <label className="admin-label">{label}</label>
      {description && <p className="admin-text-sm admin-text-muted" style={{ marginBottom: 6, marginTop: 2 }}>{description}</p>}
      {children}
    </div>
  )
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const load = async () => {
      const cfg = await getSiteConfig()
      setConfig(cfg)
      setLoading(false)
    }
    void load()
  }, [])

  const update = (patch: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    setUnsaved(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSiteConfig(config)
      setUnsaved(false)
      showToast('Settings saved ✓')
    } catch {
      showToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addAdminEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address'); return }
    if (config.adminEmails.includes(email)) { setEmailError('This email is already in the list'); return }
    update({ adminEmails: [...config.adminEmails, email] })
    setNewEmail('')
    setEmailError('')
  }

  const removeAdminEmail = (email: string) => {
    update({ adminEmails: config.adminEmails.filter((e) => e !== email) })
  }

  const charCount = config.metaDescription?.length ?? 0

  return (
    <AdminLayout currentPage="settings" onNavigate={onNavigate}>
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-page-subtitle">Configure your newsroom preferences. All changes persist to Firestore.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unsaved && (
            <span style={{ fontSize: 12, color: '#F2A900', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F2A900', display: 'inline-block' }} />
              Unsaved changes
            </span>
          )}
          <button className="btn-admin-primary" onClick={save} disabled={saving || loading}>
            <Check size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="settings-tab-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="settings-tab-content">

          {/* ── GENERAL ── */}
          {activeTab === 'general' && (
            <div className="settings-two-col">
              <div>
                <div className="admin-card">
                  <div className="admin-card-header"><h2 className="admin-card-title"><Globe size={15} /> Site Identity</h2></div>
                  <div className="admin-card-body">
                    <FormField label="Site Name">
                      <input className="admin-input" value={config.siteName} onChange={(e) => update({ siteName: e.target.value })} />
                    </FormField>
                    <FormField label="Tagline">
                      <input className="admin-input" value={config.tagline} onChange={(e) => update({ tagline: e.target.value })} placeholder="Information for living" />
                    </FormField>
                    <FormField label="Description">
                      <textarea className="admin-textarea" rows={3} value={config.description} onChange={(e) => update({ description: e.target.value })} />
                    </FormField>
                    <FormField label="Default Category">
                      <input className="admin-input" value={config.defaultCategory} onChange={(e) => update({ defaultCategory: e.target.value })} />
                    </FormField>
                  </div>
                </div>
              </div>
              <div>
                <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="admin-card-header"><h2 className="admin-card-title"><Mail size={15} /> Contact</h2></div>
                  <div className="admin-card-body">
                    <FormField label="Editor Email">
                      <input className="admin-input" type="email" value={config.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
                    </FormField>
                  </div>
                </div>
                <div className="admin-card">
                  <div className="admin-card-header"><h2 className="admin-card-title">📧 Newsletter</h2></div>
                  <div className="admin-card-body">
                    <FormField label="Newsletter Form URL" description="Paste your Mailchimp, ConvertKit, or Substack embed/API URL">
                      <input className="admin-input" type="url" placeholder="https://mailchimp.com/…" value={config.newsletterUrl} onChange={(e) => update({ newsletterUrl: e.target.value })} />
                    </FormField>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SEO ── */}
          {activeTab === 'seo' && (
            <div className="admin-card">
              <div className="admin-card-header"><h2 className="admin-card-title"><Search size={15} /> SEO & Meta</h2></div>
              <div className="admin-card-body">
                <FormField label="Meta Description" description="Shown in Google search results. Keep under 160 characters.">
                  <textarea className="admin-textarea" rows={3} value={config.metaDescription} onChange={(e) => update({ metaDescription: e.target.value })} maxLength={180} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: charCount > 160 ? '#E32626' : 'var(--color-text-muted)', marginTop: 4 }}>
                    {charCount} / 160 characters
                  </div>
                </FormField>
                <FormField label="OG Image URL" description="Default social sharing image (1200×630px recommended)">
                  <input className="admin-input" type="url" placeholder="https://…" value={config.ogImageUrl} onChange={(e) => update({ ogImageUrl: e.target.value })} />
                  {config.ogImageUrl && (
                    <img src={config.ogImageUrl} alt="OG preview" style={{ marginTop: 8, width: '100%', maxWidth: 320, height: 'auto', borderRadius: 6, border: '1px solid var(--color-border-light)' }} />
                  )}
                </FormField>
                <FormField label="Twitter Card Type">
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['summary', 'summary_large_image'] as const).map((t) => (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: config.twitterCardType === t ? 600 : 400 }}>
                        <input type="radio" checked={config.twitterCardType === t} onChange={() => update({ twitterCardType: t })} />
                        {t}
                      </label>
                    ))}
                  </div>
                </FormField>
                <FormField label="Canonical Domain">
                  <input className="admin-input" type="url" value={config.canonicalDomain} onChange={(e) => update({ canonicalDomain: e.target.value })} />
                </FormField>
              </div>
            </div>
          )}

          {/* ── READING ── */}
          {activeTab === 'reading' && (
            <div className="admin-card">
              <div className="admin-card-header"><h2 className="admin-card-title"><BookOpen size={15} /> Reading Experience</h2></div>
              <div className="admin-card-body">
                <Toggle checked={config.audioEnabled} onChange={(v) => update({ audioEnabled: v })} label="Audio narration available" description="Show the text-to-speech player on article pages" />
                <Toggle checked={config.dropCaps} onChange={(v) => update({ dropCaps: v })} label="Drop caps on articles" description="Large decorative first letter on article body" />
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <div className="admin-text-sm" style={{ fontWeight: 500, marginBottom: 8 }}>Default font size</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => update({ defaultFontSize: sz })}
                        style={{
                          padding: '6px 18px', borderRadius: 6, border: '1px solid',
                          borderColor: config.defaultFontSize === sz ? '#E32626' : 'var(--color-border-light)',
                          background: config.defaultFontSize === sz ? 'rgba(227,38,38,0.08)' : 'transparent',
                          color: config.defaultFontSize === sz ? '#E32626' : 'var(--color-text-secondary)',
                          fontWeight: config.defaultFontSize === sz ? 700 : 400,
                          cursor: 'pointer', fontSize: sz === 'sm' ? 12 : sz === 'md' ? 14 : 16,
                        }}
                      >
                        {sz.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '12px 0' }}>
                  <div className="admin-text-sm" style={{ fontWeight: 500, marginBottom: 8 }}>Default font style</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['serif', 'sans'] as const).map((fs) => (
                      <button
                        key={fs}
                        onClick={() => update({ defaultFontStyle: fs })}
                        style={{
                          padding: '6px 18px', borderRadius: 6, border: '1px solid',
                          borderColor: config.defaultFontStyle === fs ? '#E32626' : 'var(--color-border-light)',
                          background: config.defaultFontStyle === fs ? 'rgba(227,38,38,0.08)' : 'transparent',
                          color: config.defaultFontStyle === fs ? '#E32626' : 'var(--color-text-secondary)',
                          fontWeight: config.defaultFontStyle === fs ? 700 : 400,
                          cursor: 'pointer',
                          fontFamily: fs === 'serif' ? 'Georgia, serif' : 'inherit',
                        }}
                      >
                        {fs.charAt(0).toUpperCase() + fs.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SOCIAL ── */}
          {activeTab === 'social' && (
            <div className="admin-card">
              <div className="admin-card-header"><h2 className="admin-card-title">Social Media</h2></div>
              <div className="admin-card-body">
                <FormField label="Facebook">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={16} style={{ color: '#1877F2', flexShrink: 0 }} />
                    <input className="admin-input" type="url" placeholder="https://facebook.com/deltaupdates" value={config.facebook} onChange={(e) => update({ facebook: e.target.value })} />
                  </div>
                </FormField>
                <FormField label="Twitter / X">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Twitter size={16} style={{ color: '#1DA1F2', flexShrink: 0 }} />
                    <input className="admin-input" type="url" placeholder="https://twitter.com/deltaupdates" value={config.twitter} onChange={(e) => update({ twitter: e.target.value })} />
                  </div>
                </FormField>
                <FormField label="Instagram">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Instagram size={16} style={{ color: '#E1306C', flexShrink: 0 }} />
                    <input className="admin-input" type="url" placeholder="https://instagram.com/deltaupdates" value={config.instagram} onChange={(e) => update({ instagram: e.target.value })} />
                  </div>
                </FormField>
                <FormField label="YouTube">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Youtube size={16} style={{ color: '#FF0000', flexShrink: 0 }} />
                    <input className="admin-input" type="url" placeholder="https://youtube.com/@deltaupdates" value={config.youtube} onChange={(e) => update({ youtube: e.target.value })} />
                  </div>
                </FormField>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="admin-card">
              <div className="admin-card-header"><h2 className="admin-card-title"><Bell size={15} /> Notifications</h2></div>
              <div className="admin-card-body">
                <Toggle checked={config.notifyOnComment} onChange={(v) => update({ notifyOnComment: v })} label="Email on new comment" description="Receive an email when a reader leaves a comment" />
                <Toggle checked={config.notifyOnPublish} onChange={(v) => update({ notifyOnPublish: v })} label="Email when article is published" description="Get notified when an article goes live" />
                <Toggle checked={config.requireCommentModeration} onChange={(v) => update({ requireCommentModeration: v })} label="Require comment moderation" description="Hold comments for approval before they appear publicly" />
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div>
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-card-header">
                  <h2 className="admin-card-title"><Shield size={15} /> Admin Email Whitelist</h2>
                  <span className="admin-text-sm admin-text-muted">Only these emails can access the admin panel</span>
                </div>
                <div className="admin-card-body">
                  {config.adminEmails.length === 0 ? (
                    <div style={{ padding: '12px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No custom admin emails. Using environment variable <code>VITE_ADMIN_EMAILS</code>.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {config.adminEmails.map((email) => (
                        <div key={email} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', background: 'var(--color-bg-surface)',
                          borderRadius: 8, border: '1px solid var(--color-border-light)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Check size={14} style={{ color: '#10B981' }} />
                            <span style={{ fontSize: 13 }}>{email}</span>
                          </div>
                          <button className="btn-icon btn-icon--danger" onClick={() => removeAdminEmail(email)} title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="admin-input"
                      style={{ flex: 1 }}
                      type="email"
                      placeholder="editor@example.com"
                      value={newEmail}
                      onChange={(e) => { setNewEmail(e.target.value); setEmailError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && addAdminEmail()}
                    />
                    <button className="btn-admin-primary" onClick={addAdminEmail} disabled={!newEmail.trim()}>
                      <Plus size={15} /> Add
                    </button>
                  </div>
                  {emailError && <p style={{ color: '#E32626', fontSize: 12, marginTop: 6 }}>{emailError}</p>}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="admin-card" style={{ border: '1px solid rgba(220,38,38,0.3)' }}>
                <div className="admin-card-header" style={{ borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
                  <h2 className="admin-card-title" style={{ color: '#E32626' }}>⚠️ Danger Zone</h2>
                </div>
                <div className="admin-card-body">
                  <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                    <div className="admin-text-sm" style={{ fontWeight: 600, color: '#E32626', marginBottom: 4 }}>Reset Site Config</div>
                    <div className="admin-text-sm admin-text-muted" style={{ marginBottom: 10 }}>Reset all settings to factory defaults. Article data is not affected.</div>
                    <button
                      className="btn-admin-primary"
                      style={{ background: '#E32626', height: 32, fontSize: '0.8125rem' }}
                      onClick={() => { if (window.confirm('Reset all settings to defaults?')) { setConfig(DEFAULT_CONFIG); setUnsaved(true) } }}
                    >
                      Reset Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
