const STORAGE_KEY = 'delta-cookie-consent'
export type ConsentState = 'granted' | 'denied' | 'unknown'

export function getConsentState(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as ConsentState | null
    if (raw === 'granted' || raw === 'denied') return raw
  } catch {}
  return 'unknown'
}

export function hasAnalyticsConsent(): boolean {
  return getConsentState() === 'granted'
}

let onConsentGrantedCallback: (() => void) | null = null

export function onConsentGranted(cb: () => void): void {
  onConsentGrantedCallback = cb
}

export function notifyConsentGranted(): void {
  if (onConsentGrantedCallback) onConsentGrantedCallback()
}
