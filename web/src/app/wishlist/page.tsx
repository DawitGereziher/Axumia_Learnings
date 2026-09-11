'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { Heart, BookOpen, ArrowRight, X, Star, Users, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, overflow: 'hidden',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 170, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.07)', borderRadius: 6, width: '75%' }} />
        <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, width: '50%' }} />
        <div style={{ height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 6, width: '35%' }} />
        <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginTop: '0.25rem' }} />
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(() => {
    setLoading(true);
    authFetch('/api/courses/wishlist/mine')
      .then(res => res.ok ? res.json() : [])
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemove = async (courseId: string) => {
    setRemovingId(courseId);
    try {
      const res = await authFetch(`/api/courses/${courseId}/wishlist`, { method: 'DELETE' });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== courseId));
      }
    } catch { /* silent */ }
    finally { setRemovingId(null); }
  };

  return (
    <PageTemplate fullWidth={true}>
      {/* ── Figma Hero Banner Container ────────────────────────── */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
        <div style={{
          background: 'var(--pine-deep)',
          borderRadius: 28,
          padding: 'clamp(2.5rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3.5rem)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, left: '20%', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.35rem 1.1rem', fontSize: '0.75rem',
                fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '1.25rem',
              }}>
                <Heart size={14} fill="#fde047" /> S A V E D  C O U R S E S
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2rem, 3.8vw, 3rem)', lineHeight: 1.15,
                color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
              }}>
                Your personal{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                  learning wishlist.
                  <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                  </svg>
                </span>
                {!loading && courses.length > 0 && (
                  <span style={{ fontSize: '1.1rem', color: '#fde047', fontWeight: 700, marginLeft: '0.75rem' }}>({courses.length})</span>
                )}
              </h1>

              <p style={{
                color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.05rem)',
                lineHeight: 1.6,
              }}>
                Bookmarked programs you want to master next. Compare lesson plans, review student feedback, and enroll anytime.
              </p>
            </div>

            <Link
              href="/courses"
              className="btn-primary"
              style={{
                padding: '0.85rem 2rem', borderRadius: 999, fontWeight: 800,
                fontSize: '0.92rem', background: '#fde047', color: '#0c3b2e',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                textDecoration: 'none', border: 'none',
              }}
            >
              <BookOpen size={16} /> Browse Course Catalog →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {courses.map(course => {
              const thumb = getFullUrl(course.thumbnail || course.cover_image);
              const price = Number(course.price || 0);
              const rating = course.avg_rating ? Number(course.avg_rating).toFixed(1) : null;
              const students = course._count?.purchases ?? course.total_students ?? null;
              const isRemoving = removingId === course.id;

              return (
                <div key={course.id} className="course-card-lms" style={{ opacity: isRemoving ? 0.5 : 1 }}>
                  {/* Thumbnail */}
                  <div className="course-thumb-wrap" style={{ height: 170 }}>
                    {thumb ? (
                      <img className="course-thumb-img" src={thumb} alt={course.title} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>📚</div>
                    )}
                    {/* Remove button overlay */}
                    <button
                      onClick={() => handleRemove(course.id)}
                      disabled={isRemoving}
                      title="Remove from wishlist"
                      style={{
                        position: 'absolute', top: '0.65rem', right: '0.65rem',
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#f87171', cursor: isRemoving ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s',
                        zIndex: 2,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.75)')}
                    >
                      {isRemoving
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <X size={14} />}
                    </button>
                    {/* Price badge */}
                    <div className="course-card-price" style={{
                      position: 'absolute', bottom: '0.65rem', left: '0.65rem',
                      background: price === 0 ? 'rgba(16,185,129,0.92)' : 'var(--pine-deep)',
                      color: '#fff', borderRadius: 999, padding: '0.25rem 0.75rem',
                      fontSize: '0.78rem', fontWeight: 700, backdropFilter: 'blur(8px)',
                      zIndex: 2,
                    }}>
                      {price === 0 ? 'Free' : `${price.toLocaleString()} ETB`}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1.1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                    <h3 className="course-card-title" style={{ fontWeight: 800, fontSize: '0.97rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
                      {course.title}
                    </h3>
                    {course.instructor?.user && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        by {course.instructor.user.first_name} {course.instructor.user.last_name}
                      </div>
                    )}

                    {/* Rating + Students */}
                    {(rating || students) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem' }}>
                        {rating && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 700 }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" /> {rating}
                          </span>
                        )}
                        {students !== null && students > 0 && (
                          <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Users size={11} /> {students.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      href={`/courses/${course.slug || course.id}`}
                      style={{
                        textAlign: 'center', display: 'block', padding: '0.65rem 1rem',
                        fontSize: '0.85rem', borderRadius: 999, fontWeight: 700,
                        textDecoration: 'none', marginTop: 'auto',
                        background: 'var(--pine-deep)', color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(12, 59, 46, 0.2)',
                      }}
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 24, padding: '4rem 2rem', textAlign: 'center', maxWidth: 540, margin: '0 auto',
          }}>
            <Heart size={48} color="#f87171" style={{ margin: '0 auto 1.25rem', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              Your wishlist is empty
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              Explore our catalog of courses and click the heart icon to save items for later.
            </p>
            <Link href="/courses" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
              <BookOpen size={16} /> Explore Catalog <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </PageTemplate>
  );
}
