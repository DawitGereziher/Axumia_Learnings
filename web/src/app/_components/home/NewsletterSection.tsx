'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <section style={{ padding: '5rem 0', background: 'linear-gradient(135deg, #0c3b2e 0%, #1a5c45 100%)' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: 600 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
          Stay in the Loop
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#fff', marginBottom: '1rem' }}>
          Get notified about new courses
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Be the first to know when new courses drop — from Amharic to machine learning.
        </p>

        {subscribed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#86efac', fontSize: '1rem', fontWeight: 600 }}>
            <CheckCircle2 size={20} /> You&apos;re subscribed!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '0.6rem 1.2rem' }}>
              <Mail size={16} color="rgba(255,255,255,0.6)" />
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ background: '#fde047', color: '#0c3b2e', borderRadius: 999, padding: '0.6rem 1.5rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
