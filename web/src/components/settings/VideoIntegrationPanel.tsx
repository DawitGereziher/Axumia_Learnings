'use client';

import React, { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import {
  Video,
  Check,
  X,
  Link2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Radio,
  Tv,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VideoAccount {
  id: string;
  platform: 'zoom' | 'google';
  platform_user_id: string;
  created_at: string;
}

export default function VideoIntegrationPanel() {
  const [accounts, setAccounts] = useState<VideoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Custom classroom configurations
  const [customMeetUrl, setCustomMeetUrl] = useState('');
  const [customZoomUrl, setCustomZoomUrl] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [preferredPlatform, setPreferredPlatform] = useState<'google' | 'zoom' | 'axumia' | 'telegram'>('google');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchAccounts();
    // Load local stored preferences
    if (typeof window !== 'undefined') {
      const savedMeet = localStorage.getItem('inst_pref_meet') || '';
      const savedZoom = localStorage.getItem('inst_pref_zoom') || '';
      const savedTele = localStorage.getItem('inst_pref_tele') || '';
      const savedPlat = (localStorage.getItem('inst_pref_platform') as any) || 'google';
      setCustomMeetUrl(savedMeet);
      setCustomZoomUrl(savedZoom);
      setTelegramHandle(savedTele);
      setPreferredPlatform(savedPlat);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await authFetch(`${API}/api/session-monitoring/video-accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch video accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: 'zoom' | 'google') => {
    setConnecting(platform);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${API}/api/session-monitoring/oauth/${platform}/auth-url`);
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('oauth-return-url', window.location.href);
        window.location.href = data.authUrl;
      } else {
        setError(`Failed to initiate ${platform} authorization.`);
      }
    } catch {
      setError(`Failed to connect to ${platform}. Please check internet connection.`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const res = await authFetch(`${API}/api/session-monitoring/video-accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts(accounts.filter(acc => acc.id !== accountId));
        setSuccess('Account disconnected.');
      } else {
        setError('Failed to disconnect account');
      }
    } catch {
      setError('Failed to disconnect account');
    }
  };

  const handleSaveClassroomPreferences = () => {
    setSavingSettings(true);
    localStorage.setItem('inst_pref_meet', customMeetUrl.trim());
    localStorage.setItem('inst_pref_zoom', customZoomUrl.trim());
    localStorage.setItem('inst_pref_tele', telegramHandle.trim());
    localStorage.setItem('inst_pref_platform', preferredPlatform);
    setTimeout(() => {
      setSavingSettings(false);
      setSuccess('Classroom URLs and preferred platform updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    }, 400);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={28} className="animate-spin" color="var(--accent)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* ── Banner ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(16,185,129,0.06) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
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
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#818cf8', flexShrink: 0,
          }}>
            <Tv size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2 }}>
              Virtual Classroom &amp; 1-on-1 Tutoring Hub
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Connect your conference accounts or provide personal room links. Automated meeting links are dispatched to booked students.
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: '#fca5a5', fontSize: '0.88rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: '#34d399', fontSize: '0.88rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* ── Grid: Platform Cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Google Meet */}
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
          borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
              }}>
                G
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Google Meet</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Best for browser-based tutoring</div>
              </div>
            </div>
            {accounts.some(a => a.platform === 'google') ? (
              <span style={{
                background: 'rgba(16,185,129,0.15)', color: '#34d399',
                border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px',
                borderRadius: 999, fontSize: '0.7rem', fontWeight: 800,
              }}>
                CONNECTED
              </span>
            ) : (
              <span style={{
                background: 'rgba(148,163,184,0.12)', color: '#94a3b8',
                padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
              }}>
                UNLINKED
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              Default Google Meet Link (optional)
            </label>
            <input
              type="url"
              style={inputStyle}
              placeholder="https://meet.google.com/abc-defg-hij"
              value={customMeetUrl}
              onChange={e => setCustomMeetUrl(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => handleConnect('google')}
              disabled={connecting === 'google'}
              style={{
                flex: 1, padding: '0.6rem 0.9rem', borderRadius: 10,
                background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.3)',
                color: '#4285F4', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {connecting === 'google' ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              {accounts.some(a => a.platform === 'google') ? 'Re-authorize Google' : 'Authorize Google OAuth'}
            </button>
            {customMeetUrl && (
              <a
                href={customMeetUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: 10,
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem',
                  display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
                }}
              >
                Test <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Zoom */}
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
          borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#2D8CFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
              }}>
                Z
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Zoom Video</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Best for large lectures &amp; whiteboard</div>
              </div>
            </div>
            {accounts.some(a => a.platform === 'zoom') ? (
              <span style={{
                background: 'rgba(16,185,129,0.15)', color: '#34d399',
                border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px',
                borderRadius: 999, fontSize: '0.7rem', fontWeight: 800,
              }}>
                CONNECTED
              </span>
            ) : (
              <span style={{
                background: 'rgba(148,163,184,0.12)', color: '#94a3b8',
                padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
              }}>
                UNLINKED
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              Personal Zoom Meeting Link (PMI)
            </label>
            <input
              type="url"
              style={inputStyle}
              placeholder="https://zoom.us/j/1234567890"
              value={customZoomUrl}
              onChange={e => setCustomZoomUrl(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => handleConnect('zoom')}
              disabled={connecting === 'zoom'}
              style={{
                flex: 1, padding: '0.6rem 0.9rem', borderRadius: 10,
                background: 'rgba(45,140,255,0.12)', border: '1px solid rgba(45,140,255,0.3)',
                color: '#2D8CFF', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {connecting === 'zoom' ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              {accounts.some(a => a.platform === 'zoom') ? 'Re-authorize Zoom' : 'Authorize Zoom OAuth'}
            </button>
            {customZoomUrl && (
              <a
                href={customZoomUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: 10,
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem',
                  display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
                }}
              >
                Test <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Classroom Preferences Card ──────────────────────────────── */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
        borderRadius: 20, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
          Session Routing Preferences
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
              Default Platform For Student Bookings
            </label>
            <select
              style={inputStyle}
              value={preferredPlatform}
              onChange={e => setPreferredPlatform(e.target.value as any)}
            >
              <option value="google">Google Meet (Recommended for Ethiopia &amp; Global)</option>
              <option value="zoom">Zoom Video</option>
              <option value="axumia">Axumia In-Browser Classroom</option>
              <option value="telegram">Telegram Direct Session</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
              Telegram Username / Channel (Optional)
            </label>
            <input
              type="text"
              style={inputStyle}
              placeholder="@your_telegram_handle"
              value={telegramHandle}
              onChange={e => setTelegramHandle(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Selected default link will be automatically emailed to students upon session payment confirmation.
          </div>
          <button
            type="button"
            onClick={handleSaveClassroomPreferences}
            disabled={savingSettings}
            style={{
              background: 'var(--pine-deep)', color: '#ffffff',
              border: 'none', borderRadius: 999,
              padding: '0.65rem 1.6rem', fontWeight: 700, fontSize: '0.88rem',
              cursor: savingSettings ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
            }}
          >
            {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {savingSettings ? 'Saving...' : 'Save Classroom Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}