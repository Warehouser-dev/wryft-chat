import { CheckIcon } from '@heroicons/react/24/solid';
import { Crown } from 'phosphor-react';

function PremiumPage() {
  const handleSubscribe = () => {
    // Replace with your actual Polar.sh product link
    window.open('https://polar.sh/wryft/subscribe', '_blank');
  };

  const features = [
    { title: 'Custom Profile Themes', desc: 'Personalize your profile with custom colors' },
    { title: 'Animated Avatars', desc: 'Use GIFs as your profile picture' },
    { title: 'Larger File Uploads', desc: 'Upload files up to 50MB (vs 8MB)' },
    { title: 'Custom Emojis', desc: 'Upload and use your own custom emojis' },
    { title: 'Premium Badge', desc: 'Show off your premium status' },
    { title: 'Animated Emoji', desc: 'Use animated emojis in chat' },
    { title: 'HD Video Quality', desc: 'Crystal clear video in voice channels' },
    { title: 'Custom Discriminator', desc: 'Choose your own #0001-#9999 tag' },
    { title: 'Early Access', desc: 'Try new features before everyone else' },
    { title: 'Premium Banner', desc: 'Add a custom banner to your profile' },
  ];

  return (
    <div className="premium-page">
      <div className="premium-page-header">
        <div className="premium-page-icon-wrapper">
          <Crown size={64} weight="fill" />
        </div>
        <h1>Wryft Premium</h1>
        <p>Unlock exclusive features and support Wryft development</p>
        
        <div className="premium-page-price">
          <span className="price-amount">$4.99</span>
          <span className="price-period">/month</span>
        </div>

        <button className="premium-subscribe-button" onClick={handleSubscribe}>
          <Crown size={20} weight="fill" />
          Subscribe Now
        </button>

        <p className="premium-powered-by">Powered by Polar.sh • Secure payment processing</p>
      </div>

      <div className="premium-page-features">
        <h2>Premium Features</h2>
        <div className="premium-features-grid">
          {features.map((feature, index) => (
            <div key={index} className="premium-feature-card">
              <CheckIcon className="icon-24 feature-check" />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-page-footer">
        <p>Cancel anytime. No commitments.</p>
        <p className="premium-footer-note">
          All payments are processed securely through Polar.sh
        </p>
      </div>
    </div>
  );
}

export default PremiumPage;
