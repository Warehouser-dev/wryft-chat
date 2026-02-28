import './App.css'
import { 
  Hash, 
  Mic, 
  Lock, 
  Users, 
  Zap, 
  Palette,
  ChevronDown,
  Monitor,
  Terminal,
  ArrowRight
} from 'lucide-react'

function App() {
  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src="/wryfttransparent.png" alt="Wryft" className="logo-img" />
            <span>Wryft</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href="https://github.com/yourusername/wryft" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/login" className="btn-open">Open Wryft</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="badge">Free & Open Source</div>
          <h1>Connect without limits</h1>
          <p>A free and open source communication platform built for friends, communities, and teams.</p>
          
          <div className="hero-buttons">
            <div className="download-dropdown">
              <button className="btn-download">
                <span>Download for Windows</span>
                <ChevronDown className="icon-sm" />
              </button>
              <span className="version">v1.0.0</span>
            </div>
            <a href="/login" className="btn-browser">Open in browser</a>
          </div>
        </div>

        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="preview-content">
              <div className="preview-sidebar">
                <div className="preview-server active"></div>
                <div className="preview-server"></div>
                <div className="preview-server"></div>
                <div className="preview-divider"></div>
                <div className="preview-server add">+</div>
              </div>
              <div className="preview-channels">
                <div className="preview-channel-header"></div>
                <div className="preview-channel"></div>
                <div className="preview-channel active"></div>
                <div className="preview-channel"></div>
              </div>
              <div className="preview-chat">
                <div className="preview-message">
                  <div className="preview-avatar"></div>
                  <div className="preview-message-content"></div>
                </div>
                <div className="preview-message">
                  <div className="preview-avatar"></div>
                  <div className="preview-message-content short"></div>
                </div>
                <div className="preview-message">
                  <div className="preview-avatar"></div>
                  <div className="preview-message-content"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="features-container">
          <h2>Features</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Hash className="icon-lg" />
              </div>
              <h3>Text Channels</h3>
              <p>Organize conversations with channels and categories.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Mic className="icon-lg" />
              </div>
              <h3>Voice Chat</h3>
              <p>Low latency voice channels for gaming and meetings.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Lock className="icon-lg" />
              </div>
              <h3>Permissions</h3>
              <p>Granular permission system for roles and channels.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Users className="icon-lg" />
              </div>
              <h3>Communities</h3>
              <p>Create unlimited servers for your communities.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Zap className="icon-lg" />
              </div>
              <h3>Real-time</h3>
              <p>Instant messaging with WebSocket technology.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Palette className="icon-lg" />
              </div>
              <h3>Customizable</h3>
              <p>Custom server icons, roles, and permissions.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="download" className="download-section">
        <div className="download-container">
          <h2>Download</h2>
          <p>Available for desktop and web</p>
          
          <div className="platforms">
            <div className="platform-card">
              <div className="platform-icon">
                <Monitor className="icon-xl" />
              </div>
              <h3>Windows</h3>
              <a href="#" className="platform-link">Download</a>
            </div>
            
            <div className="platform-card">
              <div className="platform-icon">
                <Monitor className="icon-xl" />
              </div>
              <h3>macOS</h3>
              <a href="#" className="platform-link">Download</a>
            </div>
            
            <div className="platform-card">
              <div className="platform-icon">
                <Terminal className="icon-xl" />
              </div>
              <h3>Linux</h3>
              <a href="#" className="platform-link">Download</a>
            </div>
            
            <div className="platform-card">
              <div className="platform-icon">
                <ArrowRight className="icon-xl" />
              </div>
              <h3>Web</h3>
              <a href="/login" className="platform-link">Open App</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/wryfttransparent.png" alt="Wryft" />
              <span>Wryft</span>
            </div>
            <p>Free and open source communication</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#download">Download</a>
              <a href="#">Roadmap</a>
            </div>
            
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#">Documentation</a>
              <a href="#">API</a>
              <a href="#">GitHub</a>
            </div>
            
            <div className="footer-column">
              <h4>Community</h4>
              <a href="#">Discord</a>
              <a href="#">Twitter</a>
              <a href="#">Support</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2024 Wryft. Open source under MIT License. Made in Sweden</p>
        </div>
      </footer>
    </>
  )
}

export default App
