'use client';

import React from 'react';
import { Video, Clock, AlertTriangle, CheckCircle2, XCircle, Shield, ShieldAlert } from 'lucide-react';

interface SessionMonitoringIndicatorProps {
  platform?: string | null;
  sessionStartedAt?: string | null;
  sessionEndedAt?: string | null;
  sessionDurationM?: number | null;
  sessionFlag?: string | null;
}

export default function SessionMonitoringIndicator({
  platform,
  sessionStartedAt,
  sessionEndedAt,
  sessionDurationM,
  sessionFlag,
}: SessionMonitoringIndicatorProps) {
  if (!platform && !sessionFlag) {
    return null;
  }

  const getPlatformInfo = () => {
    if (!platform) return null;
    const isZoom = platform === 'zoom';
    return {
      name: isZoom ? 'Zoom' : 'Google Meet',
      color: isZoom ? '#2D8CFF' : '#4285F4',
      icon: isZoom ? '🎥' : '📹',
    };
  };

  const getFlagInfo = () => {
    const flags: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
      short_session: {
        label: 'Short Session',
        color: '#f59e0b',
        icon: <AlertTriangle size={12} />,
        description: 'Session was 70-90% of booked duration',
      },
      early_end: {
        label: 'Early End',
        color: '#ef4444',
        icon: <XCircle size={12} />,
        description: 'Session was less than 70% of booked duration',
      },
      no_start: {
        label: 'No Start',
        color: '#ef4444',
        icon: <XCircle size={12} />,
        description: 'Session was never started',
      },
      unmonitored: {
        label: 'Unmonitored',
        color: '#64748b',
        icon: <ShieldAlert size={12} />,
        description: 'Session could not be monitored',
      },
    };
    return sessionFlag ? flags[sessionFlag] : null;
  };

  const platformInfo = getPlatformInfo();
  const flagInfo = getFlagInfo();

  const isMonitored = !sessionFlag || sessionFlag === 'short_session';
  const hasMonitoringData = sessionStartedAt || sessionDurationM;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '0.85rem 1rem',
      marginTop: '0.75rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Video size={14} style={{ color: '#10b981' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
          Session Monitoring
        </span>
        {isMonitored ? (
          <CheckCircle2 size={12} style={{ color: '#10b981' }} />
        ) : (
          <AlertTriangle size={12} style={{ color: flagInfo?.color || '#f59e0b' }} />
        )}
      </div>

      {/* Platform Info */}
      {platformInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{platformInfo.icon}</span>
          <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
            {platformInfo.name}
          </span>
        </div>
      )}

      {/* Duration Info */}
      {hasMonitoringData && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
          {sessionDurationM !== null && sessionDurationM !== undefined && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={12} />
              Duration: <strong style={{ color: '#94a3b8' }}>{sessionDurationM}m</strong>
            </span>
          )}
          {sessionStartedAt && (
            <span>
              Started: <strong style={{ color: '#94a3b8' }}>{new Date(sessionStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          )}
        </div>
      )}

      {/* Flag Warning */}
      {flagInfo && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: `${flagInfo.color}15`,
          border: `1px solid ${flagInfo.color}30`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ color: flagInfo.color }}>{flagInfo.icon}</span>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: flagInfo.color }}>
              {flagInfo.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
              {flagInfo.description}
            </span>
          </div>
        </div>
      )}

      {/* Unmonitored State */}
      {!hasMonitoringData && !sessionFlag && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(100,116,139,0.1)',
          border: '1px solid rgba(100,116,139,0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <ShieldAlert size={12} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Waiting for session data...
          </span>
        </div>
      )}
    </div>
  );
}