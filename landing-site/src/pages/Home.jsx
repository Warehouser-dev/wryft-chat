import { MessageSquare, Users, Shield, Zap, Download, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <nav>
        <div className="container">
          <div className="logo">
            <img src="/logo.png" alt="Wryft" style={{ width: '40px', height: '40px' }} />
            Wryft
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="https://github.com/Warehouser-dev/wryft-chat" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/docs" target="_blank">Docs</a>
            <a href="http://localhost:5173" className="cta-button">Open App</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '6px 14px', 
          background: '#1a1a1a', 
          border: '1px solid #2a2a2a', 
          borderRadius: '20px', 
          fontSize: '13px',
          fontWeight: '500',
          color: '#888',
          marginBottom: '24px'
        }}>
          🇸🇪 Made in Sweden
        </div>
        <h1>Connect without limits</h1>
        <p>
          A modern, open-source communication platform built for communities.
          Chat, voice, and collaborate with complete control over your data.
        </p>
        <div className="hero-buttons">
          <button className="primary-btn">
            <Download size={20} />
            Download App
          </button>
          <button className="secondary-btn" onClick={() => window.open('http://localhost:5173', '_blank')}>
            Open Web App
          </button>
        </div>
      </section>

      <section className="features" id="features">
        <h2>Built for communities</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MessageSquare size={24} />
            </div>
            <h3>Real-time messaging</h3>
            <p>
              Instant messaging with support for text, images, and file sharing.
              Edit and delete messages with full history.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Users size={24} />
            </div>
            <h3>Servers & channels</h3>
            <p>
              Create unlimited servers with organized channels. Manage permissions
              and roles for complete control.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={24} />
            </div>
            <h3>Privacy focused</h3>
            <p>
              Your data belongs to you. Self-host or use our service with
              end-to-end encryption options.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>Lightning fast</h3>
            <p>
              Built with Rust and React for maximum performance. Optimized
              for speed and reliability.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Github size={24} />
            </div>
            <h3>Open source</h3>
            <p>
              Fully open source and transparent. Contribute, fork, or self-host
              your own instance.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Users size={24} />
            </div>
            <h3>Friends & DMs</h3>
            <p>
              Add friends, send direct messages, and see who's online.
              Stay connected with your community.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="/docs">Documentation</a></li>
              <li><a href="http://localhost:5173">Web App</a></li>
              <li><a href="#">Download</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://github.com/Warehouser-dev/wryft-chat">GitHub</a></li>
              <li><a href="/docs/api">API Docs</a></li>
              <li><a href="#">Support</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/guidelines">Community Guidelines</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Wryft</h4>
            <p style={{ color: '#888', fontSize: '14px' }}>
              An open-source communication platform for modern communities.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 Wryft. Open source project.</p>
        </div>
      </footer>
    </div>
  );
}
