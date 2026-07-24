'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');

  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    // Determine if Google Client ID is configured and fetch auth URL
    const fetchAuthUrl = async () => {
      try {
        const res = await fetch('/api/auth/login');
        const data = await res.json();
        setGoogleAuthUrl(data.url);
        if (data.url && data.url.includes('mock=true')) {
          setIsMockMode(true);
        }
      } catch (err) {
        console.error('Failed to get auth URL:', err);
        setIsMockMode(true);
      }
    };
    fetchAuthUrl();
  }, []);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'Unauthorized') {
        setError(`Email ${emailParam ? `(${emailParam})` : ''} không nằm trong danh sách được phép truy cập (Allowlist).`);
      } else if (errorParam === 'access_denied') {
        setError('Bạn đã từ chối yêu cầu đăng nhập từ Google.');
      } else {
        setError(`Lỗi đăng nhập: ${errorParam}. Vui lòng thử lại.`);
      }
    }
  }, [errorParam, emailParam]);

  const handleGoogleLogin = () => {
    if (!googleAuthUrl) return;
    setLoading(true);
    window.location.href = googleAuthUrl;
  };

  const handleMockLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Vui lòng nhập địa chỉ email.');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();

      if (data.status === 'success') {
        router.push('/');
        router.refresh(); // Refresh layout to update session
      } else {
        setError(data.message || 'Lỗi đăng nhập thử nghiệm.');
        setLoading(false);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
      setLoading(false);
    }
  };

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
          Xác thực tài khoản để truy cập hệ thống báo cáo sự kiện
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
        {!isMockMode ? (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
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
            <span style={{ fontWeight: 600 }}>{loading ? 'Đang chuyển hướng...' : 'Đăng nhập bằng Google'}</span>
          </button>
        ) : (
          <form onSubmit={handleMockLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              color: '#fcd34d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>Chế độ thử nghiệm: Nhập email để mô phỏng Google login.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Email đăng nhập</label>
              <input
                type="email"
                placeholder="bvphap.tk@gmail.com hoặc email khác"
                className="form-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập thử nghiệm'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
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
