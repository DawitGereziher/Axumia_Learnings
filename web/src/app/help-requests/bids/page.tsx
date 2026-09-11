'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Clock, CheckCircle2, XCircle, ChevronRight,
  ExternalLink, RefreshCw, Link2, AlertTriangle, Loader2,
  CalendarDays, DollarSign, Video, Star, BookOpen,
} from 'lucide-react';
import MeetingCreator from '@/components/MeetingCreator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface HelpBid {
  id: string;
  quoted_rate: number;
  estimated_hours: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  request: {
    id: string;
    title: string;
    subject_area: string;
    description: string;
    deadline: string;
    status: string;
    budget_max_per_hour: number;
  };
  session: {
    id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    meeting_link: string | null;
    actual_hours: number | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}

// ── Status helpers ────────────────────────────────────────────────────────────
function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending:  { icon: <Clock size={12} />,        label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    accepted: { icon: <CheckCircle2 size={12} />, label: 'Accepted', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
    rejected: { icon: <XCircle size={12} />,      label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  };
  const s = map[status] || map['pending'];
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

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled:   { label: 'Session Scheduled',   color: '#818cf8' },
    in_progress: { label: 'Session In Progress',  color: '#f59e0b' },
    completed:   { label: 'Session Completed',    color: '#10b981' },
    cancelled:   { label: 'Session Cancelled',    color: '#ef4444' },
  };
  const s = map[status] || { label: status, color: '#94a3b8' };
  return (
    <span style={{
      color: s.color, background: `${s.color}14`,
      border: `1px solid ${s.color}35`,
      borderRadius: 999, padding: '0.25rem 0.7rem',
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  );
}

// ── Set Meeting Link Form ─────────────────────────────────────────────────────
function SetLinkPanel({
  sessionId,
  onSuccess,
  requestTitle,
  estimatedHours,
}: {
  sessionId: string;
  onSuccess: () => void;
  requestTitle?: string;
  estimatedHours?: number;
}) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showMeetingCreator, setShowMeetingCreator] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/sessions/${sessionId}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink: link }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to set meeting link');
      onSuccess();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleMeetingCreated = async (meetingUrl: string, platform: 'zoom' | 'google') => {
    try {
      const res = await authFetch(`${API}/api/help-requests/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_link: meetingUrl }),
      });

      
      if (res.ok) {
        onSuccess();
        setShowMeetingCreator(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to update session:', errorData);
        throw new Error(errorData.message || 'Failed to link meeting to session');
      }
    } catch (err: any) {
      console.error('Error in handleMeetingCreated:', err);
      setErr(err.message);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {!showMeetingCreator ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => setShowMeetingCreator(true)}
              className="btn-ghost"
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399',
              }}
            >
              Auto-Create Meeting
            </button>
            <span style={{ color: '#64748b', fontSize: '0.85rem', alignSelf: 'center' }}>or</span>
          </div>
          
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}>
              Paste manual link
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id={`link-input-${sessionId}`}
                type="url"
                className="input-field"
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                value={link}
                onChange={e => setLink(e.target.value)}
                required
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.875rem' }}
              />
              <button
                id={`link-submit-${sessionId}`}
                type="submit"
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.65rem 1.1rem', borderRadius: 10,
                  background: busy ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.8)',
                  border: 'none', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {busy ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Link2 size={14} />}
                {busy ? 'Saving…' : 'Set Link'}
              </button>
            </div>
            {err && (
              <span style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={12} /> {err}
              </span>
            )}
          </form>
        </>
      ) : (
        <MeetingCreator
          onMeetingCreated={handleMeetingCreated}
          defaultTitle={requestTitle || 'Help Session'}
          defaultDuration={estimatedHours ? estimatedHours * 60 : 60}
          scheduledTime={new Date()}
        />
      )}
    </div>
  );
}

// ── Complete Session Form ─────────────────────────────────────────────────────
function CompletePanel({
  sessionId,
  estimatedHours,
  onSuccess,
}: {
  sessionId: string;
  estimatedHours: number;
  onSuccess: () => void;
}) {
  const [hours, setHours] = useState(String(estimatedHours));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/sessions/${sessionId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualHours: parseFloat(hours) }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to complete session');
      onSuccess();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}>
        Actual hours spent
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          id={`hours-input-${sessionId}`}
          type="number"
          className="input-field"
          placeholder="e.g. 2.5"
          value={hours}
          onChange={e => setHours(e.target.value)}
          min="0.1"
          step="0.5"
          required
          style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.875rem' }}
        />
        <button
          id={`complete-submit-${sessionId}`}
          type="submit"
          disabled={busy}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.65rem 1.1rem', borderRadius: 10,
            background: busy ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.8)',
            border: 'none', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          {busy ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Star size={14} />}
          {busy ? 'Saving…' : 'Complete'}
        </button>
      </div>
      {err && (
        <span style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={12} /> {err}
        </span>
      )}
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MyBidsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bids, setBids] = useState<HelpBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBids = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/api/help-requests/bids/mine`);
      if (!res.ok) throw new Error('Failed to fetch bids');
      const data = await res.json();
      setBids(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchBids();
  }, [user, fetchBids]);

  const handleRefresh = () => fetchBids();

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ paddingTop: '84px', flex: 1 }}>
        <div className="container" style={{ maxWidth: 1000, padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                My Bids
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                Track your submitted bids and manage active sessions
              </p>
            </div>
            <button
              onClick={handleRefresh}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.2rem', borderRadius: 10,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                transition: 'background 0.15s',
              }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {bids.length === 0 ? (
            <div className="glass" style={{ borderRadius: 20, padding: '3rem', textAlign: 'center' }}>
              <Briefcase size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>
                No bids yet
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Start browsing help requests and submit your first bid
              </p>
              <Link
                href="/help-requests"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', borderRadius: 10,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
                }}
              >
                Browse Requests <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {bids.map((bid) => {
                const totalEst = Math.round(bid.quoted_rate * bid.estimated_hours);
                return (
                  <div key={bid.id} className="card" style={{ padding: '1.5rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <BidStatusBadge status={bid.status} />
                          {bid.session && <SessionStatusBadge status={bid.session.status} />}
                        </div>
                        <Link
                          href={`/help-requests/${bid.request.id}`}
                          style={{
                            fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9',
                            textDecoration: 'none', display: 'block', marginBottom: '0.4rem',
                          }}
                        >
                          {bid.request.title}
                        </Link>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <BookOpen size={12} /> {bid.request.subject_area}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CalendarDays size={12} /> {new Date(bid.request.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, color: '#d4af37', fontSize: '1.15rem' }}>
                          {bid.quoted_rate} ETB/hr
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          ~{bid.estimated_hours}h · <strong style={{ color: '#94a3b8' }}>{totalEst} ETB</strong>
                        </div>
                      </div>
                    </div>

                    {/* Bid message */}
                    <div style={{ 
                      background: 'rgba(148,163,184,0.05)', 
                      border: '1px solid rgba(148,163,184,0.1)', 
                      borderRadius: 10, 
                      padding: '0.75rem 1rem', 
                      marginBottom: '1rem',
                      fontSize: '0.85rem', 
                      color: '#94a3b8',
                      lineHeight: 1.6,
                    }}>
                      {bid.message}
                    </div>

                    {/* ── Accepted bid: session management ── */}
                    {bid.status === 'accepted' && bid.session && (
                      <div style={{
                        background: 'rgba(16,185,129,0.05)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        borderRadius: 14,
                        padding: '1.25rem',
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Video size={14} /> Session Details
                        </div>

                        {/* Meeting link */}
                        {bid.session.meeting_link ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Meeting link:</span>
                            <a
                              href={bid.session.meeting_link}
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
                              <ExternalLink size={12} /> Open Meeting
                            </a>
                          </div>
                        ) : bid.session.status !== 'completed' && bid.session.status !== 'cancelled' ? (
                          <SetLinkPanel 
                            sessionId={bid.session.id} 
                            onSuccess={handleRefresh}
                            requestTitle={bid.request.title}
                            estimatedHours={bid.estimated_hours}
                          />
                        ) : null}

                        {/* Complete session */}
                        {bid.session.status === 'in_progress' && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Star size={13} /> Session is in progress
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                              When you've finished, enter the actual hours and mark as complete to trigger payout eligibility.
                            </p>
                            <CompletePanel
                              sessionId={bid.session.id}
                              estimatedHours={bid.estimated_hours}
                              onSuccess={handleRefresh}
                            />
                          </div>
                        )}

                        {/* Completed session info */}
                        {bid.session.status === 'completed' && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckCircle2 size={13} /> Session Completed
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Estimated Hours</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>{bid.estimated_hours}h</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Actual Hours</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>{bid.session.actual_hours}h</span>
                              </div>
                            </div>

                            {bid.session.started_at && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Started:</span> {new Date(bid.session.started_at).toLocaleString()}
                              </div>
                            )}
                            
                            {bid.session.completed_at && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>Completed:</span> {new Date(bid.session.completed_at).toLocaleString()}
                              </div>
                            )}

                            {bid.session.actual_hours && bid.estimated_hours && (
                              <div style={{ 
                                marginTop: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: bid.session.actual_hours > bid.estimated_hours 
                                  ? 'rgba(245,158,11,0.1)' 
                                  : 'rgba(16,185,129,0.1)',
                                border: bid.session.actual_hours > bid.estimated_hours 
                                  ? '1px solid rgba(245,158,11,0.3)' 
                                  : '1px solid rgba(16,185,129,0.3)',
                                borderRadius: 8,
                                fontSize: '0.8rem',
                                color: bid.session.actual_hours > bid.estimated_hours 
                                  ? '#f59e0b' 
                                  : '#10b981',
                              }}>
                                {bid.session.actual_hours > bid.estimated_hours 
                                  ? `⚠️ Session took ${Math.round((bid.session.actual_hours - bid.estimated_hours) * 60)} extra minutes`
                                  : `✅ Session completed within estimated time`
                                }
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Rejected info ── */}
                    {bid.status === 'rejected' && (
                      <div style={{
                        background: 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 10,
                        padding: '0.75rem 1rem',
                        fontSize: '0.82rem',
                        color: '#fca5a5',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}>
                        <XCircle size={14} /> This bid was not selected by the student
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}