'use client';

import React, { useEffect, useState } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Star, Users, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function InstructorsPage() {
  const { t } = useLanguage();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/users/instructors`)
      .then(r => {
        if (!r.ok) throw new Error('Unable to load instructors');
        return r.json();
      })
      .then(d => setInstructors(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = instructors.filter(i => {
    const name = `${i.user?.first_name || ''} ${i.user?.last_name || ''}`.toLowerCase();
    const hl = (i.headline || '').toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || hl.includes(query);
  });

  return (
    <PageTemplate fullWidth={true}>
      <div style={{ flex: 1 }}>
        {/* ── Figma Hero Banner Container ────────────────────────── */}
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 28,
            padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
            textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', top: -100, right: '15%', width: 340, height: 340, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -80, left: '15%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: 780, margin: '0 auto' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.35rem 1.1rem', fontSize: '0.75rem',
                fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '1.25rem',
              }}>
                <Users size={14} /> M E E T  O U R  M E N T O R S
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.15,
                color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
              }}>
                Learn directly from{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                  proven leaders.
                  <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                  </svg>
                </span>
              </h1>

              <p style={{
                color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
                lineHeight: 1.6, marginBottom: '2rem',
              }}>
                Connect with verified university professors, senior software engineers, and experienced practitioners across Ethiopia. Book 1-on-1 mentorship or explore their courses.
              </p>

              {/* Search Capsule */}
              <div style={{
                display: 'flex', alignItems: 'center', background: '#ffffff',
                borderRadius: 999, padding: '0.4rem 0.5rem 0.4rem 1.4rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxWidth: 540, margin: '0 auto',
              }}>
                <Search size={18} color="#0c3b2e" style={{ flexShrink: 0, marginRight: '0.75rem' }} />
                <input
                  type="search"
                  placeholder="Search mentors by name, specialty, or university…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    color: '#0c3b2e', fontSize: '0.95rem', fontWeight: 600, outline: 'none',
                  }}
                />
                <button
                  className="btn-primary"
                  style={{
                    padding: '0.7rem 1.6rem', borderRadius: 999, fontWeight: 800,
                    fontSize: '0.88rem', background: '#0c3b2e', color: '#ffffff',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Instructors list (Figma KnowledgePulse LMS 4-Column Layout) */}
        <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
          
          {/* Section Heading with Doodle Loop on "mentors." & Geometric Polygon Accent (from Figma KnowledgePulse) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', position: 'relative' }}>
            <div>
              <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', color: 'var(--text-primary)',
                lineHeight: 1.2, letterSpacing: '-0.02em',
              }}>
                Meet our professional{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: 'var(--text-primary)' }}>
                  mentors.
                  {/* Figma green doodle loop around mentors */}
                  <svg style={{ position: 'absolute', top: '-15%', left: '-12%', width: '124%', height: '135%', pointerEvents: 'none' }} viewBox="0 0 160 55" fill="none">
                    <path
                      d="M10 28 C 10 10, 150 5, 150 28 C 150 48, 15 50, 15 28 C 15 15, 140 18, 140 28"
                      stroke="#0c3b2e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.6rem' }}>
                Hand-picked certified professors and tech industry veterans available for 1-on-1 tutoring.
              </p>
            </div>

            {/* Dark pine geometric polygon accent from Figma mentors screenshot */}
            <div style={{
              width: 72, height: 44,
              background: 'var(--pine-deep)',
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              opacity: 0.85,
              flexShrink: 0,
              marginLeft: '1rem',
            }} />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.75rem' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ height: 340, borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass" style={{ borderRadius: 20, padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {t.instructors.noInstructors}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.75rem' }}>
                {filtered.map(i => {
                  const avatarUrl = getFullUrl(i.profile_image || i.user?.image);
                  const instructorName = `${i.user?.first_name || ''} ${i.user?.last_name || ''}`.trim() || 'Verified Mentor';
                  const specialty = i.headline || 'UX/UI Designer & Instructor';

                  return (
                    <Link key={i.id} href={`/instructors/${i.user_id}`} style={{ textDecoration: 'none' }}>
                      <article style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 16,
                        overflow: 'hidden',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 4px 18px rgba(12, 59, 46, 0.04)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--pine-deep)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 14px 32px rgba(12, 59, 46, 0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--card-border)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 18px rgba(12, 59, 46, 0.04)';
                      }}
                      >
                        {/* Upper Card: Portrait Photo filling top half (Figma LMS style) */}
                        <div style={{ height: 210, width: '100%', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={instructorName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'linear-gradient(135deg, rgba(12,59,46,0.18), var(--card-bg))',
                              fontSize: '3rem', fontWeight: 800, color: 'var(--accent)',
                            }}>
                              {instructorName[0]}
                            </div>
                          )}

                          {/* Rate badge */}
                          <div style={{
                            position: 'absolute', bottom: 10, right: 10,
                            background: 'rgba(12, 59, 46, 0.9)', backdropFilter: 'blur(6px)',
                            color: '#ffffff', fontSize: '0.75rem', fontWeight: 700,
                            padding: '4px 10px', borderRadius: 999,
                          }}>
                            {i.hourly_rate || 500} ETB/hr
                          </div>
                        </div>

                        {/* Lower Card: Info (Figma Mentors style) */}
                        <div style={{
                          padding: '1.25rem',
                          background: 'var(--pine-light)',
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                        }}>
                          <h3 style={{
                            fontWeight: 800, fontSize: '1.08rem',
                            color: 'var(--pine-deep)', marginBottom: '0.2rem',
                          }}>
                            {instructorName}
                          </h3>

                          <p style={{
                            color: '#4a6b60', fontSize: '0.84rem',
                            fontWeight: 600, marginBottom: '0.65rem',
                          }}>
                            {specialty}
                          </p>

                          <p style={{
                            color: 'var(--text-secondary)', fontSize: '0.82rem',
                            lineHeight: 1.5, marginBottom: '1rem',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {i.bio || 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.'}
                          </p>

                          {/* Rating & Reviews (Real Data) */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(12, 59, 46, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>
                              <Star size={14} fill="#f59e0b" color="#f59e0b" />
                              <span>{i.avg_rating && Number(i.avg_rating) > 0 ? Number(i.avg_rating).toFixed(1) : i.rating ? Number(i.rating).toFixed(1) : '5.0'}</span>
                              <span style={{ color: '#5f7b70', fontWeight: 500, fontSize: '0.75rem' }}>
                                ({i.reviews_count ?? i.reviews?.length ?? 0} reviews)
                              </span>
                            </div>

                            <span style={{
                              fontSize: '0.78rem', fontWeight: 700,
                              color: 'var(--pine-deep)',
                            }}>
                              Book Session →
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>

              {/* Circular Pagination (from Figma KnowledgePulse) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '3.5rem' }}>
                <button
                  title="Previous Page"
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '1.3rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  ‹
                </button>
                <button
                  title="Next Page"
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '1.3rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  ›
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
