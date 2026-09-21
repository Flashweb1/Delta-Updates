import { useState, useEffect } from 'react'
import { breakingNews as staticBreaking } from '../../data/articles'
import { subscribeToSiteConfig } from '../../supabase/siteConfig'

export default function Ticker() {
  const [items, setItems] = useState<string[]>(staticBreaking)

  useEffect(() => {
    const unsub = subscribeToSiteConfig((cfg) => {
      if (cfg.breakingNews && cfg.breakingNews.length > 0) {
        setItems(cfg.breakingNews.map((b) => b.text))
      } else {
        setItems(staticBreaking)
      }
    })
    return unsub
  }, [])

  const displayList = items.length > 0 ? [...items, ...items] : staticBreaking

  return (
    <div className="ticker" role="region" aria-label="Breaking news updates">
      <div className="ticker-inner">
        <span className="breaking">
          <span className="live-pulse-dot" /> Live Breaking
        </span>
        <div className="ticker-scroll-wrapper">
          <div className="ticker-scroll">
            {displayList.map((item, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-text">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}