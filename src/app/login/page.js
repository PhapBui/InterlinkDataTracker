'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');

  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    // Check if Google Client ID is configured and fetch auth URL
    const fetchAuthUrl = async () => {
      try {
        const res = await fetch('/api/auth/login');
        if (!res.ok) {
          const errData = await res.json();
          if (errData.error === 'MissingConfig') {
            setIsConfigMissing(true);
            return;
          }
        }
        const data = await res.json();
        if (data.url) {
          setGoogleAuthUrl(data.url);
        } else {
          setIsConfigMissing(true);
        }
      } catch (err) {
        console.error('Failed to get auth URL:', err);
        setIsConfigMissing(true);
      }
    };
    fetchAuthUrl();
  }, []);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'Unauthorized') {
        setError(`Email ${emailParam ? `(${emailParam})` : ''} is not on the allowed access list (Allowlist).`);
      } else if (errorParam === 'access_denied') {
        setError('You denied the Google login request.');
      } else {
        setError(`Login error: ${errorParam}. Please try again.`);
      }
    }
  }, [errorParam, emailParam]);

  const handleGoogleLogin = () => {
    if (!googleAuthUrl) return;
    setLoading(true);
    window.location.href = googleAuthUrl;
  };

  if (isConfigMissing) {
    return (
      <div className="card animate-fade-in" style={{
        maxWidth: '550px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg), 0 0 40px -10px var(--primary-glow)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
            Google OAuth Configuration <span className="text-gradient-purple">Required</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Please configure the Google Client ID and Client Secret in your `.env.local` file
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Google OAuth Credentials Setup Steps:</strong>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Go to the console: <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google Cloud Console</a>.</li>
              <li>Create a new project (or select an existing one).</li>
              <li>Search for **"Credentials"** in the search bar or left navigation menu.</li>
              <li>Select **"Configure Consent Screen"**, set User Type to **External**, fill in app information, and save.</li>
              <li>Return to the **Credentials** tab, click **Create Credentials** &gt; **OAuth client ID**.</li>
              <li>Configure Client ID settings:
                <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', listStyleType: 'circle' }}>
                  <li>**Application type**: Web application.</li>
                  <li>**Name**: Event Tracker Client.</li>
                  <li>**Authorized redirect URIs**: Add `http://localhost:3000/api/auth/callback` (or your production website link).</li>
                </ul>
              </li>
              <li>Click **Create** to retrieve your **Client ID** and **Client Secret**.</li>
            </ol>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Environment Configuration File:</strong>
            <p style={{ margin: '0 0 0.5rem 0' }}>Open the <code style={{color: '#f472b6'}}>.env.local</code> file in the project root directory and enter the following settings:</p>
            <pre style={{
              background: '#090d16',
              padding: '0.75rem',
              borderRadius: '6px',
              color: '#818cf8',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto',
              margin: 0,
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
{`GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
            </pre>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: '#fcd34d',
            textAlign: 'center'
          }}>
            ⚠️ After saving the `.env.local` file, please **restart the Next.js dev server** to apply these changes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{
      maxWidth: '450px',
      width: '100%',
      padding: '2.5rem',
      boxShadow: 'var(--shadow-lg), 0 0 40px -10px var(--primary-glow)',
      border: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          padding: '1rem',
          borderRadius: '50%',
          background: 'var(--primary-glow)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          marginBottom: '1rem'
        }}>
          <Shield size={32} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
          Event Tracker <span className="text-gradient-purple">Gate</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Log in with an authorized Google account to access the app
        </p>
      </div>

      {error && (
        <div className="card animate-fade-in" style={{
          borderColor: 'rgba(239, 68, 68, 0.25)',
          background: 'rgba(239, 68, 68, 0.04)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <button
          onClick={handleGoogleLogin}
          disabled={loading || !googleAuthUrl}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            fontSize: '1rem',
            background: '#fff',
            color: '#111',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.6z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26a5.6 5.6 0 0 1-8.52-2.94H.51v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.53 10.6a5.4 5.4 0 0 1 0-3.2V5.07H.51a9 9 0 0 0 0 7.86l3.02-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .51 5.07l3.02 2.33c.72-2.16 2.74-3.82 5.47-3.82z"/>
          </svg>
          <span style={{ fontWeight: 600 }}>{loading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      padding: '1rem'
    }}>
      <Suspense fallback={
        <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading authentication portal...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
