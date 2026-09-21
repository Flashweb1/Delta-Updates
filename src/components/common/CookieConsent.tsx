import { useEffect, useState } from 'react'
import { Cookie, X } from 'lucide-react'
import { getSiteConfig } from '../../utils/security'
import { getConsentState, notifyConsentGranted } from '../../utils/consent'

const STORAGE_KEY = 'delta-cookie-consent'
type ConsentState = 'granted' | 'denied' | 'unknown'

export function CookieConsent() {
  const cfg = getSiteConfig()
  const [consent, setConsent] = useState<ConsentState>('unknown')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!cfg.showCookieBanner) return
    const stored = getConsentState()
    if (stored !== 'unknown') {
      setConsent(stored)
    } else {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [cfg.showCookieBanner])

  if (!cfg.showCookieBanner) return null
  if (consent !== 'unknown') return null
  if (!visible) return null

  const write = (value: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {}
    setConsent(value)
    if (value === 'granted') notifyConsentGranted()
  }

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie Consent"
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 120,
        padding: '0.875rem 1rem calc(0.875rem + env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div className="cookie-card">
        <div className="cookie-content">
          <div className="cookie-icon" aria-hidden>
            <Cookie size={18} />
          </div>
          <div className="cookie-copy">
            <div className="cookie-title">We value your privacy</div>
            <div className="cookie-desc">
              {cfg.name} uses cookies and similar technologies to enhance your
              browsing experience, analyze site traffic, and serve personalized
              content. By clicking "Accept", you consent to our use
              of cookies as described in our{' '}
              <a href="/privacy" className="cookie-link">
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </div>
        <div className="cookie-actions">
          <button className="cookie-icon-btn" onClick={() => write('denied')} aria-label="Decline cookies" title="Decline">
            <X size={16} />
          </button>
          <button className="cookie-btn cookie-decline" onClick={() => write('denied')}>Decline</button>
          <button className="cookie-btn cookie-accept" onClick={() => write('granted')}>Accept all</button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
