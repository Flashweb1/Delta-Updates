import { getSupabase } from './client'
import { breakingNews as staticBreaking } from '../data/articles'

export interface BreakingNewsItem {
  id: string
  text: string
  label?: 'Breaking' | 'Developing' | 'Update'
  expiresAt?: string // ISO string
}

export interface HomepageSection {
  categorySlug: string
  visible: boolean
  order: number
}

export interface SiteConfig {
  siteName: string
  tagline: string
  description: string
  contactEmail: string
  facebook: string
  twitter: string
  instagram: string
  youtube: string
  defaultCategory: string
  breakingNews: BreakingNewsItem[]
  homepageSections: HomepageSection[]
  featuredArticleId: string | null
  // SEO
  metaDescription: string
  ogImageUrl: string
  twitterCardType: 'summary' | 'summary_large_image'
  canonicalDomain: string
  // Reading Experience
  audioEnabled: boolean
  dropCaps: boolean
  defaultFontSize: 'sm' | 'md' | 'lg'
  defaultFontStyle: 'serif' | 'sans'
  // Newsletter
  newsletterUrl: string
  // Content
  articlesPerSection: number
  showEditorsPick: boolean
  showNewsletter: boolean
  showOpinion: boolean
  showTopStories: boolean
  requireCommentModeration: boolean
  notifyOnComment: boolean
  notifyOnPublish: boolean
  // Admin
  adminEmails: string[]
}

export const DEFAULT_CONFIG: SiteConfig = {
  siteName: 'Delta Update',
  tagline: 'Information for living',
  description: 'Your trusted source for Nigerian news, politics, business, and stories that matter.',
  contactEmail: 'editor@deltaupdates.com',
  facebook: 'https://facebook.com/deltaupdates',
  twitter: 'https://twitter.com/deltaupdates',
  instagram: '',
  youtube: '',
  defaultCategory: 'News',
  breakingNews: staticBreaking.map((text, i) => ({ id: `static-${i}`, text, label: 'Breaking' as const })),
  homepageSections: [
    { categorySlug: 'politics', visible: true, order: 1 },
    { categorySlug: 'business', visible: true, order: 2 },
    { categorySlug: 'tech', visible: true, order: 3 },
    { categorySlug: 'sports', visible: false, order: 4 },
    { categorySlug: 'health', visible: false, order: 5 },
  ],
  featuredArticleId: null,
  metaDescription: 'Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria.',
  ogImageUrl: '',
  twitterCardType: 'summary_large_image',
  canonicalDomain: 'https://deltaupdates.vercel.app',
  audioEnabled: true,
  dropCaps: true,
  defaultFontSize: 'md',
  defaultFontStyle: 'serif',
  newsletterUrl: '',
  articlesPerSection: 4,
  showEditorsPick: true,
  showNewsletter: true,
  showOpinion: true,
  showTopStories: true,
  requireCommentModeration: true,
  notifyOnComment: true,
  notifyOnPublish: true,
  adminEmails: [],
}

interface SiteConfigRow {
  site_name: string
  tagline: string
  description: string
  contact_email: string
  facebook: string
  twitter: string
  instagram: string
  youtube: string
  default_category: string
  breaking_news: unknown
  homepage_sections: unknown
  featured_article_id: string | null
  meta_description: string
  og_image_url: string
  twitter_card_type: 'summary' | 'summary_large_image'
  canonical_domain: string
  audio_enabled: boolean
  drop_caps: boolean
  default_font_size: 'sm' | 'md' | 'lg'
  default_font_style: 'serif' | 'sans'
  newsletter_url: string
  articles_per_section: number
  show_editors_pick: boolean
  show_newsletter: boolean
  show_opinion: boolean
  show_top_stories: boolean
  require_comment_moderation: boolean
  notify_on_comment: boolean
  notify_on_publish: boolean
  admin_emails: string[]
}

function toSiteConfig(row: SiteConfigRow): SiteConfig {
  const breakingNews = Array.isArray(row.breaking_news)
    ? (row.breaking_news as BreakingNewsItem[])
    : DEFAULT_CONFIG.breakingNews
  const homepageSections = Array.isArray(row.homepage_sections)
    ? (row.homepage_sections as HomepageSection[])
    : DEFAULT_CONFIG.homepageSections
  const admins = Array.isArray(row.admin_emails) ? (row.admin_emails as string[]) : []
  return {
    siteName: row.site_name ?? DEFAULT_CONFIG.siteName,
    tagline: row.tagline ?? DEFAULT_CONFIG.tagline,
    description: row.description ?? DEFAULT_CONFIG.description,
    contactEmail: row.contact_email ?? DEFAULT_CONFIG.contactEmail,
    facebook: row.facebook ?? DEFAULT_CONFIG.facebook,
    twitter: row.twitter ?? DEFAULT_CONFIG.twitter,
    instagram: row.instagram ?? DEFAULT_CONFIG.instagram,
    youtube: row.youtube ?? DEFAULT_CONFIG.youtube,
    defaultCategory: row.default_category ?? DEFAULT_CONFIG.defaultCategory,
    breakingNews,
    homepageSections,
    featuredArticleId: row.featured_article_id ?? null,
    metaDescription: row.meta_description ?? DEFAULT_CONFIG.metaDescription,
    ogImageUrl: row.og_image_url ?? DEFAULT_CONFIG.ogImageUrl,
    twitterCardType: row.twitter_card_type ?? DEFAULT_CONFIG.twitterCardType,
    canonicalDomain: row.canonical_domain ?? DEFAULT_CONFIG.canonicalDomain,
    audioEnabled: row.audio_enabled ?? DEFAULT_CONFIG.audioEnabled,
    dropCaps: row.drop_caps ?? DEFAULT_CONFIG.dropCaps,
    defaultFontSize: row.default_font_size ?? DEFAULT_CONFIG.defaultFontSize,
    defaultFontStyle: row.default_font_style ?? DEFAULT_CONFIG.defaultFontStyle,
    newsletterUrl: row.newsletter_url ?? DEFAULT_CONFIG.newsletterUrl,
    articlesPerSection: row.articles_per_section ?? DEFAULT_CONFIG.articlesPerSection,
    showEditorsPick: row.show_editors_pick ?? DEFAULT_CONFIG.showEditorsPick,
    showNewsletter: row.show_newsletter ?? DEFAULT_CONFIG.showNewsletter,
    showOpinion: row.show_opinion ?? DEFAULT_CONFIG.showOpinion,
    showTopStories: row.show_top_stories ?? DEFAULT_CONFIG.showTopStories,
    requireCommentModeration: row.require_comment_moderation ?? DEFAULT_CONFIG.requireCommentModeration,
    notifyOnComment: row.notify_on_comment ?? DEFAULT_CONFIG.notifyOnComment,
    notifyOnPublish: row.notify_on_publish ?? DEFAULT_CONFIG.notifyOnPublish,
    adminEmails: admins,
  }
}

function toRow(config: Partial<SiteConfig>): Partial<SiteConfigRow> {
  const row: Partial<SiteConfigRow> = {}
  if (config.siteName !== undefined) row.site_name = config.siteName
  if (config.tagline !== undefined) row.tagline = config.tagline
  if (config.description !== undefined) row.description = config.description
  if (config.contactEmail !== undefined) row.contact_email = config.contactEmail
  if (config.facebook !== undefined) row.facebook = config.facebook
  if (config.twitter !== undefined) row.twitter = config.twitter
  if (config.instagram !== undefined) row.instagram = config.instagram
  if (config.youtube !== undefined) row.youtube = config.youtube
  if (config.defaultCategory !== undefined) row.default_category = config.defaultCategory
  if (config.breakingNews !== undefined) row.breaking_news = config.breakingNews
  if (config.homepageSections !== undefined) row.homepage_sections = config.homepageSections
  if (config.featuredArticleId !== undefined) row.featured_article_id = config.featuredArticleId
  if (config.metaDescription !== undefined) row.meta_description = config.metaDescription
  if (config.ogImageUrl !== undefined) row.og_image_url = config.ogImageUrl
  if (config.twitterCardType !== undefined) row.twitter_card_type = config.twitterCardType
  if (config.canonicalDomain !== undefined) row.canonical_domain = config.canonicalDomain
  if (config.audioEnabled !== undefined) row.audio_enabled = config.audioEnabled
  if (config.dropCaps !== undefined) row.drop_caps = config.dropCaps
  if (config.defaultFontSize !== undefined) row.default_font_size = config.defaultFontSize
  if (config.defaultFontStyle !== undefined) row.default_font_style = config.defaultFontStyle
  if (config.newsletterUrl !== undefined) row.newsletter_url = config.newsletterUrl
  if (config.articlesPerSection !== undefined) row.articles_per_section = config.articlesPerSection
  if (config.showEditorsPick !== undefined) row.show_editors_pick = config.showEditorsPick
  if (config.showNewsletter !== undefined) row.show_newsletter = config.showNewsletter
  if (config.showOpinion !== undefined) row.show_opinion = config.showOpinion
  if (config.showTopStories !== undefined) row.show_top_stories = config.showTopStories
  if (config.requireCommentModeration !== undefined) row.require_comment_moderation = config.requireCommentModeration
  if (config.notifyOnComment !== undefined) row.notify_on_comment = config.notifyOnComment
  if (config.notifyOnPublish !== undefined) row.notify_on_publish = config.notifyOnPublish
  if (config.adminEmails !== undefined) row.admin_emails = config.adminEmails
  return row
}

async function fetchRow(): Promise<SiteConfigRow | null> {
  const client = getSupabase()
  if (!client) return null
  const { data, error } = await client.from('site_config').select('*').eq('id', 1).maybeSingle()
  if (error || !data) return null
  return data as SiteConfigRow
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const row = await fetchRow()
  return row ? toSiteConfig(row) : DEFAULT_CONFIG
}

export async function saveSiteConfig(config: Partial<SiteConfig>): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured.')
  const row = toRow(config)
  const { error } = await client.from('site_config').update(row).eq('id', 1)
  if (error) throw error
}

export function subscribeToSiteConfig(callback: (config: SiteConfig) => void): () => void {
  const client = getSupabase()
  if (!client) {
    callback(DEFAULT_CONFIG)
    return () => {}
  }

  const apply = async () => {
    const row = await fetchRow()
    callback(row ? toSiteConfig(row) : DEFAULT_CONFIG)
  }

  const channel = client.channel(`site-config-${Math.random().toString(36).slice(2)}`)
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config' }, () => {
      void apply()
    })
    .subscribe()
  void apply()

  return () => {
    void getSupabase()?.removeChannel(channel)
  }
}