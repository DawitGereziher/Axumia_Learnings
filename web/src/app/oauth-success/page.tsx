'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

function OAuthSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    const token   = params.get('token');
    const refresh_token = params.get('refresh');
    if (token && refresh_token) {
      setTokens(token, refresh_token);
      refresh().then(() => router.replace('/dashboard'));
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: '#94a3b8' }}>Completing sign in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

export default function OAuthSuccessPage() {
  return <Suspense><OAuthSuccessInner /></Suspense>;
}
