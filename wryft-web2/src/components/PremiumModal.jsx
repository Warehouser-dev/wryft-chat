import { X, Crown, Check } from 'phosphor-react';
import { useState } from 'react';

function PremiumModal({ isOpen, onClose, currentUser }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const handleSubscribe = () => {
    // Redirect to Polar.sh checkout
    // Replace with your actual Polar.sh product link
    window.open('https://polar.sh/wryft/subscribe', '_blank');
  };

  const features = [
    'Custom profile themes',
    'Animated avatars',
    'Premium badge',
    'Custom status emojis',
    'Larger file uploads (50MB)',
    'HD screen sharing',
    'Server boosts',
    'Early access to features',
  ];

  return (
    <div className={`premium-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <button className="premium-close" onClick={handleClose}>
          <X size={24} />
        </button>

        <div className="premium-header">
          <div className="premium-icon">
            <Crown size={48} weight="fill" />
          </div>
          <h2>Wryft Premium</h2>
          <p>Unlock exclusive features and support development</p>
        </div>

        <div className="premium-pricing">
          <div className="premium-price">
            <span className="price-amount">$4.99</span>
            <span className="price-period">/month</span>
          </div>
          <p className="price-description">Cancel anytime, no questions asked</p>
        </div>

        <div className="premium-features">
          <h3>What you get</h3>
          <div className="features-list">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <Check size={20} weight="bold" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="premium-subscribe-btn" onClick={handleSubscribe}>
          <Crown size={20} weight="fill" />
          Subscribe Now
        </button>

        <p className="premium-footer">
          Powered by Polar.sh • Secure payment processing
        </p>
      </div>
    </div>
  );
}

export default PremiumModal;
