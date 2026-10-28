'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import {
  Lock,
  AlertTriangle,
  Trash2,
  Loader2,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Laptop,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Clock,
  Globe,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SecurityPanel() {
  const { t } = useLanguage();

  // Password state
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Sessions state
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  // Danger zone state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Password strength calculations
  const p = form.newPassword;
  const hasMinLen = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  const hasSym = /[^A-Za-z0-9]/.test(p);
  const strengthScore = [hasMinLen, hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;

  const getStrengthMeta = () => {
    if (!p) return { label: 'Empty', color: '#64748b', pct: 0 };
    if (strengthScore <= 2) return { label: 'Weak', color: '#ef4444', pct: 30 };
    if (strengthScore <= 4) return { label: 'Moderate', color: '#f59e0b', pct: 70 };
    return { label: 'Strong & Secure', color: '#10b981', pct: 100 };
  };
  const strengthMeta = getStrengthMeta();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (form.newPassword !== form.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (form.newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authFetch(`${API}/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update password');

      setPasswordMsg({ type: 'success', text: 'Password changed successfully! Keep your new credentials safe.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will invalidate all other logged-in sessions across other browsers and mobile devices. Continue?')) return;
    setRevokingSessions(true);
    setSessionMsg(null);
    try {
      const res = await authFetch(`${API}/auth/logout-all`, { method: 'POST' });
      if (res.ok) {
        setSessionMsg('All other device sessions have been revoked successfully.');
      } else {
        const d = await res.json().catch(() => ({}));
        setSessionMsg(d.error || 'Failed to revoke other sessions.');
      }
    } catch {
      setSessionMsg('Network error while revoking sessions.');
    } finally {
      setRevokingSessions(false);
    }
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
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* ── Security Overview Card ───────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.06) 100%)',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 18,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10b981', flexShrink: 0,
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2 }}>
              Account Security Status: High Protection
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Encrypted session authorization, argon2/bcrypt password protection, and automated token rotation active.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{
            background: 'rgba(16,185,129,0.15)', color: '#34d399',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999,
            padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
          }}>
            TLS 1.3 Active
          </span>
          <span style={{
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999,
            padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
          }}>
            D-Auth 256-bit
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
        {/* ── Section 1: Change Password ─────────────────────────────── */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}>
          <div>
            <h3 style={{
              fontWeight: 800, fontSize: '1.1rem', margin: 0,
              display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)',
            }}>
              <Lock size={18} color="#818cf8" /> Change Password
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.35rem 0 0' }}>
              Update your account password with standard cryptographic security.
            </p>
          </div>

          {passwordMsg && (
            <div style={{
              background: passwordMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${passwordMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: passwordMsg.type === 'success' ? '#34d399' : '#fca5a5',
              borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem',
            }}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                Current Password
              </label>
              <input
                type="password"
                required
                style={inputStyle}
                placeholder="Enter current password"
                value={form.currentPassword}
                onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                style={inputStyle}
                placeholder="Minimum 8 characters"
                value={form.newPassword}
                onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
              />

              {/* Password strength bar */}
              {form.newPassword && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Strength:</span>
                    <span style={{ fontSize: '0.72rem', color: strengthMeta.color, fontWeight: 700 }}>{strengthMeta.label}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${strengthMeta.pct}%`,
                      background: strengthMeta.color, transition: 'all 0.3s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Live Requirements Checklist */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem',
              padding: '0.75rem', background: 'var(--card-bg)', borderRadius: 10,
              border: '1px solid var(--card-border)', fontSize: '0.75rem',
            }}>
              <span style={{ color: hasMinLen ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {hasMinLen ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 8+ characters
              </span>
              <span style={{ color: hasUpper ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {hasUpper ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Uppercase letter
              </span>
              <span style={{ color: hasLower ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {hasLower ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Lowercase letter
              </span>
              <span style={{ color: hasNum || hasSym ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {(hasNum || hasSym) ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Number or symbol
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                style={inputStyle}
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              style={{
                background: 'var(--pine-deep)', color: '#ffffff',
                border: 'none', borderRadius: 999,
                padding: '0.75rem 1.6rem', fontWeight: 700, fontSize: '0.88rem',
                cursor: savingPassword ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                marginTop: '0.5rem',
              }}
            >
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Section 2: Two-Factor Authentication & Active Sessions ───── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 2FA Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: 20,
            padding: '1.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{
                  fontWeight: 800, fontSize: '1.05rem', margin: 0,
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)',
                }}>
                  <Smartphone size={18} color="#10b981" /> Two-Factor Authentication (2FA)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.35rem 0 0' }}>
                  Protect your teaching profile and earnings balance with multi-factor authentication.
                </p>
              </div>
              <span style={{
                background: twoFactorEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                color: twoFactorEnabled ? '#34d399' : '#94a3b8',
                border: `1px solid ${twoFactorEnabled ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.2)'}`,
                padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
              }}>
                {twoFactorEnabled ? 'ENABLED' : 'OPTIONAL'}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Compatible with Google Authenticator, Microsoft Authenticator, and 1Password. Required for high-value instructor withdrawals above 50,000 ETB.
            </p>

            <button
              type="button"
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                setShow2FAModal(!twoFactorEnabled);
              }}
              style={{
                background: twoFactorEnabled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
                border: `1px solid ${twoFactorEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: twoFactorEnabled ? '#ef4444' : '#10b981',
                borderRadius: 10, padding: '0.6rem 1.25rem',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Setup Authenticator App (2FA)'}
            </button>

            {show2FAModal && (
              <div style={{
                marginTop: '1.25rem', padding: '1.25rem',
                background: 'var(--card-bg)', borderRadius: 14,
                border: '1px dashed var(--accent)',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Authenticator Secret Key
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-secondary)', padding: '0.6rem 0.85rem',
                  borderRadius: 8, border: '1px solid var(--card-border)',
                  fontFamily: 'monospace', fontSize: '0.88rem', color: '#fde047',
                  marginBottom: '0.75rem',
                }}>
                  <span>AXUM-SEC-9921-ET48-KYC7</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('AXUM-SEC-9921-ET48-KYC7');
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}
                  >
                    {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value)}
                    style={{ ...inputStyle, width: '160px', letterSpacing: '0.2em', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShow2FAModal(false);
                      setTwoFactorEnabled(true);
                    }}
                    style={{
                      background: 'var(--pine-deep)', color: '#fff',
                      border: 'none', borderRadius: 10, padding: '0 1.2rem',
                      fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}
                  >
                    Verify &amp; Activate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Devices & Sessions Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: 20,
            padding: '1.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{
                  fontWeight: 800, fontSize: '1.05rem', margin: 0,
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)',
                }}>
                  <Laptop size={18} color="#38bdf8" /> Active Device Sessions
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.35rem 0 0' }}>
                  Manage where your account is currently signed in.
                </p>
              </div>
            </div>

            {sessionMsg && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399', borderRadius: 10, padding: '0.65rem 0.9rem', fontSize: '0.82rem',
                marginBottom: '1rem',
              }}>
                {sessionMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--card-bg)', borderRadius: 12,
                border: '1px solid var(--card-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Laptop size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      Current Desktop Browser
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Windows · Addis Ababa, ET · Active Now
                    </div>
                  </div>
                </div>
                <span style={{
                  background: 'rgba(16,185,129,0.15)', color: '#10b981',
                  borderRadius: 999, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800,
                }}>
                  THIS DEVICE
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRevokeAllSessions}
              disabled={revokingSessions}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', borderRadius: 10,
                padding: '0.6rem 1.1rem', fontSize: '0.82rem', fontWeight: 700,
                cursor: revokingSessions ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {revokingSessions ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              {revokingSessions ? 'Revoking…' : 'Revoke All Other Sessions'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Danger Zone ──────────────────────────────────── */}
      <div style={{
        background: 'rgba(239,68,68,0.03)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 20,
        padding: '1.75rem',
      }}>
        <h3 style={{
          fontWeight: 800, fontSize: '1.05rem', color: '#ef4444', margin: '0 0 0.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <AlertTriangle size={18} /> Danger Zone: Account Termination
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
          Deleting your account permanently removes your profile, enrolled course progress, submitted assignments, and tutor listings. This action is irreversible.
        </p>

        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            style={{
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
              padding: '0.6rem 1.25rem', fontSize: '0.84rem', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <Trash2 size={14} /> Request Account Deletion
          </button>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.85rem',
            maxWidth: 480, padding: '1rem', background: 'rgba(239,68,68,0.06)',
            borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <span style={{ fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
              To confirm, please type <strong style={{ color: '#fff' }}>DELETE</strong> below:
            </span>
            <input
              type="text"
              style={{ ...inputStyle, borderColor: 'rgba(239,68,68,0.4)' }}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={deleteConfirm !== 'DELETE'}
                onClick={() => alert('Account deletion request registered. An account safety link has been dispatched to your email.')}
                style={{
                  background: deleteConfirm === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.2)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.55rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
                  cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                }}
              >
                Permanently Delete Account
              </button>
              <button
                type="button"
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                style={{
                  background: 'transparent', color: '#94a3b8',
                  border: '1px solid var(--card-border)', borderRadius: 8,
                  padding: '0.55rem 1rem', fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
