import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="legal-page">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginBottom: '32px' }}>
        <ArrowLeft size={20} />
        Back to home
      </Link>

      <h1>Privacy Policy</h1>
      <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Information We Collect</h2>
      
      <h3>Account Information</h3>
      <p>When you create an account, we collect:</p>
      <ul>
        <li>Email address</li>
        <li>Username</li>
        <li>Password (encrypted)</li>
      </ul>

      <h3>Content You Create</h3>
      <p>We store content you create on Wryft, including:</p>
      <ul>
        <li>Messages you send</li>
        <li>Files you upload</li>
        <li>Servers and channels you create</li>
        <li>Your profile information</li>
      </ul>

      <h3>Usage Information</h3>
      <p>We may collect:</p>
      <ul>
        <li>IP addresses</li>
        <li>Browser type and version</li>
        <li>Device information</li>
        <li>Usage patterns and features used</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide and maintain the service</li>
        <li>Authenticate your account</li>
        <li>Store and deliver your messages</li>
        <li>Improve the service and fix bugs</li>
        <li>Prevent abuse and enforce our terms</li>
      </ul>

      <h2>3. Data Storage</h2>
      <p>
        Your data is stored on our servers. We use industry-standard security measures
        to protect your information, but no method is 100% secure.
      </p>
      <p>
        Messages and files are stored as long as you keep your account. Deleted content
        may remain in backups for a limited time.
      </p>

      <h2>4. Data Sharing</h2>
      <p>We do NOT sell your data. We may share information only when:</p>
      <ul>
        <li>Required by law or legal process</li>
        <li>Necessary to prevent harm or illegal activity</li>
        <li>You explicitly consent to sharing</li>
      </ul>

      <h2>5. Cookies and Tracking</h2>
      <p>
        We use cookies and local storage to keep you logged in and remember your
        preferences. We don't use third-party tracking or advertising cookies.
      </p>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and data</li>
        <li>Export your data</li>
        <li>Opt out of certain data collection</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We keep your data as long as your account is active. When you delete your
        account, we delete your data within 30 days, except where required by law
        or for legitimate business purposes.
      </p>

      <h2>8. Children's Privacy</h2>
      <p>
        Wryft is not intended for children under 13. We don't knowingly collect
        information from children under 13. If we learn we have, we'll delete it.
      </p>

      <h2>9. International Users</h2>
      <p>
        Wryft is operated from Sweden. By using the service, you consent
        to your data being transferred to and processed in Sweden.
      </p>

      <h2>10. Security</h2>
      <p>
        We implement security measures including:
      </p>
      <ul>
        <li>Encrypted passwords</li>
        <li>HTTPS connections</li>
        <li>Regular security updates</li>
        <li>Access controls and monitoring</li>
      </ul>
      <p>
        However, this is a personal project and may not have enterprise-level security.
        Use at your own risk.
      </p>

      <h2>11. Changes to Privacy Policy</h2>
      <p>
        We may update this policy. We'll notify you of significant changes through
        the service or by email.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        Questions about privacy? Contact us through GitHub or the support channels
        on our website.
      </p>

      <h2>13. Open Source</h2>
      <p>
        Wryft is open source. You can review the code to see exactly how we handle
        your data. You can also self-host your own instance for complete control.
      </p>
    </div>
  );
}
