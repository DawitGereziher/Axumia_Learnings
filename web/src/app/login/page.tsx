'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, getMe, clearTokens } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import SsoButtons from '@/components/SsoButtons';
import Navbar from '@/components/Navbar';
import { GraduationCap, UserCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'instructor' ? 'instructor' : 'student';

  const [role, setRole]         = useState<'student' | 'instructor'>(initialRole);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { refresh } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleRoleChange = (newRole: 'student' | 'instructor') => {
    setRole(newRole);
    setError('');
    // Optionally keep query param in URL without full reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Authenticate credentials
      await login(email, password);

      // 2. Fetch authenticated user profile to verify role consistency
      const user = await getMe();
      if (!user) {
        throw new Error('Unable to retrieve user profile after authentication.');
      }

      // 3. Strict role gating:
      // An instructor account MUST NOT log in when 'student' is selected
      if (role === 'student' && user.role === 'instructor') {
        clearTokens();
        setError('This account is registered as an Instructor. Please switch to "I am an Instructor" above to sign in.');
        setLoading(false);
        return;
      }

      // A student account MUST NOT log in when 'instructor' is selected
      if (role === 'instructor' && user.role !== 'instructor' && user.role !== 'admin') {
        clearTokens();
        setError('This account is registered as a Student. Please switch to "I am a Student" above to sign in.');
        setLoading(false);
        return;
      }

      // 4. Role is verified - refresh global auth context
      await refresh();

      // 5. Navigate to the appropriate dashboard
      if (user.role === 'instructor') {
        router.push('/instructor/courses');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      clearTokens();
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isInstructor = role === 'instructor';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      <style>{`
        .auth-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 64px);
          margin-top: 64px;
          flex: 1;
        }
        @media (max-width: 900px) {
          .auth-split-grid {
            grid-template-columns: 1fr;
          }
          .auth-split-media {
            display: none !important;
          }
        }
      `}</style>

      <div className="auth-split-grid">

        {/* ── Left — full-height media & value proposition panel ── */}
        <div className="auth-split-media" style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <img
            src={isInstructor ? '/assets/login-instructor-banner.jpg' : '/assets/login-student-banner.jpg'}
            onError={(e) => {
              e.currentTarget.src = isInstructor ? '/assets/instructor-2.jpg' : '/assets/hero-student.jpg';
            }}
            alt={isInstructor ? 'AXumia Instructor Portal' : 'AXumia Learnings Platform'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(7, 38, 31, 0.94) 0%, rgba(12, 59, 46, 0.72) 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 'clamp(2rem, 5vw, 4rem)',
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.3)',
                borderRadius: 999, padding: '5px 14px', fontSize: '0.72rem',
                color: '#fde047', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                {isInstructor ? 'A X U M I A  I N S T R U C T O R' : 'A X U M I A  L E A R N I N G S'}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
              color: '#ffffff', lineHeight: 1.2, marginBottom: '1rem',
            }}>
              {isInstructor ? (
                <>
                  Teach, Inspire<br />
                  <span style={{ color: '#fde047' }}>& Grow Your Income</span>
                </>
              ) : (
                <>
                  Welcome Back to<br />
                  <span style={{ color: '#fde047' }}>Your Learning Hub</span>
                </>
              )}
            </h2>

            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '1.75rem', maxWidth: 400 }}>
              {isInstructor
                ? 'Empower thousands of learners across Ethiopia and beyond. Manage your curriculum, live tutoring bookings, and direct payouts.'
                : 'Pick up where you left off. Access your interactive video lessons, assignments, quizzes, and live tutoring mentoring.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(isInstructor ? [
                'Full control over course creation, video modules & pricing',
                'Host live 1-on-1 and group video mentoring sessions',
                'Direct, guaranteed payouts via Telebirr & CBE',
                'Escrow-protected academic assistance marketplace',
              ] : [
                'Resume enrolled courses & track your certificate progress',
                '1-on-1 live tutoring sessions with verified educators',
                'Gamified quizzes, leaderboards & daily streak XP',
                'Escrow protection on all tutoring & academic requests',
              ]).map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.92)', fontSize: '0.88rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#fde047" style={{ flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right — form panel ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(2rem, 5vw, 4rem)',
          background: 'var(--bg-primary)',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>

            {/* Logo + title */}
            <div style={{ marginBottom: '1.75rem' }}>
              <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                <img src="/axumia_logo_icon.svg" onError={(e) => { e.currentTarget.src = '/axumia_logo_concept_v4.svg'; }} alt="AXumia" style={{ height: 36 }} />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  AXumia<span style={{ color: 'var(--accent)', fontWeight: 600, marginLeft: 3 }}>Learnings</span>
                </span>
              </Link>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.85rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {isInstructor ? 'Instructor Sign In' : 'Welcome back.'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {isInstructor
                  ? 'Sign in to access your instructor dashboard, students & earnings.'
                  : 'Sign in to access your enrolled courses, quizzes, and live tutoring.'}
              </p>
            </div>

            {/* Consistent Role selector tabs */}
            <div style={{
              display: 'flex', background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)', borderRadius: 999,
              padding: 4, gap: 4, marginBottom: '1.5rem',
            }}>
              {(['student', 'instructor'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  id={`login-role-${r}`}
                  onClick={() => handleRoleChange(r)}
                  style={{
                    flex: 1, padding: '0.6rem 1rem', borderRadius: 999, border: 'none',
                    background: role === r ? 'var(--pine-deep)' : 'transparent',
                    color: role === r ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: role === r ? '0 4px 12px rgba(12, 59, 46, 0.25)' : 'none',
                  }}
                >
                  {r === 'student' ? <GraduationCap size={16} /> : <UserCheck size={16} />}
                  {r === 'student' ? 'I am a Student' : 'I am an Instructor'}
                </button>
              ))}
            </div>

            {/* OAuth SSO */}
            <SsoButtons />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Password
                  </label>
                  <Link href="/forgot-password" style={{ color: 'var(--accent)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                    }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: '0.85rem 1rem', color: '#f87171', fontSize: '0.85rem',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</span>
                    <span>{error}</span>
                  </div>
                  {(error.includes('registered as a Student') || error.includes('registered as an Instructor')) && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange(role === 'student' ? 'instructor' : 'student')}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#ffffff',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: 2,
                      }}
                    >
                      Switch to {role === 'student' ? 'Instructor' : 'Student'} tab now →
                    </button>
                  )}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%', padding: '0.85rem', marginTop: '0.25rem',
                  opacity: loading ? 0.7 : 1, fontSize: '0.95rem',
                  borderRadius: 999, background: 'var(--pine-deep)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Signing in…' : `Sign In as ${isInstructor ? 'Instructor' : 'Student'}`}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Don&apos;t have an account?{' '}
              <Link href={`/register?role=${role}`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                Sign up free →
              </Link>
            </p>

            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
              By signing in, you agree to our{' '}
              <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
