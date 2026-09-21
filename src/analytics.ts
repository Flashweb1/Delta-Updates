import { initReactSentry } from './utils/sentry'
import { hasAnalyticsConsent, onConsentGranted } from './utils/consent'

const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN || ''
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || ''

let analyticsInitialized = false

if (sentryDsn) {
  initReactSentry(sentryDsn)
}

function initPlausible() {
  if (!plausibleDomain || document.querySelector(`script[data-domain="${plausibleDomain}"]`)) return
  const p = document.createElement('script')
  p.defer = true
  p.async = true
  p.src = 'https://plausible.io/js/script.js'
  p.setAttribute('data-domain', plausibleDomain)
  document.head.appendChild(p)
}

function initGoogleAnalytics() {
  if (!gaMeasurementId) return
  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  gtag('js', new Date())
  gtag('config', gaMeasurementId, { send_page_view: false })
}

function initializeAnalytics() {
  if (analyticsInitialized) return
  analyticsInitialized = true
  initPlausible()
  initGoogleAnalytics()
}

if (hasAnalyticsConsent()) {
  initializeAnalytics()
} else {
  onConsentGranted(initializeAnalytics)
}

export const analytics = {
  logPageView: (path: string) => {
    if (!hasAnalyticsConsent()) return
    if (plausibleDomain) {
      try { window.plausible?.('pageview', { u: path }) } catch {}
    }
    if (gaMeasurementId) {
      try { window.gtag?.('event', 'page_view', { page_path: path }) } catch {}
    }
  },

  logEvent: (eventName: string, eventParams?: Record<string, unknown>) => {
    if (!hasAnalyticsConsent()) return
    if (plausibleDomain) {
      try { window.plausible?.(eventName, { props: eventParams }) } catch {}
    }
    if (gaMeasurementId) {
      try { window.gtag?.('event', eventName, eventParams) } catch {}
    }
  },
}

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: (...args: unknown[]) => void
    plausible?: (event: string, opts?: Record<string, unknown>) => void
  }
}
