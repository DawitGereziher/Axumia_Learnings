'use client';

import React, { useEffect, useState, useMemo } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Star, Search, SlidersHorizontal, Users, User, GraduationCap, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

const SUBJECT_FILTERS = [
  'All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Python', 'JavaScript', 'Machine Learning',
  'English', 'Economics', 'History',
];

export default function BookSessionPage() {
  const { t } = useLanguage();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [showFilters, setShowFilters] = useState(false);
  const [maxRate, setMaxRate] = useState('');

  useEffect(() => {
    fetch(`${API}/api/users/instructors`)
      .then(r => r.json())
      .then(d => setInstructors(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return instructors.filter(i => {
      const name = `${i.user?.first_name || ''} ${i.user?.last_name || ''}`.toLowerCase();
      const hl = (i.headline || '').toLowerCase();
      const bio = (i.bio || '').toLowerCase();
      const skills: string[] = i.skills || [];
      const query = search.toLowerCase();

      const matchesSearch = !search || name.includes(query) || hl.includes(query) || bio.includes(query) ||
        skills.some((s: string) => s.toLowerCase().includes(query));

      const matchesSubject = subject === 'All Subjects' ||
        skills.some((s: string) => s.toLowerCase().includes(subject.toLowerCase())) ||
        hl.toLowerCase().includes(subject.toLowerCase());

      const rate = Number(i.hourly_rate || 500);
      const matchesRate = !maxRate || rate <= Number(maxRate);

      return matchesSearch && matchesSubject && matchesRate;
    });
  }, [instructors, search, subject, maxRate]);

  const hasFilters = search || subject !== 'All Subjects' || maxRate;

  const clearFilters = () => { setSearch(''); setSubject('All Subjects'); setMaxRate(''); };

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
            {/* Ambient glows */}
            <div style={{ position: 'absolute', top: -100, right: '10%', width: 340, height: 340, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -80, left: '10%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: 760, margin: '0 auto' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.35rem 1.1rem', fontSize: '0.75rem',
                fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '1.25rem',
              }}>
                <GraduationCap size={14} /> P R I V A T E  M E N T O R S H I P
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.15,
                color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
              }}>
                Book a 1-on-1 session with{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                  an expert.
                  <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                  </svg>
                </span>
              </h1>

              <p style={{
                color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
                lineHeight: 1.6, marginBottom: '2rem',
              }}>
                Live interactive video guidance in Amharic, Afaan Oromoo, or English. Learn at your own pace with certified university and industry tutors.
              </p>

              {/* Session type info chips */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                {[
                  { icon: <User size={13} />, label: '1-on-1 Private Mentoring', color: '#fde047', bg: 'rgba(253, 224, 71, 0.15)' },
                  { icon: <Users size={13} />, label: 'Small Group (Save 40%)', color: '#86efac', bg: 'rgba(134, 239, 172, 0.15)' },
                  { icon: <GraduationCap size={13} />, label: 'Group Masterclass (Save 60%)', color: '#93c5fd', bg: 'rgba(147, 197, 253, 0.15)' },
                ].map(c => (
                  <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: c.bg, color: c.color, border: `1px solid ${c.color}40`, borderRadius: 999, padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>

              {/* Search Capsule */}
              <div style={{
                display: 'flex', alignItems: 'center', background: '#ffffff',
                borderRadius: 999, padding: '0.4rem 0.5rem 0.4rem 1.4rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxWidth: 540, margin: '0 auto',
              }}>
                <Search size={18} color="#0c3b2e" style={{ flexShrink: 0, marginRight: '0.75rem' }} />
                <input
                  type="search"
                  placeholder="Search mentors by topic, subject, or name…"
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
                  Find Mentor
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,10,15,0.9)', padding: '0.75rem 0', position: 'sticky', top: 64, zIndex: 10 }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFilters(f => !f)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: showFilters ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${showFilters ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '0.45rem 0.9rem', color: showFilters ? '#818cf8' : '#94a3b8', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <SlidersHorizontal size={14} /> Filters
              {hasFilters && <span style={{ background: '#6366f1', color: '#fff', borderRadius: 999, padding: '0.05rem 0.45rem', fontSize: '0.68rem', fontWeight: 800 }}>!</span>}
            </button>

            {/* Subject pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {SUBJECT_FILTERS.slice(0, 7).map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  style={{
                    padding: '0.35rem 0.85rem', borderRadius: 999, border: '1px solid',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    background: subject === s ? 'rgba(99,102,241,0.15)' : 'transparent',
                    borderColor: subject === s ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                    color: subject === s ? '#818cf8' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '0.4rem 0.75rem', color: '#f87171', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="container" style={{ paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Subjects</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {SUBJECT_FILTERS.slice(7).map(s => (
                    <button key={s} onClick={() => setSubject(s)} style={{ padding: '0.3rem 0.75rem', borderRadius: 999, border: '1px solid', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: subject === s ? 'rgba(99,102,241,0.15)' : 'transparent', borderColor: subject === s ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', color: subject === s ? '#818cf8' : '#64748b', transition: 'all 0.15s' }}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Rate (ETB/hr)</label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={maxRate}
                  onChange={e => setMaxRate(e.target.value)}
                  style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', fontSize: '0.88rem', outline: 'none', width: 160 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Results ──────────────────────────────────────── */}
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem', maxWidth: 1200 }}>

          {/* Result count */}
          {!loading && (
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {filtered.length === 0 ? 'No instructors match your filters' : `${filtered.length} instructor${filtered.length !== 1 ? 's' : ''} found`}
              {hasFilters && <span> · <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>Clear filters</button></span>}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 280, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
              <Search size={48} color="#334155" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#475569', fontWeight: 700 }}>{t.instructors.noInstructors}</h3>
              <p style={{ color: '#334155', fontSize: '0.88rem', marginTop: '0.5rem' }}>Try adjusting your search or removing filters.</p>
              {hasFilters && <button onClick={clearFilters} className="btn-primary" style={{ marginTop: '1.5rem', padding: '0.65rem 1.4rem', borderRadius: 12 }}>Clear Filters</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1.5rem' }}>
              {filtered.map((inst: any) => {
                const avatarUrl = getFullUrl(inst.profile_image || inst.user?.image);
                const rate = Number(inst.hourly_rate || 500);
                const avgRating = inst.avg_rating ? Number(inst.avg_rating).toFixed(1) : null;
                const totalStudents = inst.total_students ?? null;

                return (
                  <div key={inst.id} style={{
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 18, padding: '1.75rem',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    transition: 'transform 0.2s, border-color 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <div>
                      {/* Avatar + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
                          {avatarUrl ? <img src={avatarUrl} alt={inst.user?.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inst.user?.first_name?.[0] || 'I'}
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', margin: 0 }}>
                            {inst.user?.first_name} {inst.user?.last_name}
                          </h3>
                          <div style={{ color: '#818cf8', fontSize: '0.82rem', fontWeight: 500, marginTop: '0.1rem' }}>
                            {inst.headline || t.instructors.verified}
                          </div>
                        </div>
                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.55, marginBottom: '1rem' }}>
                        {inst.bio ? (inst.bio.length > 110 ? `${inst.bio.slice(0, 110)}…` : inst.bio) : 'Experienced tutor ready to accelerate your learning journey.'}
                      </p>

                      {/* Skills tags */}
                      {inst.skills?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {inst.skills.slice(0, 4).map((sk: string) => (
                            <span key={sk} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 6, padding: '0.18rem 0.55rem', fontSize: '0.72rem', fontWeight: 600 }}>{sk}</span>
                          ))}
                          {inst.skills.length > 4 && <span style={{ color: '#475569', fontSize: '0.72rem', alignSelf: 'center' }}>+{inst.skills.length - 4}</span>}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {avgRating ? (
                            <span style={{ color: '#f59e0b', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                              <Star size={14} fill="#f59e0b" color="#f59e0b" /> {avgRating}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>New</span>
                          )}
                          {totalStudents !== null && totalStudents > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#475569' }}>{totalStudents} student{totalStudents !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>
                          {rate.toLocaleString()} {t.instructors.perHour}
                        </span>
                      </div>

                      <Link href={`/book-session/${inst.user_id}`} className="btn-primary" style={{ display: 'block', textAlign: 'center', padding: '0.65rem 1rem', fontSize: '0.875rem', borderRadius: 999, fontWeight: 700, textDecoration: 'none', background: 'var(--pine-deep)' }}>
                        {t.instructors.bookSessionBtn}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </PageTemplate>
  );
}
