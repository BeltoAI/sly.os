export default function Privacy() {
  return (
    <div style={{ background: '#06070a', color: '#e7eaf5', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1em', background: 'linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: 800 }}>
          Privacy Policy
        </h1>
        
        <p style={{ color: '#9fa8bf', marginBottom: '2em' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Introduction</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            SlyOS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Information We Collect</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd', marginBottom: '1em' }}>
            We collect information that you provide directly to us when you:
          </p>
          <ul style={{ paddingLeft: '1.5em', lineHeight: 1.8, color: '#c8cfdd' }}>
            <li>Join our waitlist (email address, company name, audience type)</li>
            <li>Contact us for support or inquiries</li>
            <li>Use our services (API usage, compute requests, device information)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>How We Use Your Information</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd', marginBottom: '1em' }}>
            We use the information we collect to:
          </p>
          <ul style={{ paddingLeft: '1.5em', lineHeight: 1.8, color: '#c8cfdd' }}>
            <li>Manage waitlist access and send invitations to our platform</li>
            <li>Provide, maintain, and improve our services</li>
            <li>Process and complete transactions</li>
            <li>Send you technical notices, updates, and support messages</li>
            <li>Monitor and analyze trends, usage, and activities</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Data Security</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Data Retention</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Your Rights</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd', marginBottom: '1em' }}>
            You have the right to:
          </p>
          <ul style={{ paddingLeft: '1.5em', lineHeight: 1.8, color: '#c8cfdd' }}>
            <li>Access, update, or delete your personal information</li>
            <li>Object to processing of your personal information</li>
            <li>Request restriction of processing your personal information</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Cookies and Tracking</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            We use session storage to remember your modal preferences. We do not use third-party tracking cookies or analytics at this time.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Third-Party Services</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            We use MongoDB Atlas for database services. Your data is stored securely and is subject to MongoDB's privacy practices.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Changes to This Policy</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section style={{ marginBottom: '2em' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5em' }}>Contact Us</h2>
          <p style={{ lineHeight: 1.6, color: '#c8cfdd' }}>
            If you have questions about this Privacy Policy, please contact us at: privacy@slyos.ai
          </p>
        </section>

        <div style={{ marginTop: '3em', paddingTop: '2em', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/" style={{ color: '#ffb800', textDecoration: 'none' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
