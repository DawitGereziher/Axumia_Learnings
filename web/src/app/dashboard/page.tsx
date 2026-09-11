'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch } from '@/lib/auth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTemplate from '@/components/PageTemplate';
import GamificationWidget from '@/components/gamification/GamificationWidget';

import {
  BookOpen,
  Users,
  HelpCircle,
  PlusCircle,
  Calendar,
  ShieldCheck,
  Video,
  ArrowRight,
  TrendingUp,
  Star,
  Eye,
  Heart,
  Wallet,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/* ══════════════════════════════════════════════════════════════════════════
   STUDENT DASHBOARD PANEL
   ══════════════════════════════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  {
    href: '/courses',
    icon: <BookOpen size={22} />,
    label: 'Browse Courses',
    desc: 'Explore the full catalog',
    gradient: 'linear-gradient(135deg,#0c3b2e,#15805a)',
    glow: 'rgba(12,59,46,0.3)',
    border: 'rgba(12,59,46,0.25)',
  },
  {
    href: '/book-session',
    icon: <Video size={22} />,
    label: 'Book a Session',
    desc: '1-on-1 live tutoring',
    gradient: 'linear-gradient(135deg,#10b981,#34d399)',
    glow: 'rgba(16,185,129,0.3)',
    border: 'rgba(16,185,129,0.25)',
  },
  {
    href: '/help-requests',
    icon: <HelpCircle size={22} />,
    label: 'Help Marketplace',
    desc: 'Post a tutoring need',
    gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
    glow: 'rgba(245,158,11,0.3)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    href: '/wishlist',
    icon: <Heart size={22} />,
    label: 'My Wishlist',
    desc: 'Saved courses',
    gradient: 'linear-gradient(135deg,#f43f5e,#fb7185)',
    glow: 'rgba(244,63,94,0.3)',
    border: 'rgba(244,63,94,0.25)',
  },
];

function StudentDashboardView({ purchases, bookings, helpRequests, t }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      {/* ── Premium Quick Actions ─────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {QUICK_ACTIONS.map(action => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                display: 'flex', flexDirection: 'column', gap: '1rem',
                padding: '1.4rem 1.4rem 1.2rem',
                background: 'rgba(15,23,42,0.8)',
                border: `1px solid ${action.border}`,
                borderRadius: 18, textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${action.glow}`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Background glow blob */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: action.glow, filter: 'blur(30px)', opacity: 0.4 }} />
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: action.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
                boxShadow: `0 4px 14px ${action.glow}`,
              }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{action.desc}</div>
              </div>
              <ChevronRight size={14} style={{ position: 'absolute', bottom: '1.1rem', right: '1.1rem', color: '#334155' }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Gamification — XP, streak, badges */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Your Progress</h2>
          <Link href="/leaderboard" style={{ color: '#fde047', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', opacity: 0.8 }}>🏆 Leaderboard →</Link>
        </div>
        <GamificationWidget />
      </div>

      {/* Enrolled Courses */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {t.dashboard.myCourses} ({purchases.length})
          </h2>
          <Link href="/courses" style={{ color: '#818cf8', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            Browse Catalog →
          </Link>
        </div>

        {purchases.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <BookOpen size={36} color="#6366f1" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
            <p style={{ marginBottom: '1.25rem', fontSize: '0.95rem' }}>{t.dashboard.noCourses}</p>
            <Link href="/courses" className="btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {t.hero.exploreCourses} <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {purchases.map((p: any) => {
              const pct = p.progress?.completionPct ?? 0;
              const done = p.progress?.completedLessons ?? 0;
              const total = p.progress?.totalLessons ?? 0;
              const isComplete = pct >= 100;
              return (
                <div key={p.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Enrolled</span>
                      {isComplete && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>✓ Completed</span>}
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>{p.course?.title}</h3>
                    
                    {/* Progress Bar */}
                    <div style={{ marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        <span>{done}/{total} lessons</span>
                        <span style={{ color: isComplete ? '#10b981' : '#818cf8', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isComplete ? '#10b981' : 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  </div>

                  <Link href={`/courses/${p.course?.slug}/learn`} className="btn-primary" style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.88rem', display: 'block', textDecoration: 'none' }}>
                    {pct === 0 ? '▶ Start Learning' : isComplete ? '↩ Review Course' : '▶ Continue Learning'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bookings & Live Tutoring */}
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: '1.25rem' }}>
          {t.dashboard.upcomingSessions} ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ marginBottom: '1rem' }}>{t.dashboard.noSessions}</p>
            <Link href="/instructors" className="btn-ghost" style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {t.nav.bookSession} <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map((b: any) => (
              <div key={b.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Live Session with Instructor</div>
                  <div style={{ color: '#818cf8', fontSize: '0.88rem', marginTop: 2 }}>
                    {b.slot?.starts_at ? new Date(b.slot.starts_at).toLocaleString() : 'Scheduled'}
                  </div>
                  {b.notes && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>Note: {b.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{b.status}</span>
                  {b.meeting_link && (
                    <a href={b.meeting_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                      Join Meeting 📹
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INSTRUCTOR DASHBOARD PANEL
   ══════════════════════════════════════════════════════════════════════════ */
function InstructorDashboardView({ user }: any) {
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loadingInst, setLoadingInst] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/api/courses/instructor/mine').then(r => r.ok ? r.json() : []),
      authFetch('/api/bookings/instructor/mine').then(r => r.ok ? r.json() : []),
    ]).then(([c, b]) => {
      setMyCourses(Array.isArray(c) ? c : []);
      setMyBookings(Array.isArray(b) ? b : []);
    }).finally(() => setLoadingInst(false));
  }, []);

  const totalStudents = myCourses.reduce((acc, c) => acc + (c._count?.purchases || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Instructor Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Created Courses</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', fontFamily: 'Outfit, sans-serif' }}>{myCourses.length}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Enrolled Students</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', fontFamily: 'Outfit, sans-serif' }}>{totalStudents}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Pending Bookings</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'Outfit, sans-serif' }}>{myBookings.filter(b => b.status === 'requested' || b.status === 'pending').length}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Instructor Rating</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={24} fill="#fbbf24" />
            {user?.instructorProfile?.avg_rating
              ? Number(user.instructorProfile.avg_rating).toFixed(1)
              : '—'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/instructor/courses/new" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} /> Create New Course
        </Link>
        <Link href="/instructor/availability" className="btn-ghost" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} /> Manage Availability Slots
        </Link>
      </div>

      {/* Course List Table */}
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: '1.25rem' }}>
          My Created Courses
        </h2>

        {loadingInst ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        ) : myCourses.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ marginBottom: '1rem' }}>You haven&apos;t created any courses yet.</p>
            <Link href="/instructor/courses/new" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)', fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8' }}>
              <div>COURSE TITLE</div>
              <div>STATUS</div>
              <div>PRICE</div>
              <div>STUDENTS</div>
              <div>ACTIONS</div>
            </div>

            {myCourses.map((course: any) => (
              <div key={course.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '1rem 1.25rem', borderBottom: '1px solid var(--card-border)', alignItems: 'center', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{course.title}</div>
                <div>
                  <span className={`badge ${course.is_published ? 'badge-success' : 'badge-accent'}`} style={{ fontSize: '0.7rem' }}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div style={{ color: '#818cf8', fontWeight: 700 }}>{Number(course.price) === 0 ? 'Free' : `${course.price} ETB`}</div>
                <div style={{ color: '#94a3b8' }}>{course._count?.purchases || 0}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/courses/${course.slug || course.id}`} style={{ color: '#94a3b8' }} title="View Course Page">
                    <Eye size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
function DashboardContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [purchases, setPurchases] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/users/me/purchases')
      .then(r => r.ok && r.json())
      .then(async (d) => {
        if (!d) return;
        const withProgress = await Promise.all(d.map(async (p: any) => {
          try {
            const cid = p.course_id || p.course?.id;
            if (!cid) return p;
            const pr = await authFetch(`/api/courses/${cid}/progress`);
            const progress = pr.ok ? await pr.json() : null;
            return { ...p, progress };
          } catch { return p; }
        }));
        setPurchases(withProgress);
      })
      .catch(() => {});

    authFetch('/api/bookings/mine')
      .then(r => r.ok && r.json())
      .then(d => d && setBookings(d))
      .catch(() => {});

    authFetch(`${API}/api/help-requests/mine`)
      .then(r => r.ok && r.json())
      .then(d => d && setHelpRequests(d))
      .catch(() => {});
  }, [user]);

  if (loading || !user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  const isInstructor = user.role === 'instructor' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  return (
    <PageTemplate fullWidth={true}>
      <div style={{ flex: 1, paddingBottom: '4rem' }}>
        {/* ── Figma Hero Banner Container ────────────────────────── */}
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 28,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 4vw, 3rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
          }}>
            {/* Ambient decorative circles */}
            <div style={{ position: 'absolute', top: -80, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: '25%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 999, padding: '0.35rem 1.1rem', fontSize: '0.75rem',
                  fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: '#fde047', marginBottom: '1rem',
                }}>
                  <Sparkles size={14} /> L E A R N I N G  H U B
                </div>

                <h1 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.2,
                  color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em',
                }}>
                  {t.dashboard.welcome},{' '}
                  <span style={{ color: '#fde047' }}>
                    {user.first_name || user.name}
                  </span> 👋
                </h1>

                <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.95rem' }}>
                  {user.email} · <span style={{ background: '#fde047', color: '#0c3b2e', padding: '0.2rem 0.65rem', borderRadius: 999, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>{user.role}</span>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="btn-primary"
                    style={{
                      padding: '0.8rem 1.6rem', borderRadius: 999, fontSize: '0.9rem',
                      fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: '#fde047', color: '#0c3b2e', border: 'none',
                    }}
                  >
                    <ShieldCheck size={16} /> Open Admin Console
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container">

          {/* Role-based dashboard content */}
          {isInstructor ? (
            <InstructorDashboardView user={user} />
          ) : (
            <StudentDashboardView purchases={purchases} bookings={bookings} helpRequests={helpRequests} t={t} />
          )}

        </div>
      </div>
    </PageTemplate>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}