'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import SsoButtons from '@/components/SsoButtons';
import Navbar from '@/components/Navbar';
import { GraduationCap, UserCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      await refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isInstructor = role === 'instructor';

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden',
    }}>
      <Navbar />

      {/* Decorative Figma Geometric Accents */}
      <div style={{
        position: 'absolute', top: 64, left: 0,
        width: 130, height: 130,
        borderBottomRightRadius: '100%',
        background: 'rgba(181, 216, 205, 0.28)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 140, height: 140,
        borderTopLeftRadius: '100%',
        background: 'rgba(253, 224, 71, 0.18)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6rem 1.5rem 4rem', position: 'relative', zIndex: 1,
      }}>
        {/* Centered Figma LMS Card */}
        <div style={{
          maxWidth: 480, width: '100%',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 24,
          padding: 'clamp(2rem, 5vw, 2.75rem) clamp(1.5rem, 4vw, 2.25rem)',
          boxShadow: '0 20px 60px rgba(12, 59, 46, 0.08)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header & Editorial Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--pine-light)', color: 'var(--pine-deep)',
              padding: '0.3rem 0.9rem', borderRadius: 999,
              fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.15em',
              textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              K N O W L E D G E P U L S E  •  A X U M I A
            </div>

            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.7rem, 3.5vw, 2.1rem)', color: 'var(--text-primary)',
              lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '0.5rem',
            }}>
              Welcome back to{' '}
              <span style={{ position: 'relative', display: 'inline-block', color: 'var(--pine-deep)' }}>
                AXumia
                <svg style={{ position: 'absolute', bottom: -5, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3.5" fill="none" />
                </svg>
              </span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Sign in to access your enrolled courses, quizzes, and live tutoring sessions.
            </p>
          </div>

          {/* Role selector pill toggle */}
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
                onClick={() => setRole(r)}
                style={{
                  flex: 1, padding: '0.55rem 1rem', borderRadius: 999, border: 'none',
                  background: role === r ? 'var(--pine-deep)' : 'transparent',
                  color: role === r ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: role === r ? '0 4px 12px rgba(12, 59, 46, 0.25)' : 'none',
                }}
              >
                {r === 'student' ? <GraduationCap size={15} /> : <UserCheck size={15} />}
                {r === 'student' ? 'Student' : 'Instructor'}
              </button>
            ))}
          </div>

          {/* SSO Pill Buttons */}
          <SsoButtons />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0 1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1.1rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                  borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 3rem 0.75rem 1.1rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 48, marginTop: '0.35rem',
                background: 'var(--pine-deep)', color: '#ffffff',
                border: 'none', borderRadius: 999,
                fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 6px 20px rgba(12, 59, 46, 0.22)',
                transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
              }}
            >
              {loading ? 'Signing in…' : `Sign In as ${role === 'student' ? 'Student' : 'Instructor'}`}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Don&apos;t have an account?{' '}
            <Link href={`/register?role=${role}`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
              Sign up free →
            </Link>
          </p>
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
