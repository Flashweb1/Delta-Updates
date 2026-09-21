/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_NAME?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_SITE_DESCRIPTION?: string
  readonly VITE_SITE_LOCALE?: string
  readonly VITE_CONTACT_EMAIL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_AI_PROXY_URL?: string
  readonly VITE_ADMIN_EMAILS?: string
  readonly VITE_PLAUSIBLE_DOMAIN?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SHOW_COOKIE_BANNER?: string
  readonly VITE_DEV_BYPASS_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}