'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';

import { Lock, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SecurityPanel() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (form.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to change password');
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.9rem 1.1rem',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#f8fafc', fontSize: '0.9rem', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 540 }}>
      {/* Change Password */}
      <section>
        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={18} color="#818cf8" /> {t.security?.changePassword || 'Change Password'}
        </h3>

        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? '#34d399' : '#fca5a5',
            borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem',
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.security?.currentPassword || 'Current Password'}</label>
            <input id="sec-old-password" type="password" name="oldPassword" style={inputStyle}
              value={form.oldPassword} onChange={handleChange} required placeholder={t.security?.currentPassword || 'Enter current password'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.security?.newPassword || 'New Password'}</label>
            <input id="sec-new-password" type="password" name="newPassword" style={inputStyle}
              value={form.newPassword} onChange={handleChange} required placeholder="At least 8 characters" minLength={8} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{t.security?.confirmPassword || 'Confirm New Password'}</label>
            <input id="sec-confirm-password" type="password" name="confirmPassword" style={inputStyle}
              value={form.confirmPassword} onChange={handleChange} required placeholder={t.security?.confirmPassword || 'Repeat new password'} />
          </div>

          {/* Strength indicator */}
          {form.newPassword && (
            <div>
              <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.3s, background 0.3s',
                  width: `${Math.min(100, form.newPassword.length * 8)}%`,
                  background: form.newPassword.length < 8 ? '#ef4444' : form.newPassword.length < 12 ? '#f59e0b' : '#10b981',
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                {form.newPassword.length < 8 ? 'Too short' : form.newPassword.length < 12 ? 'Good' : 'Strong'}
              </span>
            </div>
          )}

          <button id="change-password-btn" type="submit" className="btn-primary"
            disabled={saving} style={{ opacity: saving ? 0.7 : 1, width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? (t.security?.updating || 'Updating...') : (t.security?.updatePassword || 'Update Password')}
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section>
        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="#ef4444" /> {t.security?.dangerZone || 'Danger Zone'}
        </h3>
        <div style={{ border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1rem' }}>
            {t.security?.deleteAccountWarning || 'Permanently delete your account and all associated data. This action cannot be undone.'}
          </p>
          {!showDelete ? (
            <button id="delete-account-trigger" onClick={() => setShowDelete(true)}
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trash2 size={15} /> {t.security?.deleteAccount || 'Delete Account'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                {t.security?.deleteAccountConfirmMsg || 'Type DELETE to confirm account removal'}:
              </p>
              <input id="delete-confirm-input" type="text" style={{ ...inputStyle, borderColor: 'rgba(239,68,68,0.4)' }}
                placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button id="delete-account-confirm"
                  disabled={deleteConfirm !== 'DELETE'}
                  style={{ background: deleteConfirm === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.15)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed', opacity: deleteConfirm === 'DELETE' ? 1 : 0.5 }}>
                  {t.security?.confirmDeleteBtn || 'Confirm Delete'}
                </button>
                <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.6rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  {t.common?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
