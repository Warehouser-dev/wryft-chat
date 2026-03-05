import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="legal-page">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginBottom: '32px' }}>
        <ArrowLeft size={20} />
        Back to home
      </Link>

      <h1>Terms of Service</h1>
      <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Wryft, you agree to be bound by these Terms of Service.
        If you don't agree to these terms, please don't use the service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Wryft is a communication platform that allows users to create servers, channels,
        and communicate with others through text and media. This is a personal project
        provided "as is" without warranties.
      </p>

      <h2>3. User Accounts</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>Maintaining the security of your account</li>
        <li>All activities that occur under your account</li>
        <li>Keeping your password confidential</li>
        <li>Notifying us of any unauthorized use</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Violate any laws or regulations</li>
        <li>Harass, abuse, or harm other users</li>
        <li>Share illegal content or malware</li>
        <li>Spam or send unsolicited messages</li>
        <li>Attempt to hack or disrupt the service</li>
        <li>Impersonate others or create fake accounts</li>
        <li>Share content that infringes on others' rights</li>
      </ul>

      <h2>5. Content</h2>
      <p>
        You retain ownership of content you post. By posting content, you grant Wryft
        a license to store, display, and transmit your content as necessary to provide
        the service.
      </p>
      <p>
        We reserve the right to remove content that violates these terms or our
        <Link to="/guidelines"> Community Guidelines</Link>.
      </p>

      <h2>6. Age Requirements</h2>
      <p>
        You must be at least 13 years old to use Wryft. If you're under 18, you should
        have permission from a parent or guardian.
      </p>

      <h2>7. Termination</h2>
      <p>
        We reserve the right to suspend or terminate accounts that violate these terms.
        You can delete your account at any time through the app settings.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        Wryft is provided "as is" without any warranties. This is a personal project
        and may have bugs, downtime, or data loss. Use at your own risk.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Wryft and its creator shall not be
        liable for any damages arising from your use of the service.
      </p>

      <h2>10. Changes to Terms</h2>
      <p>
        We may update these terms at any time. Continued use of the service after
        changes constitutes acceptance of the new terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Contact us through GitHub or the support channels
        listed on our website.
      </p>

      <h2>12. Open Source</h2>
      <p>
        Wryft is open source software. The code is available on GitHub and licensed
        under the terms specified in the repository.
      </p>
    </div>
  );
}
