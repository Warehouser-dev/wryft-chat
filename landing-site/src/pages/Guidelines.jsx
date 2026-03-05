import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Guidelines() {
  return (
    <div className="legal-page">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginBottom: '32px' }}>
        <ArrowLeft size={20} />
        Back to home
      </Link>

      <h1>Community Guidelines</h1>
      <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

      <p>
        Wryft is built for communities to connect and communicate. These guidelines
        help keep the platform safe and welcoming for everyone.
      </p>

      <h2>1. Be Respectful</h2>
      <p>Treat others how you'd want to be treated:</p>
      <ul>
        <li>No harassment, bullying, or hate speech</li>
        <li>Respect different opinions and perspectives</li>
        <li>Don't target individuals or groups</li>
        <li>Keep disagreements civil</li>
      </ul>

      <h2>2. No Illegal Content</h2>
      <p>Don't share or promote:</p>
      <ul>
        <li>Illegal activities or content</li>
        <li>Pirated or stolen content</li>
        <li>Drugs or controlled substances</li>
        <li>Weapons or dangerous items</li>
        <li>Anything that violates local laws</li>
      </ul>

      <h2>3. No Harmful Content</h2>
      <p>Don't post content that:</p>
      <ul>
        <li>Promotes violence or self-harm</li>
        <li>Contains graphic violence or gore</li>
        <li>Sexualizes minors in any way</li>
        <li>Shares personal information without consent</li>
        <li>Contains malware or phishing attempts</li>
      </ul>

      <h2>4. No Spam</h2>
      <p>Don't:</p>
      <ul>
        <li>Send unsolicited advertisements</li>
        <li>Mass message users</li>
        <li>Post repetitive content</li>
        <li>Use bots without permission</li>
        <li>Manipulate engagement artificially</li>
      </ul>

      <h2>5. Respect Privacy</h2>
      <p>Privacy matters:</p>
      <ul>
        <li>Don't share others' personal information</li>
        <li>Respect private conversations</li>
        <li>Don't impersonate others</li>
        <li>Get consent before sharing screenshots</li>
      </ul>

      <h2>6. Keep It Legal</h2>
      <p>Follow all applicable laws:</p>
      <ul>
        <li>Copyright and intellectual property laws</li>
        <li>Privacy and data protection laws</li>
        <li>Local and international regulations</li>
      </ul>

      <h2>7. Server Rules</h2>
      <p>
        Server owners can set their own rules. When joining a server:
      </p>
      <ul>
        <li>Read and follow server-specific rules</li>
        <li>Respect moderators' decisions</li>
        <li>Leave if you don't agree with the rules</li>
      </ul>

      <h2>8. Reporting Violations</h2>
      <p>
        If you see content that violates these guidelines:
      </p>
      <ul>
        <li>Report it through the app</li>
        <li>Contact server moderators</li>
        <li>Reach out to us directly for serious issues</li>
      </ul>

      <h2>9. Consequences</h2>
      <p>
        Violating these guidelines may result in:
      </p>
      <ul>
        <li>Content removal</li>
        <li>Temporary suspension</li>
        <li>Permanent account ban</li>
        <li>Reporting to authorities (for illegal content)</li>
      </ul>

      <h2>10. Appeals</h2>
      <p>
        If you believe your account was suspended unfairly, you can appeal by
        contacting us through the support channels.
      </p>

      <h2>11. Age-Appropriate Content</h2>
      <p>
        Wryft is for users 13+. Keep content appropriate for a general audience.
        Mark NSFW content appropriately where supported.
      </p>

      <h2>12. Be a Good Community Member</h2>
      <p>Help make Wryft better:</p>
      <ul>
        <li>Welcome new users</li>
        <li>Report bugs and issues</li>
        <li>Give constructive feedback</li>
        <li>Help others when you can</li>
        <li>Contribute to the open source project</li>
      </ul>

      <h2>Questions?</h2>
      <p>
        Not sure if something violates these guidelines? When in doubt, don't post it.
        Contact us if you need clarification.
      </p>

      <p style={{ marginTop: '40px', color: '#888' }}>
        These guidelines may be updated. Continued use of Wryft means you accept
        the current guidelines.
      </p>
    </div>
  );
}
