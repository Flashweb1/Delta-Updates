import { useState } from 'react'
import { Check, Mail, MonitorSmartphone } from 'lucide-react'

interface NewsletterFormProps {
  variant?: 'banner' | 'sidebar'
}

export default function NewsletterForm({ variant = 'banner' }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 4000)
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="sidebar-newsletter">
        <span className="sidebar-widget-icon">
          <Mail size={18} />
        </span>
        <span className="newsletter-badge">EDITORIAL BRIEFING</span>
        <h4>The Digests</h4>
        <p>Intelligence and analysis in your inbox, every weekday morning.</p>
        {subscribed ? (
          <span className="newsletter-success-small">
            <Check size={16} /> Subscribed — watch your inbox.
          </span>
        ) : (
          <form className="sidebar-newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
            />
            <button type="submit">
              <MonitorSmartphone size={16} /> Subscribe
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="newsletter-card">
      <div className="newsletter-content">
        <div className="newsletter-badge">EDITORIAL BRIEFING</div>
        <h3>The Morning Digest</h3>
        <p>Get curated investigative reporting and breaking intelligence sent directly to your inbox every weekday morning.</p>
      </div>
      {subscribed ? (
        <div className="newsletter-success">
          <Check size={20} /> Thank you for subscribing to Delta Update Daily Digest.
        </div>
      ) : (
        <form className="newsletter-form" onSubmit={handleSubscribe}>
          <div className="input-wrapper">
            <Mail size={16} />
            <input
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit">Subscribe</button>
        </form>
      )}
    </div>
  )
}