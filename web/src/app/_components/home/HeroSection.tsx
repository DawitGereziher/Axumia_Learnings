'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle2, ShieldCheck, Award } from 'lucide-react';

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      searchQuery.trim()
        ? `/courses?search=${encodeURIComponent(searchQuery.trim())}`
        : '/courses',
    );
  };

  return (
    <section style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
      <div className="container">
        <div className="hero-card-banner">
          {/* Decorative accent */}
          <div style={{
            position: 'absolute', top: 30, right: '42%',
            width: 90, height: 45, borderRadius: '90px 90px 0 0',
            background: '#edf7f4', opacity: 0.18,
            transform: 'rotate(-45deg)', pointerEvents: 'none',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center', gap: '3rem', position: 'relative', zIndex: 2,
          }}>
            {/* Left content */}
            <div>
              <div style={{
                fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.24em',
                textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.25rem',
              }}>
                A X U M I A &nbsp; L E A R N I N G S
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', lineHeight: 1.12,
                letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '1.25rem',
              }}>
                Knowledge Meets<br />Innovation
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: 500, marginBottom: '2.25rem',
              }}>
                Ethiopia&apos;s premier learning platform — from Amharic mastery to
                fullstack engineering, learn from verified local experts.
              </p>

              <form onSubmit={handleSearch} className="search-capsule" style={{ maxWidth: 480 }}>
                <Search size={18} color="#0c3b2e" style={{ marginRight: 8, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search Courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#0f172a', fontSize: '0.92rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => router.push('/courses')}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#64748b',
                    cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: 4, whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0', marginLeft: 6,
                  }}
                >
                  Courses ▾
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem', background: '#0c3b2e', borderRadius: 999, marginLeft: 6 }}
                >
                  Search
                </button>
              </form>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                {[
                  { icon: <CheckCircle2 size={15} color="#86efac" />, label: '5,000+ Courses' },
                  { icon: <ShieldCheck size={15} color="#fde047" />, label: 'Telebirr & CBE Birr' },
                  { icon: <Award size={15} color="#86efac" />, label: 'Verified Certificates' },
                ].map(({ icon, label }) => (
                  <span key={label} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right visual */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{
                width: 'clamp(280px, 32vw, 420px)', height: 'clamp(280px, 32vw, 420px)',
                borderRadius: '50%', background: '#fde047',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}>🎓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
