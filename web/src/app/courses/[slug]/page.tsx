'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReviewStats from '@/components/reviews/ReviewStats';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';
import ProtectedYouTubePlayer from '@/components/ProtectedYouTubePlayer';
import {
  Star,
  Play,
  CheckCircle2,
  ShieldCheck,
  Award,
  Clock,
  BookOpen,
  Globe,
  Users,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  Calendar,
  Sparkles,
  Download,
  AlertCircle,
  X,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function uuidToString(uuid: any): string {
  if (!uuid) return '';
  if (typeof uuid === 'string') return uuid;
  if (typeof uuid === 'object') {
    if (uuid.type === 'Buffer' && Array.isArray(uuid.data)) {
      const hex = uuid.data.map((b: number) => b.toString(16).padStart(2, '0')).join('');
      if (hex.length === 32) {
        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20, 32),
        ].join('-');
      }
      return hex;
    }
    if (uuid.id) return uuidToString(uuid.id);
  }
  return String(uuid);
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CourseSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { user } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // Video player modal / inline state
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Accordion state for course sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isOwnerOrAdmin = user && course && (
    user.role === 'admin' ||
    user.id === course.instructor?.user_id ||
    user.id === course.instructor?.user?.id
  );

  const [purchaseVerified, setPurchaseVerified] = useState(false);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`${API}/api/courses/${slug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Course not found');
      setCourse(data);

      // Open all sections by default if sections exist
      if (data.sections && data.sections.length > 0) {
        const initial: Record<string, boolean> = {};
        data.sections.forEach((sec: any) => { initial[sec.id] = true; });
        setOpenSections(initial);
      }

      if (user && data.id) {
        const courseId = uuidToString(data.id);
        authFetch(`/api/courses/${courseId}/check-purchase`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) setPurchased(d.purchased);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [slug, user]);

  useEffect(() => {
    if (!purchaseVerified && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('enrolled') === '1') {
        setPurchaseVerified(true);
        window.history.replaceState({}, '', window.location.pathname);
        if (user && course?.id) {
          const courseId = uuidToString(course.id);
          authFetch(`/api/courses/${courseId}/check-purchase`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setPurchased(d.purchased); })
            .catch(() => {});
        }
      }
    }
  }, [course, user]);

  const handleEnroll = async () => {
    if (!user) { router.push('/login'); return; }
    setBuying(true);
    setError('');
    try {
      const courseId = uuidToString(course.id);
      const isFree = Number(course.price) === 0;

      if (isFree) {
        const res = await authFetch(`/api/courses/${courseId}/enroll-free`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Enrollment failed');
        setPurchased(true);
        setBuying(false);
        return;
      }

      const res = await authFetch(`/api/payments/courses/${courseId}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment initiation failed');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setBuying(false);
    }
  };

  const handleDownloadMaterial = async (materialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/courses/materials/${materialId}/download-url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not fetch download link');
      window.open(data.url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Error downloading material');
    }
  };

  const handlePlayLesson = async (lesson: any) => {
    if (!purchased && !isOwnerOrAdmin && !lesson.is_free_preview) {
      setError('Enroll in this course to unlock all lessons.');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setActiveLesson(lesson);
    setLoadingVideo(true);
    setShowVideoModal(true);
    setError('');
    try {
      const lessonId = uuidToString(lesson.id);
      const res = await authFetch(`/api/courses/lessons/${lessonId}/video-url`);
      const data = await res.json();
      if (!res.ok) throw new Error('Could not load video player URL');
      setVideoUrl(data.url);
      setContentType(data.content_type || lesson.content_type || 'video');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingVideo(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #16a34a', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main>
        <Navbar />
        <div className="container section" style={{ paddingTop: 120, textAlign: 'center' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '2rem', maxWidth: 500, margin: '0 auto' }}>
            <AlertCircle size={36} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Course Not Found</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
            <Link href="/courses" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              Browse Courses
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const instructorUser = course.instructor?.user || {};
  const instructorName = `${instructorUser.first_name || ''} ${instructorUser.last_name || ''}`.trim() || 'Verified Instructor';
  const totalLessons = course.lessons?.length || 0;
  const freePreviewLesson = course.lessons?.find((l: any) => l.is_free_preview) || course.lessons?.[0];

  // Group lessons by section
  const sections = course.sections || [];
  const lessonsBySection: Record<string, any[]> = {};
  const unsectionedLessons: any[] = [];

  (course.lessons || []).forEach((lesson: any) => {
    if (lesson.section_id) {
      if (!lessonsBySection[lesson.section_id]) lessonsBySection[lesson.section_id] = [];
      lessonsBySection[lesson.section_id].push(lesson);
    } else {
      unsectionedLessons.push(lesson);
    }
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ══════════════════════════════════════════════════════════════════
          FIGMA PINE GREEN HERO BANNER (Full-Bleed Deep Pine Header)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, var(--pine-dark) 0%, var(--pine-deep) 100%)',
        color: '#ffffff',
        paddingTop: '90px',
        paddingBottom: '3.5rem',
        position: 'relative',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>
            
            {/* Left Hero Details */}
            <div>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
                <span>/</span>
                <Link href="/courses" style={{ color: '#94a3b8', textDecoration: 'none' }}>Courses</Link>
                <span>/</span>
                <span style={{ color: '#fde047', fontWeight: 600 }}>{course.category?.name || course.level || 'General'}</span>
              </div>

              {/* Course Title */}
              <h1 style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                lineHeight: 1.2,
                color: '#ffffff',
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
              }}>
                {course.title}
              </h1>

              {/* Subtitle / Short Description */}
              <p style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                maxWidth: 680,
              }}>
                {course.description || 'Master key practical skills with hands-on lessons, downloadable materials, and direct instructor support.'}
              </p>

              {/* Badges & Rating Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {/* Level Pill */}
                <span style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: '#ffffff',
                  padding: '0.25rem 0.85rem',
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {course.level || 'All Levels'}
                </span>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontWeight: 700 }}>
                  <span>{course.avgRating && Number(course.avgRating) > 0 ? Number(course.avgRating).toFixed(1) : 'New'}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={14}
                        fill={course.avgRating && i <= Math.round(Number(course.avgRating)) ? '#fbbf24' : 'none'}
                        color="#fbbf24"
                      />
                    ))}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, fontSize: '0.82rem' }}>
                    ({course._count?.reviews || 0} reviews)
                  </span>
                </div>

                {/* Student Count */}
                <div style={{ color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Users size={15} color="#86efac" />
                  <span>{course._count?.purchases || 48} students enrolled</span>
                </div>
              </div>

              {/* Instructor & Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
                <div>
                  Created by <Link href={`/instructors/${course.instructor?.id || ''}`} style={{ color: '#fde047', fontWeight: 600, textDecoration: 'none' }}>{instructorName}</Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={14} color="#8d9196" />
                  <span>{course.language === 'am' ? 'Amharic' : 'English'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} color="#8d9196" />
                  <span>{totalLessons} lessons ({course.estimated_hours || 6} hours)</span>
                </div>
              </div>

            </div>

            {/* Empty space placeholder for overlapping right sticky card */}
            <div style={{ minHeight: 10 }} />

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN BODY LAYOUT (2 Columns + Sticky Udemy Card)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '2.5rem 0 5rem', flex: 1 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', position: 'relative' }}>

            {/* LEFT COLUMN — Course Detailed Info */}
            <div style={{ minWidth: 0 }}>
              
              {/* Error Notice */}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.85rem 1.25rem', color: '#fca5a5', marginBottom: '2rem', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              {/* What You'll Learn Card */}
              <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Sparkles size={20} color="var(--accent)" /> What you&apos;ll learn in this course
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}>
                  {(course.learning_objectives?.length > 0
                    ? course.learning_objectives
                    : [
                        'Master fundamental concepts and real-world application techniques',
                        'Build practical projects to showcase in your personal portfolio',
                        'Learn industry best practices directly from certified instructors',
                        'Gain lifetime access to downloadable resources and exercise files',
                      ]
                  ).map((item: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Content / Accordion */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem' }}>
                      Course content
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {sections.length > 0 ? `${sections.length} sections • ` : ''}{totalLessons} lessons
                    </p>
                  </div>

                  {sections.length > 0 && (
                    <button
                      onClick={() => {
                        const allOpen = Object.values(openSections).every(Boolean);
                        const nextState: Record<string, boolean> = {};
                        sections.forEach((sec: any) => { nextState[sec.id] = !allOpen; });
                        setOpenSections(nextState);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {Object.values(openSections).every(Boolean) ? 'Collapse all sections' : 'Expand all sections'}
                    </button>
                  )}
                </div>

                {!totalLessons ? (
                  <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No lessons published for this course yet.
                  </div>
                ) : sections.length > 0 ? (
                  /* Render Sections Accordion */
                  <div style={{ border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
                    {sections.map((section: any, idx: number) => {
                      const secLessons = lessonsBySection[section.id] || [];
                      const isOpen = openSections[section.id] ?? true;
                      return (
                        <div key={section.id} style={{ borderBottom: idx < sections.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                          {/* Section Header */}
                          <button
                            onClick={() => toggleSection(section.id)}
                            style={{
                              width: '100%',
                              padding: '1rem 1.25rem',
                              background: 'var(--bg-secondary)',
                              border: 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                                Section {idx + 1}: {section.title}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {secLessons.length} lessons
                            </span>
                          </button>

                          {/* Section Lessons */}
                          {isOpen && (
                            <div style={{ background: 'var(--bg-primary)' }}>
                              {secLessons.map((l: any, lIdx: number) => {
                                const isUnlocked = purchased || isOwnerOrAdmin || l.is_free_preview;
                                return (
                                  <div
                                    key={l.id}
                                    onClick={() => isUnlocked && handlePlayLesson(l)}
                                    style={{
                                      padding: '0.85rem 1.25rem 0.85rem 2.75rem',
                                      borderTop: '1px solid var(--card-border)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: isUnlocked ? 'pointer' : 'default',
                                      transition: 'background 0.15s ease',
                                    }}
                                    className="lesson-item-hover"
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      {isUnlocked ? (
                                        <Play size={15} color="#16a34a" fill="#16a34a" />
                                      ) : (
                                        <Lock size={15} color="#8d9196" />
                                      )}
                                      <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                          {lIdx + 1}. {l.title}
                                        </div>
                                        {l.description && (
                                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {l.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      {l.is_free_preview && !purchased && !isOwnerOrAdmin && (
                                        <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                                          Preview
                                        </span>
                                      )}
                                      {l.duration_s && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                          {formatDuration(l.duration_s)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat Lesson List if no sections */
                  <div style={{ border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
                    {unsectionedLessons.map((l: any, idx: number) => {
                      const isUnlocked = purchased || isOwnerOrAdmin || l.is_free_preview;
                      return (
                        <div
                          key={l.id}
                          onClick={() => isUnlocked && handlePlayLesson(l)}
                          style={{
                            padding: '1rem 1.25rem',
                            borderBottom: idx < unsectionedLessons.length - 1 ? '1px solid var(--card-border)' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: isUnlocked ? 'pointer' : 'default',
                            background: 'var(--bg-primary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isUnlocked ? (
                              <Play size={16} color="#16a34a" fill="#16a34a" />
                            ) : (
                              <Lock size={16} color="#8d9196" />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                                {idx + 1}. {l.title}
                              </div>
                              {l.description && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{l.description}</div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {l.is_free_preview && !purchased && !isOwnerOrAdmin && (
                              <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Preview</span>
                            )}
                            {l.duration_s && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDuration(l.duration_s)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Requirements & Description */}
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', marginBottom: '1rem' }}>
                  Requirements
                </h2>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '2.5rem' }}>
                  {(course.prerequisites?.length > 0
                    ? course.prerequisites
                    : ['No prior programming or specialized experience required.', 'A laptop or mobile phone with an internet connection.', 'Eagerness to practice hands-on exercises.']
                  ).map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>

                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', marginBottom: '1rem' }}>
                  Description
                </h2>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                  {course.description || 'This comprehensive course provides step-by-step guidance tailored for learners. You will gain practical skills, real-world insight, and project experience.'}
                </div>
              </div>

              {/* Instructor Bio Card */}
              <div className="card" style={{ padding: '2rem', marginBottom: '3rem', borderRadius: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.35rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                  Meet your instructor
                </h2>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', flexShrink: 0,
                  }}>
                    {instructorUser.image ? (
                      <img src={instructorUser.image} alt={instructorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      instructorName[0] || 'I'
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Link href={`/instructors/${course.instructor?.id || ''}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>{instructorName}</h3>
                    </Link>
                    <p style={{ color: 'var(--accent)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {course.instructor?.headline || 'Certified Instructor & Tutor'}
                    </p>

                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        <span>
                          {course.instructor?.avg_rating && Number(course.instructor.avg_rating) > 0
                            ? Number(course.instructor.avg_rating).toFixed(1)
                            : course.instructor?.rating && Number(course.instructor.rating) > 0
                            ? Number(course.instructor.rating).toFixed(1)
                            : '5.0'}{' '}
                          Instructor Rating
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={14} color="#16a34a" />
                        <span>{course.instructor?.total_students || 120}+ Students</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={14} color="#8d9196" />
                        <span>{course.instructor?.courses?.length || 3} Courses</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                      {course.instructor?.bio || 'Dedicated educator focused on empowering students through clear, practical, and project-based learning.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Reviews Section */}
              <div style={{ marginTop: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', margin: 0 }}>
                    Student Reviews
                  </h2>
                  {!showReviewForm && !userHasReviewed && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: 999,
                        background: 'var(--pine-light)',
                        border: '1px solid rgba(12, 59, 46, 0.25)',
                        color: 'var(--pine-deep)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Star size={15} fill="var(--pine-deep)" color="var(--pine-deep)" />
                      Write a Review
                    </button>
                  )}
                </div>
                
                {course?.id && (
                  <>
                    {showReviewForm ? (
                      <ReviewForm
                        courseId={course.id}
                        onSuccess={() => {
                          setShowReviewForm(false);
                          setUserHasReviewed(true);
                          fetchCourse();
                        }}
                        onCancel={() => setShowReviewForm(false)}
                      />
                    ) : (
                      <>
                        <ReviewStats courseId={course.id} />
                        <ReviewList
                          courseId={course.id}
                          showWriteReview={true}
                          onWriteReview={() => setShowReviewForm(true)}
                          userHasReviewed={userHasReviewed}
                        />
                      </>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN — Floating Sticky Udemy Sidebar Card */}
            <div>
              <div className="card" style={{
                position: 'sticky',
                top: '95px',
                marginTop: '-210px', // Pull up into top dark banner like Udemy!
                zIndex: 30,
                padding: '0',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
              }}>
                
                {/* Course Thumbnail / Video Preview Box */}
                <div
                  onClick={() => freePreviewLesson && handlePlayLesson(freePreviewLesson)}
                  style={{
                    position: 'relative',
                    height: 200,
                    background: '#0c3b2e',
                    cursor: freePreviewLesson ? 'pointer' : 'default',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={course.thumbnail_url || course.thumbnail || '/assets/hero-course-cover1.jpg'}
                    onError={(e) => { e.currentTarget.src = '/assets/hero-course-cover2.jpg'; }}
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}>
                      <Play size={24} color="#0c3b2e" fill="#0c3b2e" style={{ marginLeft: 3 }} />
                    </div>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      Preview this course
                    </span>
                  </div>
                </div>

                {/* Pricing & CTA Card Body */}
                <div style={{ padding: '1.75rem' }}>
                  
                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                      {Number(course.price) === 0 ? 'Free' : `${Number(course.price).toLocaleString()} ETB`}
                    </span>
                    {Number(course.price) > 0 && (
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        {(Number(course.price) * 1.3).toFixed(0)} ETB
                      </span>
                    )}
                  </div>

                  {/* Main Action Button */}
                  {isOwnerOrAdmin ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: 'rgba(12,59,46,0.12)', border: '1px solid rgba(12,59,46,0.3)', borderRadius: 999, padding: '0.6rem', color: 'var(--accent)', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem' }}>
                        ★ Creator / Admin Access
                      </div>
                      <button
                        onClick={() => router.push(`/instructor/courses/${course.id}`)}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem' }}
                      >
                        Manage Course & Lessons ⚙
                      </button>
                    </div>
                  ) : purchased ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: 'rgba(12,59,46,0.12)', border: '1px solid rgba(12,59,46,0.3)', borderRadius: 999, padding: '0.6rem', color: 'var(--accent)', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem' }}>
                        ✓ Enrolled in this course
                      </div>
                      <a
                        href={`/courses/${slug}/learn`}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}
                      >
                        ▶ Go to Course Player
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <button
                        onClick={handleEnroll}
                        disabled={buying}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}
                      >
                        {buying ? 'Processing…' : Number(course.price) === 0 ? 'Enroll Free Now' : 'Enroll Now'}
                      </button>
                    </div>
                  )}

                  {/* Guarantee notice */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    <ShieldCheck size={15} color="#16a34a" />
                    <span>30-Day Money-Back & Escrow Guarantee</span>
                  </div>

                  {/* Course Includes Checklist */}
                  <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.85rem' }}>
                      This course includes:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Clock size={15} color="#16a34a" />
                        <span>{course.estimated_hours || 6} hours on-demand video</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={15} color="#16a34a" />
                        <span>{totalLessons} lessons & downloadable materials</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Globe size={15} color="#16a34a" />
                        <span>Full lifetime access</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Award size={15} color="#16a34a" />
                        <span>Certificate of completion</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          VIDEO PLAYER MODAL (for Free Preview or Lesson Play)
          ══════════════════════════════════════════════════════════════════ */}
      {showVideoModal && activeLesson && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            background: '#09090b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16, width: '100%', maxWidth: 900, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.5rem', background: '#1c1d1f', borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff',
            }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={18} color="#4ade80" fill="#4ade80" />
                <span>{activeLesson.title}</span>
              </div>
              <button
                onClick={() => { setShowVideoModal(false); setActiveLesson(null); setVideoUrl(null); }}
                style={{ background: 'transparent', border: 'none', color: '#8d9196', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Player Container */}
            <div style={{ background: '#000000', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loadingVideo ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading stream...</div>
              ) : videoUrl ? (
                contentType === 'youtube' ? (
                  <ProtectedYouTubePlayer
                    videoUrl={videoUrl}
                    title={activeLesson.title}
                    style={{ height: 500 }}
                  />
                ) : contentType === 'embedded' ? (
                  <div dangerouslySetInnerHTML={{ __html: videoUrl }} style={{ width: '100%' }} />
                ) : (
                  <video src={videoUrl} controls autoPlay style={{ width: '100%', maxHeight: 500 }} />
                )
              ) : (
                <div style={{ color: '#fca5a5' }}>Unable to load video.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
