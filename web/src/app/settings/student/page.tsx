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
import { User, Lock, GraduationCap, Save, Loader2, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'account' | 'security';

export default function StudentSettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('account');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account',  label: t.settings?.tabAccount || 'Account',  icon: <User size={16} /> },
    { id: 'security', label: t.settings?.tabSecurity || 'Security', icon: <Lock size={16} /> },
  ];

  const LANGUAGES = ['Amharic', 'English', 'Afaan Oromo', 'Tigrinya'];

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', preferred_language: 'en',
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

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
        });
        setAvatar(d.image || null);
        setEmailVerified(d.is_email_verified ?? false);
      })
      .catch(() => {});
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
          first_name: form.first_name,
          last_name:  form.last_name,
          phone:      form.phone || undefined,
          image:      avatar   ?? undefined,
        }),
      });
      showMessage('success', 'Account updated successfully.');
    } catch { showMessage('error', 'Failed to save changes.'); }
    finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1.1rem',
    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
    borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.15s',
  };

  if (loading || !user) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div className="container" style={{ maxWidth: 960, padding: '2rem 1.5rem 5rem' }}>
          
          {/* ── Figma Hero Banner Container ────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(12, 59, 46, 0.2)',
            marginBottom: '2.5rem',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -50, left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.85rem',
              }}>
                A C C O U N T  &  P R E F E R E N C E S
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', lineHeight: 1.2,
                color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>
                {t.settings?.titleStudent || 'Student Settings'}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.92rem' }}>
                {user.email} · <span style={{ color: '#fde047', fontWeight: 700 }}>{t.settings?.studentRole || 'Student Account'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Sidebar */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: '88px' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  id={`student-tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.75rem 1.1rem', borderRadius: 999, border: '1px solid',
                    background: tab === t.id ? 'var(--pine-deep)' : 'transparent',
                    borderColor: tab === t.id ? 'var(--pine-deep)' : 'transparent',
                    color: tab === t.id ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: tab === t.id ? 700 : 500, fontSize: '0.88rem',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    boxShadow: tab === t.id ? '0 4px 12px rgba(12, 59, 46, 0.2)' : 'none',
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}

              {/* Upgrade to instructor CTA */}
              {user.role === 'student' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{t.settings?.wantToTeach || 'Want to teach on AXumia?'}</p>
                  <a href="/register?role=instructor" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    background: 'var(--pine-light)', color: 'var(--pine-deep)',
                    border: '1px solid var(--card-border)', borderRadius: 999,
                    padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center',
                  }}>
                    <GraduationCap size={15} /> {t.settings?.becomeInstructor || 'Become an Instructor'}
                  </a>
                </div>
              )}
            </nav>

            {/* Content */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 24, padding: 'clamp(1.5rem, 3vw, 2.5rem)', minHeight: 400,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}>
              {message && (
                <div style={{
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: message.type === 'success' ? '#34d399' : '#fca5a5',
                  borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1.5rem',
                }}>
                  {message.text}
                </div>
              )}

              {/* ── Account Tab ──────────────────────────────────────────── */}
              {tab === 'account' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.settings?.accountInfo || 'Account Information'}</h2>

                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <AvatarUploader
                      label={t.settings?.profilePhoto || 'Profile Photo'}
                      currentUrl={avatar}
                      aspectRatio="1:1"
                      shape="circle"
                      onUpload={(key, url) => setAvatar(url || key)}
                    />
                    <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.settings?.firstName || 'First Name'}</label>
                          <input id="student-first-name" type="text" style={inputStyle}
                            value={form.first_name}
                            onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                            placeholder="First name" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.settings?.lastName || 'Last Name'}</label>
                          <input id="student-last-name" type="text" style={inputStyle}
                            value={form.last_name}
                            onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                            placeholder="Last name" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                      {t.settings?.emailAddress || 'Email Address'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="email"
                        style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        value={user.email}
                        readOnly
                      />
                      {emailVerified ? (
                        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={13} /> {t.settings?.emailVerified || 'Verified'}
                        </span>
                      ) : (
                        <button
                          id="resend-verification"
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '0.5rem 0.9rem', fontSize: '0.78rem', fontWeight: 600, cursor: resending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: resending ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          disabled={resending}
                          onClick={async () => {
                            setResending(true);
                            try {
                              const res = await authFetch(`${API}/auth/resend-verification`, { method: 'POST' });
                              if (res.ok) showMessage('success', 'Verification email sent! Check your inbox.');
                              else { const d = await res.json().catch(() => ({})); showMessage('error', d.message || 'Failed to resend verification email.'); }
                            } catch { showMessage('error', 'Network error. Please try again.'); }
                            finally { setResending(false); }
                          }}
                        >
                          {resending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                          {resending ? 'Sending…' : (t.settings?.resendVerification || 'Resend Verification')}
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.35rem' }}>
                      {t.settings?.emailLockedNote || 'Email cannot be changed here. Contact support if needed.'}
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.settings?.phone || 'Phone Number'}</label>
                    <input id="student-phone" type="tel" style={inputStyle}
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +251 91 234 5678" />
                  </div>

                  {/* Preferred Language */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>{t.settings?.preferredLanguage || 'Preferred Language'}</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {LANGUAGES.map(l => (
                        <button
                          key={l}
                          id={`pref-lang-${l}`}
                          onClick={() => setForm(p => ({ ...p, preferred_language: l }))}
                          style={{
                            padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            background: form.preferred_language === l ? 'var(--pine-light)' : 'var(--bg-secondary)',
                            color: form.preferred_language === l ? 'var(--pine-deep)' : 'var(--text-secondary)',
                            border: `1px solid ${form.preferred_language === l ? 'var(--accent)' : 'var(--card-border)'}`,
                            transition: 'all 0.15s',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="save-account-btn"
                    onClick={saveAccount}
                    disabled={saving}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? (t.settings?.saving || 'Saving...') : (t.settings?.saveChanges || 'Save Changes')}
                  </button>
                </div>
              )}

              {/* ── Security Tab ─────────────────────────────────────────── */}
              {tab === 'security' && <SecurityPanel />}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
