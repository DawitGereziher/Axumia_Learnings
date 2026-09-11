'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge {
  id:          string;
  label:       string;
  description: string;
  icon:        string;
  earned:      boolean;
  earned_at:   string | null;
}

interface GamificationStats {
  total_xp:       number;
  level:          number;
  current_streak: number;
  longest_streak: number;
  next_level_xp:  number | null;
  badges:         Badge[];
  recent_xp:      { id: string; reason: string; amount: number; created_at: string }[];
}

// ─── XP level thresholds (mirrors backend constants) ─────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000];
const LEVEL_NAMES = ['Newcomer', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Legend', 'Champion'];

function getLevelProgress(totalXp: number, level: number): { current: number; needed: number; pct: number } {
  const start  = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const end    = LEVEL_THRESHOLDS[level]     ?? null;
  if (end === null) return { current: totalXp - start, needed: 0, pct: 100 };
  const current = totalXp - start;
  const needed  = end - start;
  return { current, needed, pct: Math.round((current / needed) * 100) };
}

// ─── AwardXP helper (exported so other components can call it) ────────────────
// Usage: await awardXP('lesson_complete', { lesson_id: 'abc' })

export async function awardXP(
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<{ awarded: number; new_badges: string[] } | null> {
  try {
    const res = await authFetch('/api/gamification/award', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason, metadata }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null; // gamification is non-critical — never block the learning flow
  }
}

// ─── Reason → readable label ──────────────────────────────────────────────────
const REASON_LABELS: Record<string, string> = {
  lesson_complete:  '+20 XP · Lesson completed',
  quiz_passed:      '+50 XP · Quiz passed',
  quiz_perfect:     '+100 XP · Perfect quiz score!',
  course_complete:  '+200 XP · Course completed',
  session_booked:   '+30 XP · Session booked',
  daily_checkin:    '+5 XP · Daily check-in',
  streak_bonus:     '+100 XP · Streak bonus! 🔥',
};

// ─── Mini Badge Toast ─────────────────────────────────────────────────────────

export function BadgeToast({ badgeIds, onDone }: { badgeIds: string[]; onDone: () => void }) {
  const BADGE_INFO: Record<string, { label: string; icon: string }> = {
    first_lesson:  { label: 'First Step',    icon: '🎯' },
    first_quiz:    { label: 'Quiz Taker',    icon: '📝' },
    perfect_score: { label: 'Perfect Score', icon: '💯' },
    first_course:  { label: 'Graduate',      icon: '🎓' },
    five_courses:  { label: 'Scholar',       icon: '📚' },
    bookworm:      { label: 'Bookworm',      icon: '📖' },
    week_streak:   { label: '7-Day Streak',  icon: '🔥' },
    month_streak:  { label: '30-Day Streak', icon: '⚡' },
    session_goer:  { label: 'Live Learner',  icon: '🎙️' },
    speed_learner: { label: 'Speed Learner', icon: '⚡' },
  };

  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      {badgeIds.map((id) => {
        const b = BADGE_INFO[id] ?? { label: id, icon: '🏅' };
        return (
          <div key={id} style={{
            background:   'linear-gradient(135deg, rgba(12,59,46,0.95), rgba(21,128,90,0.9))',
            border:       '1px solid rgba(253,224,71,0.4)',
            borderRadius: 14,
            padding:      '0.9rem 1.25rem',
            display:      'flex',
            alignItems:   'center',
            gap:          '0.75rem',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
            animation:    'slideIn 0.3s ease',
          }}>
            <span style={{ fontSize: '1.8rem' }}>{b.icon}</span>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#fde047', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                New Badge Earned!
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                {b.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

interface GamificationWidgetProps {
  compact?: boolean;   // true = small header strip, false = full card
}

export default function GamificationWidget({ compact = false }: GamificationWidgetProps) {
  const [stats, setStats]       = useState<GamificationStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showBadges, setShowBadges] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/gamification/me');
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ height: compact ? 56 : 160, background: 'rgba(255,255,255,0.02)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #0c3b2e', borderTopColor: '#fde047', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!stats) return null;

  const { current, needed, pct } = getLevelProgress(stats.total_xp, stats.level);
  const levelName = LEVEL_NAMES[stats.level - 1] ?? 'Champion';
  const earnedCount = stats.badges.filter((b) => b.earned).length;

  // ── Compact mode (for navbar / header strip) ──────────────────────────────
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'rgba(12,59,46,0.2)', border: '1px solid rgba(12,59,46,0.4)',
        borderRadius: 12, padding: '0.5rem 1rem',
      }}>
        {/* Level badge */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
          border: '2px solid rgba(253,224,71,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 800, color: '#fde047',
        }}>
          {stats.level}
        </div>
        {/* XP bar */}
        <div style={{ flex: 1, minWidth: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{levelName}</span>
            <span>{stats.total_xp} XP</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: 'linear-gradient(90deg, #0c3b2e, #fde047)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <span style={{ fontSize: '1rem' }}>🔥</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fde047' }}>{stats.current_streak}</span>
        </div>
      </div>
    );
  }

  // ── Full card mode (for dashboard) ───────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Top stats row */}
      <div style={{
        background:   'linear-gradient(135deg, rgba(12,59,46,0.4), rgba(21,128,90,0.2))',
        border:       '1px solid rgba(12,59,46,0.5)',
        borderRadius: 20, padding: '1.75rem',
        display:      'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Level ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={44} cy={44} r={36} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
            <circle
              cx={44} cy={44} r={36} fill="none"
              stroke="url(#xpGrad)" strokeWidth={7} strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
            <defs>
              <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0c3b2e" />
                <stop offset="100%" stopColor="#fde047" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fde047', lineHeight: 1 }}>{stats.level}</span>
            <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: 1 }}>LEVEL</span>
          </div>
        </div>

        {/* XP info */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            {levelName}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif', lineHeight: 1, marginBottom: '0.5rem' }}>
            {stats.total_xp.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>XP</span>
          </div>
          {/* XP progress bar */}
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '0.35rem' }}>
            <div style={{
              height: '100%', borderRadius: 999, width: `${pct}%`,
              background: 'linear-gradient(90deg, #0c3b2e, #15805a, #fde047)',
              transition: 'width 0.8s ease',
              boxShadow: '0 0 8px rgba(253,224,71,0.3)',
            }} />
          </div>
          {needed > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {current} / {needed} XP to Level {stats.level + 1}
            </div>
          )}
          {needed === 0 && (
            <div style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 600 }}>🏆 Max Level!</div>
          )}
        </div>

        {/* Streak */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
          background: stats.current_streak > 0 ? 'rgba(253,224,71,0.08)' : 'rgba(255,255,255,0.04)',
          border: stats.current_streak > 0 ? '1px solid rgba(253,224,71,0.2)' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '1rem 1.25rem', flexShrink: 0,
        }}>
          <span style={{ fontSize: '2rem' }}>🔥</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fde047', lineHeight: 1, fontFamily: 'Outfit, sans-serif' }}>
            {stats.current_streak}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>day streak</span>
          {stats.longest_streak > 0 && (
            <span style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.2rem' }}>
              Best: {stats.longest_streak}
            </span>
          )}
        </div>
      </div>

      {/* Badges section */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18, padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Badges ({earnedCount}/{stats.badges.length})
          </div>
          <button
            onClick={() => setShowBadges(!showBadges)}
            style={{ fontSize: '0.78rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showBadges ? 'Hide' : 'Show all'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          {stats.badges
            .filter((b) => showBadges || b.earned)
            .map((b) => (
              <div
                key={b.id}
                title={b.description + (b.earned ? '' : ' (not yet earned)')}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.4rem',
                  padding:      '0.4rem 0.8rem',
                  borderRadius: 10,
                  background:   b.earned ? 'rgba(12,59,46,0.4)' : 'rgba(255,255,255,0.03)',
                  border:       b.earned ? '1px solid rgba(253,224,71,0.25)' : '1px solid rgba(255,255,255,0.07)',
                  opacity:      b.earned ? 1 : 0.4,
                  cursor:       'default',
                  transition:   'transform 0.15s',
                }}
                onMouseEnter={(e) => { if (b.earned) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: '1.1rem' }}>{b.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: b.earned ? 700 : 400, color: b.earned ? '#f1f5f9' : '#64748b' }}>
                  {b.label}
                </span>
              </div>
            ))}
          {!showBadges && earnedCount === 0 && (
            <p style={{ fontSize: '0.85rem', color: '#64748b', padding: '0.5rem 0' }}>
              Complete lessons and quizzes to earn your first badge!
            </p>
          )}
        </div>
      </div>

      {/* Recent XP activity */}
      {stats.recent_xp.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, padding: '1.25rem',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {stats.recent_xp.slice(0, 5).map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>{REASON_LABELS[log.reason] ?? log.reason}</span>
                <span style={{ color: '#fde047', fontWeight: 700 }}>+{log.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
