'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import SsoButtons from '@/components/SsoButtons';
import Navbar from '@/components/Navbar';
import { GraduationCap, UserCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Suspense } from 'react';

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'instructor' ? 'instructor' : 'student';

  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    role: initialRole,
  });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      await refresh();
      router.push('/dashboard');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const isInstructor = form.role === 'instructor';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 64px)', marginTop: 64 }}>

        {/* ── Left — full-height info panel ─────────────────────────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <img
            src="/assets/join-community.jpg"
            onError={(e) => { e.currentTarget.src = '/assets/hero-student.jpg'; }}
            alt="Join AXumia Learnings community"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(7, 38, 31, 0.94) 0%, rgba(12, 59, 46, 0.7) 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '3rem',
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.3)',
                borderRadius: 999, padding: '5px 14px', fontSize: '0.72rem',
                color: '#fde047', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                A X U M I A  L E A R N I N G S
              </span>
            </div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
              color: '#ffffff', lineHeight: 1.2, marginBottom: '1rem',
            }}>
              Knowledge Meets<br /><span style={{ color: '#fde047' }}>Innovation</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '1.75rem', maxWidth: 380 }}>
              Join thousands of learners and verified educators building career skills with Telebirr & CBE integration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Free to join — no credit card needed',
                '5,000+ courses taught in Amharic, Oromo & English',
                '1-on-1 live video mentoring sessions',
                'Escrow-protected academic help marketplace',
              ].map(item => (
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
                Start your learning journey.
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Create your free account in less than a minute.
              </p>
            </div>

            {/* Role tabs */}
            <div style={{
              display: 'flex', background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)', borderRadius: 999,
              padding: 4, gap: 4, marginBottom: '1.5rem',
            }}>
              {(['student', 'instructor'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  style={{
                    flex: 1, padding: '0.6rem 1rem', borderRadius: 999, border: 'none',
                    background: form.role === r ? 'var(--pine-deep)' : 'transparent',
                    color: form.role === r ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  {r === 'student' ? <GraduationCap size={16} /> : <UserCheck size={16} />}
                  {r === 'student' ? 'I am a Student' : 'I am an Instructor'}
                </button>
              ))}
            </div>

            {/* OAuth */}
            <SsoButtons />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>or register with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>First name</label>
                  <input id="reg-first" type="text" required className="input-field" placeholder="Abebe"
                    value={form.first_name} onChange={set('first_name')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Last name</label>
                  <input id="reg-last" type="text" required className="input-field" placeholder="Kebede"
                    value={form.last_name} onChange={set('last_name')} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Email address</label>
                <input id="reg-email" type="email" required className="input-field" placeholder="you@example.com"
                  value={form.email} onChange={set('email')} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="reg-password" type={showPw ? 'text' : 'password'} required className="input-field"
                    placeholder="Min. 8 characters"
                    value={form.password} onChange={set('password')} style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2,
                  }}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, padding: '0.7rem 1rem', color: '#f87171', fontSize: '0.85rem',
                }}>
                  {error}
                </div>
              )}

              <button id="reg-submit" type="submit" className="btn-primary"
                disabled={loading} style={{ width: '100%', padding: '0.85rem', marginTop: '0.25rem', opacity: loading ? 0.7 : 1, fontSize: '0.95rem', borderRadius: 999, background: 'var(--pine-deep)' }}>
                {loading ? 'Creating account…' : isInstructor ? 'Create Instructor Account' : 'Create Student Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </p>

            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
              By registering, you agree to our{' '}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
