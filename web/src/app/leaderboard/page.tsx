'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { authFetch } from '@/lib/auth';
import {
  Trophy,
  Flame,
  Award,
  Crown,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  ArrowRight,
  Shield,
  Medal,
  Clock,
  Filter,
} from 'lucide-react';

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

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'top10' | 'streaks'>('all');

  useEffect(() => {
    authFetch('/api/gamification/leaderboard')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (activeFilter === 'top10') {
      list = list.slice(0, 10);
    } else if (activeFilter === 'streaks') {
      list = [...list].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
    }
    return list;
  }, [entries, searchQuery, activeFilter]);

  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const totalCommunityXP = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (curr.total_xp || 0), 0);
  }, [entries]);

  const maxStreak = useMemo(() => {
    return entries.reduce((max, curr) => Math.max(max, curr.current_streak || 0), 0);
  }, [entries]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{
          width: '100%',
          maxWidth: 1720,
          margin: '0 auto',
          padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem',
          boxSizing: 'border-box',
        }}>

          {/* ── International-Grade Hero Banner ───────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 28,
            padding: 'clamp(2rem, 4vw, 3.25rem) clamp(1.5rem, 3.5vw, 3rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
            marginBottom: '2.5rem',
          }}>
            <div style={{ position: 'absolute', top: -70, right: -40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.1)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: '18%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ maxWidth: 680 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.72rem',
                  fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#fde047', marginBottom: '1rem',
                }}>
                  <Crown size={14} fill="#fde047" /> H A L L  O F  M A S T E R S
                </div>

                <h1 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: 'clamp(2rem, 3.8vw, 2.8rem)', lineHeight: 1.15,
                  color: '#ffffff', margin: '0 0 0.85rem', letterSpacing: '-0.02em',
                }}>
                  Global Learning Leaderboard
                </h1>

                <p style={{
                  color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.4vw, 1.05rem)',
                  lineHeight: 1.6, margin: 0,
                }}>
                  Celebrate top scholars, peer coders, and educators mastering real-world skills daily. Earn XP through quizzes, verified course completions, and active study streaks.
                </p>
              </div>

              {/* Banner Metrics Cluster */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 20, padding: '1.25rem 1.5rem', backdropFilter: 'blur(10px)',
                minWidth: 'min(100%, 420px)',
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Ranked Learners</div>
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.5rem', marginTop: 2 }}>{entries.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Community XP</div>
                  <div style={{ fontWeight: 800, color: '#fde047', fontSize: '1.5rem', marginTop: 2 }}>{totalCommunityXP.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Max Streak</div>
                  <div style={{ fontWeight: 800, color: '#fb923c', fontSize: '1.5rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={18} fill="#fb923c" /> {maxStreak}d
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Top 3 Podium Cards (Full Width Desktop Showcase) ──────── */}
          {!loading && entries.length >= 3 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              alignItems: 'end',
              marginBottom: '3rem',
            }}>

              {/* Rank 2 (Silver) */}
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 24, padding: '2rem 1.5rem', textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.03)', position: 'relative',
                order: 1,
              }}>
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: '#94a3b8', color: '#0f172a', fontWeight: 900, fontSize: '0.75rem',
                  padding: '4px 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 4px 12px rgba(148, 163, 184, 0.4)',
                }}>
                  🥈 2ND PLACE
                </div>

                <div style={{ position: 'relative', display: 'inline-block', margin: '0.5rem auto 1rem' }}>
                  {top2.avatar ? (
                    <img src={getFullUrl(top2.avatar) || ''} alt={top2.name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #94a3b8' }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #475569, #64748b)', color: '#fff', fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #94a3b8' }}>
                      {top2.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>{top2.name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Level {top2.level} · {LEVEL_NAMES[top2.level - 1] ?? 'Master'}
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', borderRadius: 14, padding: '0.65rem 1rem',
                  display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total XP</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{top2.total_xp.toLocaleString()}</div>
                  </div>
                  <div style={{ width: 1, height: 24, background: 'var(--card-border)' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Streak</div>
                    <div style={{ fontWeight: 800, color: '#fb923c', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Flame size={14} fill="#fb923c" /> {top2.current_streak}d
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank 1 (Gold — Centerpiece & Elevated) */}
              <div style={{
                background: 'linear-gradient(160deg, var(--card-bg) 0%, rgba(253, 224, 71, 0.05) 100%)',
                border: '2px solid rgba(253, 224, 71, 0.5)',
                borderRadius: 28, padding: '2.5rem 1.75rem', textAlign: 'center',
                boxShadow: '0 16px 40px rgba(253, 224, 71, 0.15)', position: 'relative',
                order: 2, transform: 'translateY(-8px)',
              }}>
                <div style={{
                  position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #fde047, #eab308)', color: '#0c3b2e', fontWeight: 900, fontSize: '0.82rem',
                  padding: '5px 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(234, 179, 8, 0.5)',
                }}>
                  👑 1ST PLACE · GRAND MASTER
                </div>

                <div style={{ position: 'relative', display: 'inline-block', margin: '0.75rem auto 1rem' }}>
                  {top1.avatar ? (
                    <img src={getFullUrl(top1.avatar) || ''} alt={top1.name} style={{ width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fde047', boxShadow: '0 0 24px rgba(253, 224, 71, 0.4)' }} />
                  ) : (
                    <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'linear-gradient(135deg, #0c3b2e, #15805a)', color: '#fde047', fontSize: '2.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fde047', boxShadow: '0 0 24px rgba(253, 224, 71, 0.4)' }}>
                      {top1.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>{top1.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '1rem' }}>
                  Level {top1.level} · {LEVEL_NAMES[top1.level - 1] ?? 'Grand Champion'}
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', borderRadius: 16, padding: '0.85rem 1.25rem',
                  display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                  border: '1px solid rgba(253, 224, 71, 0.2)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dominant XP</div>
                    <div style={{ fontWeight: 900, color: '#eab308', fontSize: '1.25rem' }}>{top1.total_xp.toLocaleString()}</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--card-border)' }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Streak</div>
                    <div style={{ fontWeight: 900, color: '#fb923c', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Flame size={16} fill="#fb923c" /> {top1.current_streak}d
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 24, padding: '2rem 1.5rem', textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.03)', position: 'relative',
                order: 3,
              }}>
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: '#cd7f32', color: '#ffffff', fontWeight: 900, fontSize: '0.75rem',
                  padding: '4px 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 4px 12px rgba(205, 127, 50, 0.4)',
                }}>
                  🥉 3RD PLACE
                </div>

                <div style={{ position: 'relative', display: 'inline-block', margin: '0.5rem auto 1rem' }}>
                  {top3.avatar ? (
                    <img src={getFullUrl(top3.avatar) || ''} alt={top3.name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #cd7f32' }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #7c2d12, #9a3412)', color: '#fed7aa', fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #cd7f32' }}>
                      {top3.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>{top3.name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Level {top3.level} · {LEVEL_NAMES[top3.level - 1] ?? 'Scholar'}
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', borderRadius: 14, padding: '0.65rem 1rem',
                  display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total XP</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{top3.total_xp.toLocaleString()}</div>
                  </div>
                  <div style={{ width: 1, height: 24, background: 'var(--card-border)' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Streak</div>
                    <div style={{ fontWeight: 800, color: '#fb923c', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Flame size={14} fill="#fb923c" /> {top3.current_streak}d
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Filter & Search Control Bar ────────────────────────────── */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 20, padding: '1rem 1.25rem', marginBottom: '1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveFilter('all')}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: 999, border: '1px solid',
                  background: activeFilter === 'all' ? 'var(--pine-deep)' : 'transparent',
                  borderColor: activeFilter === 'all' ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: activeFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                All Learners ({entries.length})
              </button>
              <button
                onClick={() => setActiveFilter('top10')}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: 999, border: '1px solid',
                  background: activeFilter === 'top10' ? 'var(--pine-deep)' : 'transparent',
                  borderColor: activeFilter === 'top10' ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: activeFilter === 'top10' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Top 10 Elite
              </button>
              <button
                onClick={() => setActiveFilter('streaks')}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: 999, border: '1px solid',
                  background: activeFilter === 'streaks' ? 'var(--pine-deep)' : 'transparent',
                  borderColor: activeFilter === 'streaks' ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: activeFilter === 'streaks' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <Flame size={14} fill="#fb923c" /> Streak Leaders
              </button>
            </div>

            {/* Search Input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
              borderRadius: 999, padding: '0.45rem 1rem', width: 'min(100%, 320px)',
            }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search learner name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '0.86rem', width: '100%',
                }}
              />
            </div>
          </div>

          {/* ── Full Width Desktop Leaderboard Roster ──────────────────── */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}>
            {/* Table Header Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(60px, 8vw, 90px) minmax(200px, 1.8fr) clamp(120px, 14vw, 180px) clamp(100px, 12vw, 150px) clamp(110px, 12vw, 140px)',
              padding: '1rem 1.75rem',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--card-border)',
              fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em',
              color: 'var(--text-muted)', textTransform: 'uppercase',
            }}>
              <div>Rank</div>
              <div>Scholar</div>
              <div>Tier &amp; Level</div>
              <div style={{ textAlign: 'center' }}>Daily Streak</div>
              <div style={{ textAlign: 'right' }}>Total XP</div>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 60, borderRadius: 16, background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                <Trophy size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No scholars found</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {searchQuery ? `No learner matches "${searchQuery}".` : 'Complete lessons and quizzes to appear on the leaderboard!'}
                </p>
              </div>
            ) : (
              <div>
                {filteredEntries.map((entry, idx) => {
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;
                  const levelName = LEVEL_NAMES[entry.level - 1] ?? 'Master';

                  return (
                    <div
                      key={entry.user_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'clamp(60px, 8vw, 90px) minmax(200px, 1.8fr) clamp(120px, 14vw, 180px) clamp(100px, 12vw, 150px) clamp(110px, 12vw, 140px)',
                        alignItems: 'center',
                        padding: '1.1rem 1.75rem',
                        borderBottom: idx < filteredEntries.length - 1 ? '1px solid var(--card-border)' : 'none',
                        background: isTop1
                          ? 'rgba(253, 224, 71, 0.04)'
                          : isTop2
                          ? 'rgba(148, 163, 184, 0.03)'
                          : isTop3
                          ? 'rgba(205, 127, 50, 0.03)'
                          : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isTop1
                          ? 'rgba(253, 224, 71, 0.04)'
                          : isTop2
                          ? 'rgba(148, 163, 184, 0.03)'
                          : isTop3
                          ? 'rgba(205, 127, 50, 0.03)'
                          : 'transparent';
                      }}
                    >
                      {/* Rank Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isTop1 ? (
                          <span style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: '#fde047', color: '#0c3b2e', fontWeight: 900,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(253,224,71,0.4)',
                          }}>🥇</span>
                        ) : isTop2 ? (
                          <span style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: '#94a3b8', color: '#0f172a', fontWeight: 900,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(148,163,184,0.4)',
                          }}>🥈</span>
                        ) : isTop3 ? (
                          <span style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: '#cd7f32', color: '#fff', fontWeight: 900,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(205,127,50,0.4)',
                          }}>🥉</span>
                        ) : (
                          <span style={{
                            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                            fontSize: '1rem', color: 'var(--text-muted)',
                            paddingLeft: 6,
                          }}>
                            #{entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Scholar Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, paddingRight: '1rem' }}>
                        {entry.avatar ? (
                          <img
                            src={getFullUrl(entry.avatar) || ''}
                            alt={entry.name}
                            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--card-border)' }}
                          />
                        ) : (
                          <div style={{
                            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--pine-deep)', color: '#fde047',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.95rem',
                          }}>
                            {entry.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {entry.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Active Scholar
                          </div>
                        </div>
                      </div>

                      {/* Tier & Level */}
                      <div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                          borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.75rem',
                          fontWeight: 700, color: 'var(--text-primary)',
                        }}>
                          <Shield size={12} style={{ color: 'var(--accent)' }} /> Level {entry.level}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, paddingLeft: 4 }}>
                          {levelName}
                        </div>
                      </div>

                      {/* Daily Streak */}
                      <div style={{ textAlign: 'center' }}>
                        {entry.current_streak > 0 ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)',
                            borderRadius: 999, padding: '0.25rem 0.75rem',
                            color: '#fb923c', fontWeight: 800, fontSize: '0.8rem',
                          }}>
                            <Flame size={14} fill="#fb923c" /> {entry.current_streak} days
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </div>

                      {/* Total XP */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                          fontSize: '1.15rem', color: isTop1 ? '#eab308' : 'var(--text-primary)',
                        }}>
                          {entry.total_xp.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>XP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
