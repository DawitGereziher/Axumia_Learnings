'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';
import { Video, Loader2, AlertCircle, CheckCircle2, Calendar, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface MeetingCreatorProps {
  onMeetingCreated: (meetingUrl: string, platform: 'zoom' | 'google') => void;
  defaultDuration?: number;
  defaultTitle?: string;
  scheduledTime?: Date;
}

export default function MeetingCreator({
  onMeetingCreated,
  defaultDuration = 60,
  defaultTitle = 'Help Session',
  scheduledTime,
}: MeetingCreatorProps) {
  const [platform, setPlatform] = useState<'zoom' | 'google' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ zoom: boolean; google: boolean }>({
    zoom: false,
    google: false,
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const [zoomRes, googleRes] = await Promise.all([
        authFetch(`${API}/api/session-monitoring/accounts/zoom/check`),
        authFetch(`${API}/api/session-monitoring/accounts/google/check`),
      ]);

      const zoomData = zoomRes.ok ? await zoomRes.json() : { connected: false };
      const googleData = googleRes.ok ? await googleRes.json() : { connected: false };

      setConnectionStatus({
        zoom: zoomData.connected,
        google: googleData.connected,
      });
    } catch (err) {
      console.error('Failed to check connection status:', err);
    }
  };

  const handleCreateMeeting = async () => {
    if (!platform) return;

    setIsCreating(true);
    setError(null);

    try {
      const endpoint = platform === 'zoom' 
        ? `${API}/api/session-monitoring/meetings/zoom`
        : `${API}/api/session-monitoring/meetings/google`;

      const body = platform === 'zoom'
        ? {
            topic: defaultTitle,
            startTime: scheduledTime?.toISOString() || new Date(Date.now() + 15 * 60000).toISOString(),
            durationMinutes: defaultDuration,
          }
        : {
            title: defaultTitle,
            startTime: scheduledTime?.toISOString() || new Date(Date.now() + 15 * 60000).toISOString(),
            durationMinutes: defaultDuration,
          };

      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Meeting creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create meeting');
      }

      const data = await response.json();
      console.log('Meeting created successfully:', data);
      onMeetingCreated(data.meetingUrl, platform);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const getPlatformInfo = (p: 'zoom' | 'google') => {
    const isConnected = connectionStatus[p];
    return {
      name: p === 'zoom' ? 'Zoom' : 'Google Meet',
      color: p === 'zoom' ? '#2D8CFF' : '#4285F4',
      icon: p === 'zoom' ? '🎥' : '📹',
      isConnected,
    };
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Video size={18} style={{ color: '#10b981' }} />
        <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 600, fontSize: '1rem', margin: 0 }}>
          Create Meeting
        </h3>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {(['zoom', 'google'] as const).map((p) => {
          const info = getPlatformInfo(p);
          const isSelected = platform === p;
          const isDisabled = !info.isConnected;

          return (
            <button
              key={p}
              onClick={() => !isDisabled && setPlatform(p)}
              disabled={isDisabled || isCreating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: isSelected
                  ? `${info.color}15`
                  : 'rgba(255,255,255,0.02)',
                border: isSelected
                  ? `1px solid ${info.color}40`
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: info.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}
                >
                  {info.icon}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {info.isConnected ? (
                      <>
                        <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                        Connected
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} style={{ color: '#ef4444' }} />
                        Not connected
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: info.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'white',
                  }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {platform && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={12} />
              Duration: {defaultDuration} min
            </div>
            {scheduledTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={12} />
                {new Date(scheduledTime).toLocaleString()}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateMeeting}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              color: '#34d399',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating meeting...
              </>
            ) : (
              `Create ${platform === 'zoom' ? 'Zoom' : 'Google Meet'} Meeting`
            )}
          </button>
        </div>
      )}

      {!connectionStatus.zoom && !connectionStatus.google && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8,
          fontSize: '0.8rem',
          color: '#fcd34d',
          textAlign: 'center',
        }}>
          Connect Zoom or Google Meet in settings to create meetings automatically
        </div>
      )}
    </div>
  );
}