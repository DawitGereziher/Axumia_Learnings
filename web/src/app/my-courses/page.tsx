'use client';

import React, { useState, useEffect } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authFetch, getAccessToken } from '@/lib/auth';
import {
  BookOpen,
  PlayCircle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Star,
} from 'lucide-react';
import SessionReviewModal from '@/components/reviews/SessionReviewModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const domain =
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ||
    'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function StudentMyLearningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (authLoading) return;
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      authFetch('/api/users/me/purchases').then((res) => (res.ok ? res.json() : [])),
      authFetch('/api/bookings/my-bookings').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([purchasesData, bookingsData]) => {
        setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      })
      .catch((err) => {
        console.error('Error fetching student learning hub data:', err);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  // Compute stats
  const totalCourses = purchases.length;
  const completedCourses = purchases.filter((p) => {
    const pct = typeof p.completion_pct === 'number' ? p.completion_pct : (p.progress || 0);
    return pct >= 100 || p.completed === true;
  });
  const inProgressCourses = purchases.filter((p) => {
    const pct = typeof p.completion_pct === 'number' ? p.completion_pct : (p.progress || 0);
    return pct < 100 && !p.completed;
  });

  const filteredPurchases = purchases.filter((p) => {
    const pct = typeof p.completion_pct === 'number' ? p.completion_pct : (p.progress || 0);
    const isDone = pct >= 100 || p.completed === true;
    if (filter === 'completed') return isDone;
    if (filter === 'in_progress') return !isDone;
    return true;
  });

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
          {/* Ambient glows */}
          <div style={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, left: '20%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ maxWidth: 650 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.35rem 1.1rem', fontSize: '0.75rem',
                fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '1.25rem',
              }}>
                <Sparkles size={14} /> M Y  L E A R N I N G  H U B
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2rem, 3.8vw, 3rem)', lineHeight: 1.15,
                color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
              }}>
                Welcome back. Keep your{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                  momentum going.
                  <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                  </svg>
                </span>
              </h1>

              <p style={{
                color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.05rem)',
                lineHeight: 1.6,
              }}>
                Pick up where you left off, access lesson resources, and join scheduled 1-on-1 video mentoring sessions.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.18)',
                padding: '1.25rem 1.75rem', borderRadius: 24, textAlign: 'center', minWidth: 130,
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{totalCourses}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enrolled</div>
              </div>
              <div style={{
                background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.3)',
                padding: '1.25rem 1.75rem', borderRadius: 24, textAlign: 'center', minWidth: 130,
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fde047', lineHeight: 1 }}>{completedCourses.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#fde047', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem', flex: 1 }}>

        {/* Upcoming Tutoring Sessions Widget */}
        {bookings.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(12, 59, 46, 0.12), rgba(21, 128, 90, 0.12))',
            border: '1px solid rgba(12, 59, 46, 0.25)',
            borderRadius: 20, padding: '1.5rem', marginBottom: '2.5rem',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent)" /> Upcoming Live Sessions ({bookings.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {bookings.map((b) => (
                <div key={b.id} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1rem' }}>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                    {b.instructor?.user ? `${b.instructor.user.first_name} ${b.instructor.user.last_name}` : 'Private Tutoring Session'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.85rem' }}>
                    <Clock size={13} /> {new Date(b.scheduled_at).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {b.meeting_link ? (
                      <a href={b.meeting_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 8, fontWeight: 700 }}>
                        <ExternalLink size={13} /> Join Live Room
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.25rem 0.6rem', borderRadius: 6 }}>
                        Meeting link will be sent soon
                      </span>
                    )}

                    <button
                      onClick={() => setReviewingBooking(b)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: 8,
                        background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#818cf8', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Star size={13} fill="#818cf8" /> Rate Teacher Style
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', padding: 4, borderRadius: 12 }}>
            {[
              { id: 'all', label: `All Courses (${totalCourses})` },
              { id: 'in_progress', label: `In Progress (${inProgressCourses.length})` },
              { id: 'completed', label: `Completed (${completedCourses.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: 9, border: 'none',
                  fontSize: '0.85rem', fontWeight: filter === tab.id ? 700 : 500,
                  background: filter === tab.id ? '#4f46e5' : 'transparent',
                  color: filter === tab.id ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 320, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '5rem 2rem',
            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
          }}>
            <BookOpen size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
              No courses match this filter
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {filter === 'all'
                ? "You haven't enrolled in any courses yet. Browse our catalog to start learning!"
                : 'Try switching to another tab or browse new courses.'}
            </p>
            <Link href="/courses" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              Browse Course Catalog
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {filteredPurchases.map((purchase) => {
              const course = purchase.course;
              if (!course) return null;

              const progressPct = typeof purchase.completion_pct === 'number'
                ? Math.round(purchase.completion_pct)
                : typeof purchase.progress === 'number'
                ? Math.round(purchase.progress)
                : purchase.completed ? 100 : 0;
              const isCompleted = progressPct >= 100 || purchase.completed;

              return (
                <div key={purchase.id} style={{
                  background: 'rgba(15,23,42,0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {/* Thumbnail & Level */}
                  <div style={{ height: 150, background: 'rgba(30,41,59,0.8)', position: 'relative' }}>
                    <img
                      src={getFullUrl(course.thumbnail_url || course.thumbnail) || '/placeholder-course.jpg'}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(15,23,42,0.9)', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>
                      {course.level || 'Course'}
                    </div>
                  </div>

                  {/* Body & Progress Bar */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.title}
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        Instructor: {course.instructor?.user ? `${course.instructor.user.first_name} ${course.instructor.user.last_name}` : 'Expert Mentor'}
                      </p>

                      {/* Progress bar */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                          <span>{isCompleted ? 'Completed 🎉' : 'Course Progress'}</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${progressPct}%`,
                            background: isCompleted ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #4f46e5, #818cf8)',
                            borderRadius: 999, transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <Link
                        href={`/courses/${course.slug || course.id}/learn`}
                        className="btn-primary"
                        style={{
                          flex: 1, textAlign: 'center', padding: '0.6rem 0.85rem',
                          fontSize: '0.85rem', fontWeight: 700, borderRadius: 10,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                        }}
                      >
                        <PlayCircle size={15} /> Continue
                      </Link>

                      {isCompleted && (
                        <a
                          href={`${API}/api/certificates/${course.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '0.6rem 0.85rem', background: 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
                            color: '#34d399', fontSize: '0.82rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none',
                          }}
                        >
                          <Award size={15} /> Certificate
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {reviewingBooking && (
          <SessionReviewModal
            isOpen={!!reviewingBooking}
            onClose={() => setReviewingBooking(null)}
            bookingId={reviewingBooking.id}
            instructorName={
              reviewingBooking.instructor?.user
                ? `${reviewingBooking.instructor.user.first_name} ${reviewingBooking.instructor.user.last_name}`
                : 'Instructor'
            }
          />
        )}
      </div>
    </PageTemplate>
  );
}
