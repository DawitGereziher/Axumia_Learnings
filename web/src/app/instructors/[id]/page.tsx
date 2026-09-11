'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  Star,
  BookOpen,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Globe,
  Sparkles,
  MessageSquare,
  UserPlus,
  UserCheck,
  X,
  Send,
  Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const domain =
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ||
    'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function InstructorPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/api/users/instructors/${id}/public`)
      .then((res) => {
        if (!res.ok) throw new Error('Instructor not found');
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        // Fetch follow status
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        fetch(`${API}/api/users/instructors/${id}/follow-status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((fData) => {
            if (fData) {
              setFollowing(fData.following);
              setFollowerCount(fData.followerCount);
            }
          })
          .catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleFollow = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      const res = await fetch(`${API}/api/users/instructors/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setFollowerCount(data.followerCount);
      }
    } catch {}
    finally {
      setFollowLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    if (!reviewRating) return;

    setSubmittingReview(true);
    setReviewError('');
    try {
      const res = await fetch(`${API}/api/users/instructors/${profile.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
          course_id: selectedCourseId || profile.courses?.[0]?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      const newReview = data.review || data;
      // Refresh profile to pull recalculated ratings and counts cleanly
      fetch(`${API}/api/users/instructors/${id}/public`)
        .then((r) => r.json())
        .then((updated) => {
          if (updated && !updated.error) setProfile(updated);
        })
        .catch(() => {});

      setReviewSuccess(true);
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess(false);
        setReviewComment('');
      }, 1400);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Navbar />
        <div className="container" style={{ paddingTop: 140, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1.5rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading instructor profile...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Navbar />
        <div className="container" style={{ paddingTop: 140, textAlign: 'center', maxWidth: 500 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}>Instructor Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            The instructor profile you are looking for does not exist or has been removed.
          </p>
          <Link href="/instructors" style={{
            display: 'inline-flex', padding: '0.75rem 1.6rem',
            background: 'var(--pine-deep)', color: '#ffffff',
            borderRadius: 999, fontWeight: 700, textDecoration: 'none',
          }}>
            Browse All Instructors
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`.trim() || 'Instructor';
  const avatarUrl = getFullUrl(profile.profile_image || profile.user?.image);
  const coverUrl = getFullUrl(profile.cover_image);
  const isKycApproved = profile.kyc_status === 'approved';

  const totalStudents = profile.courses?.reduce((acc: number, c: any) => acc + (c._count?.purchases || 0), 0) || 0;
  const ratingNum = profile.avg_rating && Number(profile.avg_rating) > 0
    ? Number(profile.avg_rating).toFixed(1)
    : profile.rating && Number(profile.rating) > 0
    ? Number(profile.rating).toFixed(1)
    : '5.0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Figma Hero Banner & Cover ───────────────────────────────────── */}
      <div style={{ position: 'relative', paddingTop: 64 }}>
        {/* Cover image or Deep Forest Pine gradient */}
        <div style={{
          height: 240,
          background: coverUrl
            ? `url(${coverUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0c3b2e 0%, #155d49 60%, #1d7e63 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative ambient elements */}
          <div style={{ position: 'absolute', top: -60, right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.1)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', pointerEvents: 'none' }} />
        </div>

        <div className="container" style={{ marginTop: -75, paddingBottom: '2.5rem', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              
              {/* Avatar & Main Titles */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  border: '4px solid var(--bg-primary)',
                  background: 'var(--pine-light)',
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(12, 59, 46, 0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.8rem', fontWeight: 800, color: 'var(--pine-deep)',
                  flexShrink: 0,
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    fullName[0]
                  )}
                </div>

                <div style={{ marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                      {fullName}
                    </h1>
                    {isKycApproved && (
                      <span title="KYC Verified Instructor" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--pine-light)', border: '1px solid rgba(12, 59, 46, 0.18)',
                        color: 'var(--pine-deep)', fontSize: '0.75rem', fontWeight: 700,
                        padding: '0.25rem 0.75rem', borderRadius: 999,
                      }}>
                        <CheckCircle2 size={13} color="var(--pine-deep)" /> Verified Expert
                      </span>
                    )}
                  </div>

                  <p style={{ color: 'var(--accent)', fontSize: '1.05rem', fontWeight: 700, marginTop: '0.3rem' }}>
                    {profile.headline || 'Certified Senior Instructor & Mentor'}
                  </p>
                </div>
              </div>

              {/* Book CTA & Follow Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {profile.hourly_rate && (
                  <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>1-on-1 Rate</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--pine-deep)' }}>
                      {profile.hourly_rate} ETB <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ hr</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  style={{
                    padding: '0.75rem 1.4rem', fontSize: '0.9rem', fontWeight: 700,
                    borderRadius: 999, cursor: 'pointer', transition: 'all 0.2s ease',
                    background: following ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
                    border: following ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--card-border)',
                    color: following ? '#ef4444' : 'var(--text-primary)',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  {following ? <UserCheck size={17} /> : <UserPlus size={17} />}
                  {following ? 'Following' : 'Follow'}
                </button>

                <Link
                  href={`/book-session?instructorId=${profile.id}`}
                  style={{
                    padding: '0.75rem 1.6rem', fontSize: '0.92rem', fontWeight: 700,
                    borderRadius: 999, background: 'var(--pine-deep)', color: '#ffffff',
                    boxShadow: '0 6px 20px rgba(12, 59, 46, 0.22)',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    textDecoration: 'none', transition: 'all 0.2s ease',
                  }}
                >
                  <Calendar size={17} /> Book 1-on-1 Session
                </Link>
              </div>
            </div>

            {/* Stats bar */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem',
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 20, padding: '1.25rem 1.75rem',
              boxShadow: '0 4px 18px rgba(12, 59, 46, 0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <Star size={20} fill="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ratingNum} / 5.0</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Instructor Rating</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--pine-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pine-deep)' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{followerCount.toLocaleString()}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Followers</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(12, 59, 46, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pine-deep)' }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.courses?.length || 0}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Courses Taught</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Award size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.experience_years || 5}+ Years</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Teaching Experience</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: '5rem', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: '2.5rem' }}>

          {/* Left Column: Bio, Courses, Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* Bio section */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                <Sparkles size={18} color="var(--accent)" /> About Me
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '0.96rem', whiteSpace: 'pre-line' }}>
                {profile.bio || 'This instructor brings deep professional expertise and practical industry knowledge to all their courses and live tutoring sessions.'}
              </p>
            </div>

            {/* Courses section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
                  <BookOpen size={18} color="var(--pine-deep)" /> Published Courses ({profile.courses?.length || 0})
                </h3>
              </div>

              {profile.courses && profile.courses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
                  {profile.courses.map((course: any) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug || course.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <article className="course-card-lms">
                        {/* 16:9 Thumbnail with Zoom & Gleam on Hover */}
                        <div className="course-thumb-wrap">
                          <img
                            className="course-thumb-img"
                            src={getFullUrl(course.thumbnail_url) || '/placeholder-course.jpg'}
                            alt={course.title}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div style={{
                            position: 'absolute', top: 10, right: 10,
                            background: 'rgba(12, 59, 46, 0.92)', backdropFilter: 'blur(6px)',
                            padding: '0.25rem 0.75rem', borderRadius: 999,
                            fontSize: '0.72rem', fontWeight: 700, color: '#ffffff',
                            textTransform: 'uppercase', zIndex: 2,
                          }}>
                            {course.level || 'All Levels'}
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            {/* Author row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--pine-light)', overflow: 'hidden', flexShrink: 0 }}>
                                {avatarUrl ? <img src={avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : fullName[0]}
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{fullName}</span>
                            </div>

                            <h4 className="course-card-title" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {course.title}
                            </h4>

                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {course.description || 'Learn essential tools and frameworks with real-world, hands-on projects.'}
                            </p>
                          </div>

                          {/* Footer Rating & Price */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>
                              <Star size={13} fill={course.avgRating && course.avgRating > 0 ? '#f59e0b' : 'none'} color="#f59e0b" />
                              <span>{course.avgRating && course.avgRating > 0 ? Number(course.avgRating).toFixed(1) : 'New'}</span>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>
                                ({course._count?.reviews ?? course._count?.purchases ?? 0})
                              </span>
                            </div>
                            <span className="course-card-price" style={{
                              fontSize: '0.82rem', fontWeight: 800,
                              color: course.price === 0 ? 'var(--pine-deep)' : '#ffffff',
                              background: course.price === 0 ? 'var(--pine-light)' : 'var(--pine-deep)',
                              padding: '0.25rem 0.75rem', borderRadius: 999,
                            }}>
                              {course.price === 0 ? 'FREE' : `${course.price} ETB`}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '3rem 2rem', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No published courses yet.
                </div>
              )}
            </div>

            {/* Student Reviews */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
                  <MessageSquare size={18} color="#f59e0b" /> Student Reviews ({profile.reviews?.length || 0})
                </h3>
                <button
                  onClick={() => setShowReviewModal(true)}
                  style={{
                    padding: '0.5rem 1.1rem',
                    borderRadius: 999,
                    background: 'var(--pine-light)',
                    border: '1px solid rgba(12, 59, 46, 0.2)',
                    color: 'var(--pine-deep)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Star size={14} fill="var(--pine-deep)" /> Write a Review
                </button>
              </div>

              {profile.reviews && profile.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {profile.reviews.map((rev: any) => {
                    const revUser = rev.user;
                    const revName = revUser ? `${revUser.first_name || ''} ${revUser.last_name || ''}`.trim() || 'Student' : 'Student';
                    const revAvatar = getFullUrl(revUser?.image);
                    const revDate = rev.created_at ? new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

                    return (
                      <div key={rev.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 18, padding: '1.4rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
                              background: 'var(--pine-light)', color: 'var(--pine-deep)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                            }}>
                              {revAvatar ? (
                                <img src={revAvatar} alt={revName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                revName.charAt(0) || 'S'
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                                {revName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {revDate && <span>{revDate}</span>}
                                {rev.course_title && (
                                  <span style={{
                                    background: 'var(--bg-secondary)', padding: '1px 8px', borderRadius: 999,
                                    color: 'var(--pine-deep)', fontWeight: 600, fontSize: '0.72rem',
                                  }}>
                                    Course: {rev.course_title}
                                  </span>
                                )}
                                {rev.type === 'booking' && (
                                  <span style={{
                                    background: 'rgba(99, 102, 241, 0.1)', padding: '1px 8px', borderRadius: 999,
                                    color: '#6366f1', fontWeight: 600, fontSize: '0.72rem',
                                  }}>
                                    1-on-1 Session {rev.teaching_style_rating ? `• Style: ${rev.teaching_style_rating}★` : ''}
                                  </span>
                                )}
                                {rev.type === 'help' && (
                                  <span style={{
                                    background: 'rgba(16, 185, 129, 0.1)', padding: '1px 8px', borderRadius: 999,
                                    color: '#10b981', fontWeight: 600, fontSize: '0.72rem',
                                  }}>
                                    Live Help {rev.teaching_style_rating ? `• Style: ${rev.teaching_style_rating}★` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 3, color: '#f59e0b' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={14} fill={i < rev.rating ? '#f59e0b' : 'none'} color="#f59e0b" />
                            ))}
                          </div>
                        </div>

                        <p style={{
                          color: rev.comment ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontSize: '0.88rem', margin: 0, lineHeight: 1.6, paddingLeft: '3.1rem',
                          fontStyle: rev.comment ? 'normal' : 'italic',
                        }}>
                          "{rev.comment || `Rated ${rev.rating} out of 5 stars`}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '3rem 2rem', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No student reviews yet</div>
                  <p style={{ fontSize: '0.84rem', maxWidth: 360, margin: '0 auto 1.25rem' }}>
                    Be the first student to share your experience learning with {fullName}!
                  </p>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    style={{
                      padding: '0.65rem 1.4rem', borderRadius: 999,
                      background: 'var(--pine-deep)', color: '#ffffff',
                      fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
                    }}
                  >
                    Leave First Review
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar: Skills, Languages, Socials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Skills Tags */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                Expertise & Skills
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(profile.skills && profile.skills.length > 0 ? profile.skills : ['Software Engineering', 'System Architecture', 'React & Next.js', 'Python', 'Cloud Computing']).map((skill: string, i: number) => (
                  <span key={i} style={{
                    background: 'var(--pine-light)', border: '1px solid rgba(12, 59, 46, 0.15)',
                    color: 'var(--pine-deep)', fontSize: '0.8rem', fontWeight: 700,
                    padding: '0.4rem 0.85rem', borderRadius: 999,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages Spoken */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                Languages
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(profile.languages && profile.languages.length > 0 ? profile.languages : ['Amharic', 'English']).map((lang: string, i: number) => (
                  <span key={i} style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
                    padding: '0.4rem 0.85rem', borderRadius: 999,
                  }}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                Connect & Socials
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {profile.website_url && (
                  <a href={profile.website_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
                    <Globe size={16} color="var(--accent)" /> Website
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
                    <Globe size={16} color="#0a66c2" /> LinkedIn Profile
                  </a>
                )}
                {profile.youtube_url && (
                  <a href={profile.youtube_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
                    <Globe size={16} color="#ef4444" /> YouTube Channel
                  </a>
                )}
                {profile.twitter_url && (
                  <a href={profile.twitter_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
                    <Globe size={16} color="#0284c7" /> Twitter / X
                  </a>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── Review Modal ────────────────────────────────────────────── */}
      {showReviewModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                Review {fullName}
              </h3>
              <button
                onClick={() => { setShowReviewModal(false); setReviewError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {reviewSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Thank you for your feedback!</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Your review has been saved.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview}>
                {profile?.courses && profile.courses.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Course Taken
                    </label>
                    <select
                      value={selectedCourseId || profile.courses[0].id}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: 12,
                        background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                        color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                        fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      {profile.courses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Star selector */}
                <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Your Rating
                  </label>
                  <div style={{ display: 'inline-flex', gap: 8, padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 999 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          transition: 'transform 0.15s ease',
                          transform: (hoverRating || reviewRating) >= star ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <Star
                          size={28}
                          fill={(hoverRating || reviewRating) >= star ? '#f59e0b' : 'none'}
                          color="#f59e0b"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Your Feedback & Experience
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How was the instructor's teaching style, communication, and knowledge? What did you find most helpful?"
                    rows={4}
                    required
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: 14,
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {reviewError && (
                  <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    {reviewError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    style={{
                      padding: '0.65rem 1.25rem', borderRadius: 999,
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    style={{
                      padding: '0.65rem 1.5rem', borderRadius: 999,
                      background: 'var(--pine-deep)', border: 'none',
                      color: '#ffffff', fontWeight: 700, fontSize: '0.85rem',
                      cursor: submittingReview ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                    }}
                  >
                    {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
