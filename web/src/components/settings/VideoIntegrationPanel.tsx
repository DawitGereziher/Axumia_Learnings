'use client';

import React, { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { Video, Check, X, Link2, Loader2, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    fetchAccounts();
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
    try {
      const res = await authFetch(`${API}/api/session-monitoring/oauth/${platform}/auth-url`);
      if (res.ok) {
        const data = await res.json();
        // Store the current URL to return after OAuth
        sessionStorage.setItem('oauth-return-url', window.location.href);
        window.location.href = data.authUrl;
      } else {
        setError('Failed to get authorization URL');
      }
    } catch (err) {
      setError('Failed to connect account');
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
      } else {
        setError('Failed to disconnect account');
      }
    } catch (err) {
      setError('Failed to disconnect account');
    }
  };

  const getPlatformName = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'zoom' ? '#2D8CFF' : '#4285F4';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Video size={20} style={{ color: '#10b981' }} />
        <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
          Video Platform Integration
        </h3>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Connect your Zoom and Google Meet accounts to enable automatic session monitoring. 
        This allows the system to track session duration and ensure fair payouts.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(['zoom', 'google'] as const).map(platform => {
          const account = accounts.find(acc => acc.platform === platform);
          const isConnecting = connecting === platform;

          return (
            <div
              key={platform}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: getPlatformColor(platform),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {getPlatformName(platform).slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                    {getPlatformName(platform)}
                  </div>
                  {account ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#10b981' }}>
                      <Check size={14} />
                      <span>Connected as {account.platform_user_id}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Not connected</div>
                  )}
                </div>
              </div>

              {account ? (
                <button
                  onClick={() => handleDisconnect(account.id)}
                  disabled={isConnecting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 6,
                    color: '#fca5a5',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    opacity: isConnecting ? 0.6 : 1,
                  }}
                >
                  {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(platform)}
                  disabled={isConnecting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 6,
                    color: '#6ee7b7',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    opacity: isConnecting ? 0.6 : 1,
                  }}
                >
                  {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={16} style={{ color: '#60a5fa', marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.85rem', color: '#93c5fd', lineHeight: 1.5 }}>
            <strong style={{ color: '#bfdbfe' }}>Why connect?</strong> Connected accounts enable automatic session tracking 
            through webhooks. This helps ensure accurate session duration recording and fair instructor payouts.
          </div>
        </div>
      </div>
    </div>
  );
}