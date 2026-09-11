'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 60%)' }}>
      <div className="glass" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '2.5rem' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.75rem' }}>Check your email</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              If <strong>{email}</strong> exists, a reset link has been sent.
            </p>
            <Link href="/login" className="btn-primary" style={{ width: '100%' }}>Back to Sign In</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.6rem', marginBottom: 6 }}>Reset password</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem' }}>Enter your email and we&apos;ll send a reset link.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" required className="input-field" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
              {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: '1.25rem', color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
