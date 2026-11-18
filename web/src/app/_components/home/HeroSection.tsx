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
        <div className="hero-card-banner" style={{
          background: 'linear-gradient(135deg, #0c3b2e 0%, #07261f 100%)',
          border: '1px solid rgba(253, 224, 71, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
        }}>
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
                fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.24em',
                textTransform: 'uppercase', color: '#fde047',
                marginBottom: '1.25rem',
              }}>
                A X U M I A &nbsp; L E A R N I N G S
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', lineHeight: 1.12,
                letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '1.25rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}>
                Knowledge Meets<br />Innovation
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.95)',
                maxWidth: 500, marginBottom: '2.25rem',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}>
                Ethiopia&apos;s premier learning platform — from Amharic mastery to
                fullstack engineering, learn from verified local experts.
              </p>

              <form onSubmit={handleSearch} className="search-capsule" style={{ maxWidth: 480, background: '#ffffff', border: '1px solid rgba(253, 224, 71, 0.4)' }}>
                <Search size={18} color="#0c3b2e" style={{ marginRight: 8, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search Courses, Tutors, Skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#0c3b2e', fontSize: '0.95rem', fontWeight: 600, width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => router.push('/courses')}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#0c3b2e',
                    cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center',
                    gap: 4, whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1', marginLeft: 6,
                  }}
                >
                  Courses ▾
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem', background: '#0c3b2e', color: '#ffffff', borderRadius: 999, marginLeft: 6, fontWeight: 700 }}
                >
                  Search
                </button>
              </form>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                {[
                  { icon: <CheckCircle2 size={16} color="#fde047" />, label: '5,000+ Courses' },
                  { icon: <ShieldCheck size={16} color="#fde047" />, label: 'Telebirr & CBE Birr' },
                  { icon: <Award size={16} color="#fde047" />, label: 'Verified Certificates' },
                ].map(({ icon, label }) => (
                  <span key={label} style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right visual */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{
                width: 'clamp(280px, 32vw, 420px)', height: 'clamp(280px, 32vw, 420px)',
                borderRadius: '50%', background: 'linear-gradient(135deg, #fde047 0%, #facc15 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
                border: '4px solid rgba(255,255,255,0.2)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/hero.png"
                  alt="Axumia Learnings Hero"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/course-icon.png';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
