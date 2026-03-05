import './App.css'
import { Activity, Lock, GitHub, Monitor, ChevronDown } from 'react-feather'
import { useState } from 'react'

function App() {
  const [openFaq, setOpenFaq] = useState(null)

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">WRYFT</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#about">Support</a>
        </div>
        <button className="download-btn-nav">Download</button>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <div className="decorative-icon top-left"></div>
          
          <div className="hero-text">
            <h1>
              Your community.<br />
              Your code.<br />
              Your control.
            </h1>
            <p className="hero-description">
              Wryft is the open-source Discord alternative<br />
              built for people who value privacy<br />
              without sacrificing the features they love.
            </p>
            <div className="hero-buttons">
              <button className="download-btn">Download</button>
              <button className="open-app-btn">Open in App</button>
            </div>
          </div>

          <div className="hero-image">
            <div className="laptop-mockup">
              <div className="laptop-screen">
                <img src="/src/public/Preview.png" alt="Wryft Preview" className="preview-image" />
              </div>
            </div>
          </div>

          <div className="decorative-icon bottom-right"></div>
        </div>
      </main>

      <section className="features-intro">
        <h2 className="features-heading">Tired of being the product?</h2>
        <p className="features-description">
          Traditional chat platforms own your data, track your movements, and clutter your experience with paid tiers and bloated features. Wryft is built differently. We believe communication should be open, transparent, and owned by the community.
        </p>
      </section>

      <section className="card-section">
        <div className="glass-card">
          <div className="card-icon">
            <Activity size={32} strokeWidth={2} />
          </div>
          <h3 className="card-title">Built for Speed</h3>
          <p className="card-description">
            A lightweight interface that stays out of your way and respects your system resources.
          </p>
        </div>
        
        <div className="glass-card">
          <div className="card-icon">
            <Lock size={32} strokeWidth={2} />
          </div>
          <h3 className="card-title">Privacy First</h3>
          <p className="card-description">
            No tracking or data mining. We ensure your information and conversations always stay yours.
          </p>
        </div>
        
        <div className="glass-card">
          <div className="card-icon">
            <GitHub size={32} strokeWidth={2} />
          </div>
          <h3 className="card-title">Open Source</h3>
          <p className="card-description">
            Auditable and extensible code driven by a global community of dedicated developers.
          </p>
        </div>
        
        <div className="glass-card">
          <div className="card-icon">
            <Monitor size={32} strokeWidth={2} />
          </div>
          <h3 className="card-title">Easy Migration</h3>
          <p className="card-description">
            A familiar layout that makes switching from other platforms a seamless experience.
          </p>
        </div>
      </section>

      <section className="faq-section">
        <h2 className="faq-heading">Frequently Asked Questions</h2>
        
        <div className="faq-container">
          <div className={`faq-item ${openFaq === 0 ? 'open' : ''}`} onClick={() => toggleFaq(0)}>
            <div className="faq-question">
              <span>Is Wryft really free?</span>
              <ChevronDown size={20} className="faq-icon" />
            </div>
            {openFaq === 0 && (
              <div className="faq-answer">
                Yes, Wryft is completely free and open source. There are no paid tiers, premium features, or hidden costs.
              </div>
            )}
          </div>

          <div className={`faq-item ${openFaq === 1 ? 'open' : ''}`} onClick={() => toggleFaq(1)}>
            <div className="faq-question">
              <span>How is my data protected?</span>
              <ChevronDown size={20} className="faq-icon" />
            </div>
            {openFaq === 1 && (
              <div className="faq-answer">
                Wryft uses end-to-end encryption for all communications. We don't collect, store, or sell your data.
              </div>
            )}
          </div>

          <div className={`faq-item ${openFaq === 2 ? 'open' : ''}`} onClick={() => toggleFaq(2)}>
            <div className="faq-question">
              <span>Can I migrate from Discord?</span>
              <ChevronDown size={20} className="faq-icon" />
            </div>
            {openFaq === 2 && (
              <div className="faq-answer">
                Yes! Wryft offers migration tools to help you transfer your communities and data from Discord seamlessly.
              </div>
            )}
          </div>

          <div className={`faq-item ${openFaq === 3 ? 'open' : ''}`} onClick={() => toggleFaq(3)}>
            <div className="faq-question">
              <span>What platforms does Wryft support?</span>
              <ChevronDown size={20} className="faq-icon" />
            </div>
            {openFaq === 3 && (
              <div className="faq-answer">
                Wryft is available on Windows, macOS, Linux, iOS, and Android. We also offer a web version.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4 className="footer-heading">WRYFT</h4>
            <p className="footer-text">
              Open-source communication for everyone.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Product</h4>
            <a href="#download" className="footer-link">Download</a>
            <a href="#features" className="footer-link">Features</a>
            <a href="#docs" className="footer-link">Documentation</a>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Community</h4>
            <a href="#github" className="footer-link">GitHub</a>
            <a href="#discord" className="footer-link">Discord</a>
            <a href="#contribute" className="footer-link">Contribute</a>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Legal</h4>
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
            <a href="#license" className="footer-link">License</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 Wryft. Open source and community driven.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
