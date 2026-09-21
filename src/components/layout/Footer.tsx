import { categories } from '../../data/articles'
import NewsletterForm from '../newsletter/NewsletterForm'

interface FooterProps {
  onNavigate: (path: string) => void
}

export default function Footer({ onNavigate }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <NewsletterForm variant="banner" />

      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            Delta<span className="accent"> Update</span>
          </div>
          <p className="footer-tagline">Information for living</p>
        </div>

        <div className="footer-sections">
          <h4>Sections</h4>
          <div className="footer-links">
            {categories.map((cat) => (
              <button key={cat.slug} onClick={() => onNavigate(`/category/${cat.slug}`)}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="footer-about">
          <h4>About</h4>
          <p>Delta Update delivers premium journalism covering politics, business, technology, and more from Nigeria and around the world.</p>
        </div>

        <div className="footer-social">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {year} Delta Update. All rights reserved.</p>
        <div className="footer-legal">
          <button onClick={() => onNavigate('/privacy')}>Privacy Policy</button>
          <button onClick={() => onNavigate('/terms')}>Terms of Service</button>
        </div>
      </div>
    </footer>
  )
}