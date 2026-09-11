'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Clock, CheckCircle2, XCircle, RefreshCw,
  ExternalLink, AlertTriangle, Loader2, Video, CalendarDays,
  PlusCircle, ChevronRight, BookOpen, Link2,
} from 'lucide-react';
import SessionMonitoringIndicator from '@/components/settings/SessionMonitoringIndicator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface MyRequest {
  id: string;
  title: string;
  description: string;
  subject_area: string;
  budget_max_per_hour: number;
  estimated_hours: number;
  deadline: string;
  status: RequestStatus;
  created_at: string;
  _count: { bids: number };
  session: {
    id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    meeting_link: string | null;
    actual_hours: number | null;
    started_at: string | null;
    completed_at: string | null;
    platform: string | null;
    platform_meeting_id: string | null;
    session_started_at: string | null;
    session_ended_at: string | null;
    session_duration_m: number | null;
    session_flag: string | null;
  } | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    open:        { label: 'Open',        color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: <Clock size={11} /> },
    in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Loader2 size={11} /> },
    completed:   { label: 'Completed',   color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  icon: <CheckCircle2 size={11} /> },
    cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: <XCircle size={11} /> },
  };
  const s = map[status] || map['open'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}40`,
      borderRadius: 999, padding: '0.25rem 0.7rem',
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function SessionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled:   { label: '📅 Session Scheduled',  color: '#818cf8' },
    in_progress: { label: '🔴 Session Live',        color: '#f59e0b' },
    completed:   { label: '✓ Session Completed',   color: '#10b981' },
    cancelled:   { label: '✕ Session Cancelled',   color: '#ef4444' },
  };
  const s = map[status] || { label: status, color: '#94a3b8' };
  return (
    <span style={{
      color: s.color, background: `${s.color}14`, border: `1px solid ${s.color}35`,
      borderRadius: 999, padding: '0.25rem 0.65rem',
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

function RequestCard({ req, onRefresh }: { req: MyRequest; onRefresh: () => void }) {
  const daysLeft = Math.ceil((new Date(req.deadline).getTime() - Date.now()) / 86400000);

  return (
    <article style={{
      background: 'rgba(15,23,42,0.75)',
      border: `1px solid ${
        req.status === 'in_progress' ? 'rgba(245,158,11,0.3)' :
        req.status === 'completed'   ? 'rgba(99,102,241,0.25)' :
        req.status === 'cancelled'   ? 'rgba(239,68,68,0.15)' :
        'rgba(255,255,255,0.07)'
      }`,
      borderRadius: 20,
      padding: '1.75rem',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999,
            padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
          }}>
            {req.subject_area}
          </span>
          <StatusBadge status={req.status} />
          {req.session && <SessionBadge status={req.session.status} />}
        </div>
        <Link
          href={`/help-requests/${req.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          View Details <ExternalLink size={12} />
        </Link>
      </div>

      <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9', marginBottom: '0.5rem', lineHeight: 1.35 }}>
        {req.title}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.855rem', lineHeight: 1.55, marginBottom: '1rem' }}>
        {req.description.length > 120 ? `${req.description.slice(0, 120)}…` : req.description}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: req.session ? '1.25rem' : 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <CalendarDays size={13} />
          {daysLeft > 0 ? `${daysLeft}d remaining` : 'Deadline passed'}
        </span>
        <span style={{ color: '#64748b' }}>
          ≤ <strong style={{ color: '#d4af37' }}>{req.budget_max_per_hour} ETB/hr</strong>
        </span>
        <span style={{ color: '#64748b' }}>
          <strong style={{ color: '#94a3b8' }}>{req._count.bids}</strong> bids
        </span>
      </div>

      {/* Session panel — visible after bid accepted */}
      {req.session && (
        <div style={{
          background: req.session.status === 'completed'
            ? 'rgba(99,102,241,0.05)'
            : req.session.status === 'in_progress'
            ? 'rgba(245,158,11,0.05)'
            : 'rgba(16,185,129,0.05)',
          border: `1px solid ${
            req.session.status === 'completed'   ? 'rgba(99,102,241,0.2)' :
            req.session.status === 'in_progress' ? 'rgba(245,158,11,0.2)' :
            'rgba(16,185,129,0.15)'
          }`,
          borderRadius: 14, padding: '1.25rem',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Video size={14} /> Session
          </div>

          {req.session.meeting_link ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Meeting link:</span>
              <a
                href={req.session.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  color: '#34d399', fontSize: '0.88rem', fontWeight: 600,
                  textDecoration: 'none', background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8,
                  padding: '0.3rem 0.75rem',
                }}
              >
                <Link2 size={12} /> Join Session
              </a>
            </div>
          ) : req.session.status === 'scheduled' ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              ⏳ Waiting for instructor to share the meeting link. Check back soon.
            </p>
          ) : null}

          {req.session.status === 'completed' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>
                Actual hours: <strong style={{ color: '#818cf8' }}>{req.session.actual_hours}h</strong>
              </span>
              {req.session.completed_at && (
                <span style={{ color: '#64748b' }}>
                  Completed: <strong style={{ color: '#94a3b8' }}>{new Date(req.session.completed_at).toLocaleDateString()}</strong>
                </span>
              )}
            </div>
          )}

          {/* Session Monitoring Indicator */}
          <SessionMonitoringIndicator
            platform={req.session.platform}
            sessionStartedAt={req.session.session_started_at}
            sessionEndedAt={req.session.session_ended_at}
            sessionDurationM={req.session.session_duration_m}
            sessionFlag={req.session.session_flag}
          />
        </div>
      )}
    </article>
  );
}

type Filter = 'all' | RequestStatus;

export default function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reqs, setReqs] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/api/help-requests/mine`);
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to load requests');
      setReqs(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const filtered = filter === 'all' ? reqs : reqs.filter(r => r.status === filter);

  const counts = {
    all: reqs.length,
    open: reqs.filter(r => r.status === 'open').length,
    in_progress: reqs.filter(r => r.status === 'in_progress').length,
    completed: reqs.filter(r => r.status === 'completed').length,
    cancelled: reqs.filter(r => r.status === 'cancelled').length,
  };

  const FILTERS: { id: Filter; label: string; color: string }[] = [
    { id: 'all',         label: `All (${counts.all})`,                  color: '#94a3b8' },
    { id: 'open',        label: `Open (${counts.open})`,                color: '#10b981' },
    { id: 'in_progress', label: `In Progress (${counts.in_progress})`,  color: '#f59e0b' },
    { id: 'completed',   label: `Completed (${counts.completed})`,      color: '#818cf8' },
  ];

  if (authLoading || !user) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080a0f' }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ paddingTop: '80px', flex: 1 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.07) 0%, transparent 60%)', padding: '2.5rem 1.5rem 0' }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Link href="/help-requests" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <BookOpen size={14} /> Help Requests
                  </Link>
                  <ChevronRight size={14} color="#334155" />
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>My Requests</span>
                </div>
                <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '2rem', marginBottom: '0.35rem' }}>
                  My <span className="gradient-text">Requests</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Track all your posted help requests and active sessions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  id="my-requests-refresh"
                  onClick={load}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.6rem 1rem', color: '#94a3b8', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                  Refresh
                </button>
                <Link
                  href="/help-requests/new"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <PlusCircle size={15} /> New Request
                </Link>
              </div>
            </div>

            {/* Stats */}
            {!loading && reqs.length > 0 && (
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { label: 'Total',       value: counts.all,         color: '#94a3b8' },
                  { label: 'Open',        value: counts.open,        color: '#10b981' },
                  { label: 'In Progress', value: counts.in_progress, color: '#f59e0b' },
                  { label: 'Completed',   value: counts.completed,   color: '#818cf8' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 800, color: s.color, fontSize: '1rem' }}>{s.value}</span>
                    <span style={{ color: '#475569' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="container" style={{ maxWidth: 900, padding: '2rem 1.5rem 4rem' }}>

          {/* Filter tabs */}
          {!loading && reqs.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  id={`req-filter-${f.id}`}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 999, border: 'none',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    background: filter === f.id ? `${f.color}20` : 'rgba(255,255,255,0.04)',
                    color: filter === f.id ? f.color : '#475569',
                    outline: filter === f.id ? `1px solid ${f.color}40` : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.875rem 1.25rem', color: '#fca5a5', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '1.75rem', height: 180 }} />
              ))}
            </div>
          )}

          {!loading && reqs.length === 0 && (
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <ClipboardList size={28} color="#818cf8" />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>No requests yet</h2>
              <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: 380, margin: '0 auto 2rem' }}>
                Post a help request and receive bids from verified instructors.
              </p>
              <Link href="/help-requests/new" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                Post Your First Request →
              </Link>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filtered.map(req => (
                <RequestCard key={req.id} req={req} onRefresh={load} />
              ))}
            </div>
          )}

          {!loading && reqs.length > 0 && filtered.length === 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#475569' }}>
              No {filter} requests found.
            </div>
          )}

        </div>
      </div>
      <Footer />
    </main>
  );
}
