'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import AvatarUploader from '@/components/settings/AvatarUploader';
import SecurityPanel from '@/components/settings/SecurityPanel';
import Link from 'next/link';
import {
  User,
  Lock,
  GraduationCap,
  Save,
  Loader2,
  CheckCircle2,
  BookOpen,
  Sparkles,
  CreditCard,
  Heart,
  Globe,
  Bell,
  Check,
  Plus,
  X,
  Target,
  ArrowRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'account' | 'learning' | 'security' | 'billing';

const LANGUAGES = ['Amharic', 'English', 'Afaan Oromo', 'Tigrinya', 'Somali', 'Arabic', 'French'];
const INTEREST_SUGGESTIONS = [
  'Mathematics', 'Python Programming', 'Machine Learning', 'Physics',
  'Web Development', 'Business Strategy', 'Biology', 'Data Analysis',
  'English Fluency', 'Graphic Design', 'Economics', 'Cybersecurity',
];

export default function StudentSettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('account');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account',  label: t.settings?.tabAccount || 'Account & Identity',  icon: <User size={16} /> },
    { id: 'learning', label: 'Learning Preferences',                         icon: <BookOpen size={16} /> },
    { id: 'billing',  label: 'Orders & Enrollments',                         icon: <CreditCard size={16} /> },
    { id: 'security', label: t.settings?.tabSecurity || 'Security & 2FA',     icon: <Lock size={16} /> },
  ];

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    preferred_language: 'English',
    bio: '',
    headline: '',
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // Learning preferences state
  const [interests, setInterests] = useState<string[]>(['Python Programming', 'Mathematics']);
  const [interestInput, setInterestInput] = useState('');
  const [studyGoal, setStudyGoal] = useState<'career' | 'academic' | 'hobby' | 'exam_prep'>('career');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState('30');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    authFetch(`${API}/api/users/me`)
      .then(r => r.ok && r.json())
      .then(d => {
        if (!d) return;
        setForm({
          first_name:         d.first_name || '',
          last_name:          d.last_name  || '',
          phone:              d.phone      || '',
          preferred_language: d.preferred_language || 'English',
          bio:                d.bio || '',
          headline:           d.headline || '',
        });
        setAvatar(d.image || null);
        setEmailVerified(d.is_email_verified ?? false);
      })
      .catch(() => {});

    // Load local stored learning preferences
    if (typeof window !== 'undefined') {
      const savedInterests = localStorage.getItem('student_interests');
      if (savedInterests) {
        try { setInterests(JSON.parse(savedInterests)); } catch {}
      }
      const savedGoal = localStorage.getItem('student_goal') as any;
      if (savedGoal) setStudyGoal(savedGoal);
      const savedMin = localStorage.getItem('student_daily_min');
      if (savedMin) setDailyGoalMinutes(savedMin);
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveAccount = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          phone:      form.phone.trim() || undefined,
          image:      avatar   ?? undefined,
        }),
      });
      showMessage('success', 'Profile and account details saved successfully.');
    } catch {
      showMessage('error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const saveLearningPreferences = () => {
    setSaving(true);
    localStorage.setItem('student_interests', JSON.stringify(interests));
    localStorage.setItem('student_goal', studyGoal);
    localStorage.setItem('student_daily_min', dailyGoalMinutes);
    setTimeout(() => {
      setSaving(false);
      showMessage('success', 'Learning goals and subject preferences saved.');
    }, 300);
  };

  const addInterest = (item: string) => {
    const t = item.trim();
    if (t && !interests.includes(t) && interests.length < 15) {
      setInterests(prev => [...prev, t]);
    }
    setInterestInput('');
  };

  const removeInterest = (item: string) => {
    setInterests(prev => prev.filter(x => x !== item));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  if (loading || !user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* ── Full Width Desktop Workspace Container ─────────────────── */}
      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{
          width: '100%',
          maxWidth: 1720,
          margin: '0 auto',
          padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem',
          boxSizing: 'border-box',
        }}>

          {/* ── Hero Banner Container ───────────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: '1.75rem clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(12, 59, 46, 0.2)',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}>
            <div style={{ position: 'absolute', top: -50, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.25rem 0.8rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.5rem',
              }}>
                <Sparkles size={13} /> S T U D E N T  A C C O U N T
              </div>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', lineHeight: 1.15,
                color: '#ffffff', margin: '0 0 0.35rem', letterSpacing: '-0.02em',
              }}>
                Student Account &amp; Preferences
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.88rem', margin: 0 }}>
                {user.email} · <span style={{ color: '#fde047', fontWeight: 700 }}>Active Student Learner</span>
              </p>
            </div>

            {/* Quick Navigation Strip */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link
                href="/my-courses"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  borderRadius: 999, padding: '0.45rem 1.1rem', fontSize: '0.82rem',
                  fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <BookOpen size={14} /> My Learning
              </Link>
              <Link
                href="/wishlist"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fde047',
                  borderRadius: 999, padding: '0.45rem 1.1rem', fontSize: '0.82rem',
                  fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Heart size={14} fill="#fde047" /> Saved Wishlist
              </Link>
            </div>
          </div>

          {/* ── Two-Column Desktop Layout ────────────────────────────── */}
          <div className="settings-split-layout" style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(230px, 18vw, 270px) minmax(0, 1fr)',
            gap: '2rem',
            alignItems: 'start',
          }}>
            {/* Sidebar Rail */}
            <nav className="settings-sidebar-nav" style={{
              display: 'flex', flexDirection: 'column', gap: '0.45rem',
              position: 'sticky', top: '88px',
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 20, padding: '0.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            }}>
              {TABS.map(t => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    id={`student-tab-${t.id}`}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid',
                      background: isActive ? 'var(--pine-deep)' : 'transparent',
                      borderColor: isActive ? 'var(--pine-deep)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}

              {/* Become Instructor CTA */}
              {user.role === 'student' && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    Ready to share your skills and earn income teaching?
                  </div>
                  <Link
                    href="/register?role=instructor"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      background: 'rgba(16,185,129,0.12)', color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12,
                      padding: '0.6rem 0.9rem', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none',
                    }}
                  >
                    <GraduationCap size={15} /> Apply as Instructor
                  </Link>
                </div>
              )}
            </nav>

            {/* Main Content Workspace */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 24, padding: 'clamp(1.5rem, 2.5vw, 2.5rem)', minHeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}>
              {message && (
                <div style={{
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: message.type === 'success' ? '#34d399' : '#fca5a5',
                  borderRadius: 12, padding: '0.75rem 1.25rem', fontSize: '0.88rem', marginBottom: '1.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : null}
                  <span>{message.text}</span>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 1: Account & Profile Details
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'account' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      Personal Identity &amp; Profile Photo
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Manage your profile display name, contact phone, and avatar.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <AvatarUploader
                      label="Student Avatar (Photo)"
                      currentUrl={avatar}
                      aspectRatio="1:1"
                      shape="circle"
                      onUpload={(key, url) => setAvatar(url || key)}
                    />

                    <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>First Name</label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={form.first_name}
                            onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Last Name</label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={form.last_name}
                            onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      {/* Email row with verification status */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Primary Login Email
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <input
                            type="email"
                            readOnly
                            style={{ ...inputStyle, opacity: 0.65, cursor: 'not-allowed' }}
                            value={user.email}
                          />
                          {emailVerified ? (
                            <span style={{
                              background: 'rgba(16,185,129,0.15)', color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999,
                              padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 800,
                              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <CheckCircle2 size={13} /> Verified
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={resending}
                              onClick={async () => {
                                setResending(true);
                                try {
                                  const res = await authFetch(`${API}/auth/resend-verification`, { method: 'POST' });
                                  if (res.ok) showMessage('success', 'Verification link sent to your inbox.');
                                  else showMessage('error', 'Failed to resend verification.');
                                } catch {
                                  showMessage('error', 'Network error.');
                                } finally {
                                  setResending(false);
                                }
                              }}
                              style={{
                                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                                border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10,
                                padding: '0.55rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                                cursor: resending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              {resending ? 'Sending...' : 'Resend Verification'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Mobile Number (For Telebirr SMS notifications &amp; booking alerts)
                        </label>
                        <input
                          type="tel"
                          style={inputStyle}
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+251 91 123 4567"
                        />
                      </div>

                      {/* Preferred Language */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.45rem' }}>
                          Preferred Learning Language
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {LANGUAGES.map(l => {
                            const isSel = form.preferred_language === l;
                            return (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, preferred_language: l }))}
                                style={{
                                  padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700,
                                  background: isSel ? 'var(--pine-deep)' : 'var(--bg-secondary)',
                                  color: isSel ? '#fff' : 'var(--text-secondary)',
                                  border: `1px solid ${isSel ? 'var(--pine-deep)' : 'var(--card-border)'}`,
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                              >
                                {l}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={saveAccount}
                      disabled={saving}
                      style={{
                        background: 'var(--pine-deep)', color: '#ffffff',
                        border: 'none', borderRadius: 999,
                        padding: '0.8rem 2rem', fontWeight: 700, fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                      }}
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save Account Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 2: Learning Goals & Subject Interests
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'learning' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      Personal Learning Plan &amp; Interests
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Tailor course recommendations, tutor suggestions, and study pace reminders to your goals.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Primary Study Objective */}
                    <div style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Primary Learning Objective
                      </label>
                      {[
                        { id: 'career', label: 'Career Transition / Tech Job Skills', desc: 'Practical software, data, or engineering mastery' },
                        { id: 'academic', label: 'University / Secondary Academic Support', desc: 'Excel in exams and university coursework' },
                        { id: 'exam_prep', label: 'National Exam / Certification Prep', desc: 'Targeted preparation for professional credentials' },
                        { id: 'hobby', label: 'Personal Growth & Curiosity', desc: 'Learn for self-improvement and practical hobbies' },
                      ].map(g => (
                        <label
                          key={g.id}
                          onClick={() => setStudyGoal(g.id as any)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: 12,
                            background: studyGoal === g.id ? 'rgba(99,102,241,0.1)' : 'var(--card-bg)',
                            border: `1px solid ${studyGoal === g.id ? '#6366f1' : 'var(--card-border)'}`,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="radio"
                            name="studyGoal"
                            checked={studyGoal === g.id}
                            onChange={() => setStudyGoal(g.id as any)}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{g.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Daily Time Commitment */}
                    <div style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Daily Study Target (Streak Goal)
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {['15', '30', '45', '60'].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setDailyGoalMinutes(mins)}
                            style={{
                              padding: '0.85rem', borderRadius: 12, border: '1px solid',
                              background: dailyGoalMinutes === mins ? 'var(--pine-deep)' : 'var(--card-bg)',
                              borderColor: dailyGoalMinutes === mins ? 'var(--pine-deep)' : 'var(--card-border)',
                              color: dailyGoalMinutes === mins ? '#fff' : 'var(--text-primary)',
                              fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            }}
                          >
                            <span>{mins} mins</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>/ day</span>
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Completing your daily goal maintains your gamification XP streak and unlocks certificate badges.
                      </div>
                    </div>
                  </div>

                  {/* Subject Interests Section */}
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 18, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Subjects You Want to Learn
                    </label>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Add a subject interest (e.g. Flutter, Calculus, UI/UX)..."
                        value={interestInput}
                        onChange={e => setInterestInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addInterest(interestInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addInterest(interestInput)}
                        style={{
                          background: 'rgba(16,185,129,0.15)', color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12,
                          padding: '0 1.25rem', fontWeight: 700, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {INTEREST_SUGGESTIONS.map(s => {
                        const isAdded = interests.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => isAdded ? removeInterest(s) : addInterest(s)}
                            style={{
                              padding: '3px 9px', borderRadius: 999, fontSize: '0.75rem',
                              background: isAdded ? 'rgba(99,102,241,0.2)' : 'var(--card-bg)',
                              color: isAdded ? '#818cf8' : 'var(--text-secondary)',
                              border: `1px solid ${isAdded ? 'rgba(99,102,241,0.4)' : 'var(--card-border)'}`,
                              cursor: 'pointer', fontWeight: isAdded ? 700 : 500,
                            }}
                          >
                            {isAdded ? '✓ ' : '+ '} {s}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                      paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)', minHeight: 40,
                    }}>
                      {interests.map(s => (
                        <span key={s} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999,
                          padding: '0.35rem 0.85rem', fontSize: '0.82rem', fontWeight: 700,
                        }}>
                          {s}
                          <button
                            type="button"
                            onClick={() => removeInterest(s)}
                            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={saveLearningPreferences}
                      disabled={saving}
                      style={{
                        background: 'var(--pine-deep)', color: '#ffffff',
                        border: 'none', borderRadius: 999,
                        padding: '0.8rem 2rem', fontWeight: 700, fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                      }}
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save Learning Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 3: Orders, Purchases & Receipts
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'billing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      Purchased Courses &amp; Receipts
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Access your transaction receipts, Chapa/Telebirr payment invoices, and enrollment records.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 800 }}>
                        <CreditCard size={18} /> Active Enrollments
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Quickly jump into your active curriculum and course video lectures.
                      </p>
                      <Link
                        href="/my-courses"
                        style={{
                          marginTop: 'auto', alignSelf: 'flex-start',
                          background: 'var(--pine-deep)', color: '#fff',
                          borderRadius: 10, padding: '0.55rem 1.1rem',
                          fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        Open My Learning <ArrowRight size={13} />
                      </Link>
                    </div>

                    <div style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontWeight: 800 }}>
                        <Heart size={18} fill="#fde047" /> Course Wishlist
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Review courses you saved for later and compare instructor ratings.
                      </p>
                      <Link
                        href="/wishlist"
                        style={{
                          marginTop: 'auto', alignSelf: 'flex-start',
                          background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 10, padding: '0.55rem 1.1rem',
                          fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        View Saved Courses <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 4: Security & 2FA
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'security' && <SecurityPanel />}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
        @media (max-width: 960px) {
          .settings-split-layout {
            grid-template-columns: 1fr !important;
          }
          .settings-sidebar-nav {
            position: static !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding: 0.5rem !important;
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
    </main>
  );
}
