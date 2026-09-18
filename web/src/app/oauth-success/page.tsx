'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function OAuthSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const exchanged = useRef(false); // prevent double-fire in React strict mode

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = params.get('code');

    if (!code) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    // Exchange the one-time code for real tokens — tokens never touched the URL
    fetch(`${API}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Exchange failed');
        return res.json();
      })
      .then(async (data) => {
        if (!data.accessToken || !data.refreshToken) throw new Error('Missing tokens');
        setTokens(data.accessToken, data.refreshToken);
        await refresh();
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #0c3b2e', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
        }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Completing sign in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense>
      <OAuthSuccessInner />
    </Suspense>
  );
}
