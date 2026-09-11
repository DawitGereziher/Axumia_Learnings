'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/auth';

interface LeaderboardEntry {
  rank:           number;
  user_id:        string;
  name:           string;
  avatar:         string | null;
  total_xp:       number;
  level:          number;
  current_streak: number;
}

const LEVEL_NAMES = ['Newcomer', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Legend', 'Champion'];
const RANK_COLORS = ['#fde047', '#94a3b8', '#cd7f32', '#64748b'];  // gold, silver, bronze, rest

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/gamification/leaderboard')
      .then((r) => r.ok ? r.json() : [])
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#060f1a', padding: '2rem 1.5rem', paddingTop: '5.5rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#f8fafc', marginBottom: '0.4rem' }}>
              Leaderboard
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Top learners ranked by total XP earned</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {entries.map((entry) => {
                const isTop3  = entry.rank <= 3;
                const rankColor = RANK_COLORS[entry.rank - 1] ?? RANK_COLORS[3];
                const levelName = LEVEL_NAMES[entry.level - 1] ?? 'Champion';
                return (
                  <div key={entry.user_id} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '1rem',
                    padding:      isTop3 ? '1.25rem 1.5rem' : '0.9rem 1.5rem',
                    borderRadius: 18,
                    background:   isTop3
                      ? `linear-gradient(135deg, rgba(12,59,46,0.3), rgba(21,128,90,0.15))`
                      : 'rgba(255,255,255,0.03)',
                    border:       `1px solid ${isTop3 ? 'rgba(12,59,46,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    transition:   'transform 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    {/* Rank */}
                    <div style={{
                      width:       isTop3 ? 44 : 36,
                      height:      isTop3 ? 44 : 36,
                      borderRadius: '50%',
                      flexShrink:  0,
                      background:  isTop3 ? `rgba(${entry.rank === 1 ? '253,224,71' : entry.rank === 2 ? '148,163,184' : '205,127,50'},0.15)` : 'rgba(255,255,255,0.06)',
                      border:      `2px solid ${rankColor}`,
                      display:     'flex',
                      alignItems:  'center',
                      justifyContent: 'center',
                      fontSize:    isTop3 ? '1.1rem' : '0.85rem',
                      fontWeight:  800,
                      color:       rankColor,
                    }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>

                    {/* Avatar */}
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: 700, color: '#fde047',
                      }}>
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name + level */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: isTop3 ? '1rem' : '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Level {entry.level} · {levelName}
                        {entry.current_streak > 0 && (
                          <span style={{ marginLeft: '0.5rem' }}>🔥 {entry.current_streak} day streak</span>
                        )}
                      </div>
                    </div>

                    {/* XP */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: isTop3 ? '1.2rem' : '1rem', fontWeight: 900, color: '#fde047', fontFamily: 'Outfit, sans-serif' }}>
                        {entry.total_xp.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>XP</div>
                    </div>
                  </div>
                );
              })}

              {entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                  <p>No data yet — complete lessons to appear on the leaderboard!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
