'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Send,
  ClipboardList,
  Briefcase,
  Check,
  ArrowLeft,
  Clock,
  DollarSign,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Link2,
} from 'lucide-react';
import MeetingCreator from '@/components/MeetingCreator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HelpRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({ quoted_rate: '', estimated_hours: '1', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMeetingCreator, setShowMeetingCreator] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const loadRequest = () => {
    authFetch(`${API}/api/help-requests/${id}`)
      .then(r => r.ok && r.json())
      .then(d => d && setRequest(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) loadRequest(); }, [id]);

  const isOwner = user && request && user.id === request.student_id;
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const hasAlreadyBid = request?.bids?.some((b: any) => b.helper?.user_id === user?.id);
  const isSessionHelper = request?.session?.helper?.user_id === user?.id;

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const rate = parseFloat(bidForm.quoted_rate);
    if (!rate || isNaN(rate) || rate <= 0) {
      setError('Please enter a valid hourly rate.');
      return;
    }
    if (request && rate > Number(request.budget_max_per_hour)) {
      setError(`Your rate cannot exceed the student's maximum budget of ${request.budget_max_per_hour} ETB/hr.`);
      return;
    }
    if (!bidForm.message.trim()) {
      setError('Please enter a proposal message explaining your approach.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/${id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoted_rate: rate,
          estimated_hours: parseFloat(bidForm.estimated_hours) || 1,
          message: bidForm.message.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to submit bid');
      setSuccess('Your proposal has been submitted to the student!');
      setBidForm({ quoted_rate: '', estimated_hours: '1', message: '' });
      loadRequest();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const acceptBid = async (bidId: string) => {
    setAccepting(bidId); setError(''); setSuccess('');
    try {
      const res = await authFetch(`${API}/api/help-requests/bids/${bidId}/accept`, { method: 'PATCH' });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to accept bid');

      const { session, checkoutUrl } = await res.json();

      if (checkoutUrl) {
        setSuccess('Proposal accepted! Redirecting to secure escrow checkout...');
        setTimeout(() => { window.location.href = checkoutUrl; }, 700);
      } else {
        setSuccess('Proposal accepted! Session created.');
        loadRequest();
      }
    } catch (err: any) { setError(err.message); }
    finally { setAccepting(''); }
  };

  const handleMeetingCreated = async (meetingUrl: string, platform: 'zoom' | 'google') => {
    try {
      if (selectedSessionId) {
        const res = await authFetch(`${API}/api/help-requests/sessions/${selectedSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meeting_link: meetingUrl }),
        });

        if (res.ok) {
          setSuccess('Virtual classroom link connected to session!');
          setShowMeetingCreator(false);
          setSelectedSessionId(null);
          loadRequest();
        } else {
          throw new Error('Failed to link meeting to session');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openMeetingCreator = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowMeetingCreator(true);
    setError('');
    setSuccess('');
  };

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  if (!request) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Request Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          This learning request may have been completed, cancelled, or expired.
        </p>
        <Link href="/help-requests" className="btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>
          Back to Marketplace
        </Link>
      </div>
      <Footer />
    </main>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />

      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{
          width: '100%',
          maxWidth: 1720,
          margin: '0 auto',
          padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem',
          boxSizing: 'border-box',
        }}>

          {/* ── Back Navigation ──────────────────────────────────── */}
          <Link
            href="/help-requests"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: 'var(--accent)', fontSize: '0.88rem', fontWeight: 700,
              textDecoration: 'none', marginBottom: '1.5rem',
            }}
          >
            <ArrowLeft size={16} /> Back to Help Marketplace
          </Link>

          {/* ── Two-Column Desktop Workspace Canvas ─────────────── */}
          <div className="help-detail-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) clamp(300px, 30vw, 400px)',
            gap: '2.5rem',
            alignItems: 'start',
          }}>

            {/* Main Column (Left) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              {/* Request Info Card */}
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 24, padding: 'clamp(1.5rem, 3vw, 2.25rem)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                      border: '1px solid var(--card-border)', borderRadius: 999,
                      padding: '0.35rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, textTransform: 'capitalize',
                    }}>
                      {request.subject_area}
                    </span>
                    {isOwner && (
                      <span style={{
                        background: '#fde047', color: '#0c3b2e',
                        borderRadius: 999, padding: '0.3rem 0.8rem',
                        fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        👑 Your Request
                      </span>
                    )}
                  </div>

                  <span style={{
                    fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    padding: '0.35rem 0.9rem', borderRadius: 999,
                    background: request.status === 'open' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                    color: request.status === 'open' ? '#34d399' : '#818cf8',
                    border: `1px solid ${request.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                  }}>
                    ● {request.status}
                  </span>
                </div>

                <h1 style={{
                  fontFamily: 'Outfit,sans-serif', fontWeight: 800,
                  fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', marginBottom: '1.25rem',
                  lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--text-primary)',
                }}>
                  {request.title}
                </h1>

                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1.75rem', whiteSpace: 'pre-line' }}>
                  {request.description}
                </p>

                {/* Key Metrics Strip */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                  borderRadius: 18, padding: '1.25rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>MAX BUDGET</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '1.1rem', fontFamily: 'Outfit,sans-serif' }}>{request.budget_max_per_hour} ETB/hr</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>EST. DURATION</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.1rem' }}>~{request.estimated_hours} hr</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>DEADLINE</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>{new Date(request.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>POSTED BY</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>{request.student?.first_name} {request.student?.last_name || ''}</span>
                  </div>
                </div>
              </div>

              {/* Bids & Proposals Section */}
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 24, padding: 'clamp(1.5rem, 3vw, 2.25rem)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Instructor Proposals <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>({request.bids?.length || 0})</span>
                  </h2>
                </div>

                {request.bids?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: 20, border: '1px dashed var(--card-border)' }}>
                    <ClipboardList size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.8 }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No proposals submitted yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                      Certified tutors are reviewing your request. When an instructor bids, their proposal will appear right here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {request.bids.map((bid: any) => (
                      <div
                        key={bid.id}
                        style={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                          borderRadius: 20, padding: '1.5rem', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%', background: 'var(--pine-deep)',
                              color: '#fde047', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '1rem', border: '2px solid var(--card-border)', flexShrink: 0,
                            }}>
                              {bid.helper?.user?.first_name?.[0] || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {bid.helper?.user?.first_name} {bid.helper?.user?.last_name || ''}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {bid.helper?.headline || 'Verified Axumia Educator'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '1.15rem', fontFamily: 'Outfit,sans-serif' }}>
                              {bid.quoted_rate} ETB/hr
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Est. {bid.estimated_hours} hr (~{(bid.quoted_rate * bid.estimated_hours).toFixed(0)} ETB total)
                            </div>
                          </div>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
                          {bid.message}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Status: <strong style={{ color: bid.status === 'accepted' ? '#10b981' : 'var(--text-primary)', textTransform: 'capitalize' }}>{bid.status}</strong>
                          </span>

                          {isOwner && request.status === 'open' && bid.status === 'pending' && (
                            <button
                              id={`accept-bid-${bid.id}`}
                              onClick={() => acceptBid(bid.id)}
                              disabled={accepting === bid.id}
                              style={{
                                padding: '0.65rem 1.4rem', borderRadius: 999, border: 'none',
                                background: 'var(--pine-deep)', color: '#ffffff', fontWeight: 800, fontSize: '0.86rem',
                                cursor: accepting === bid.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)',
                              }}
                            >
                              {accepting === bid.id ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                              {accepting === bid.id ? 'Securing Escrow…' : 'Accept Proposal & Escrow Deposit'}
                            </button>
                          )}

                          {bid.status === 'accepted' && (
                            <span style={{
                              background: 'rgba(16,185,129,0.12)', color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999,
                              padding: '0.35rem 0.9rem', fontSize: '0.76rem', fontWeight: 800,
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                            }}>
                              <CheckCircle2 size={14} /> Accepted Offer
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column (Right) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '96px' }}>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '1rem 1.25rem', color: '#fca5a5', fontSize: '0.88rem' }}>
                  <AlertCircle size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
                </div>
              )}

              {success && (
                <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: '1rem 1.25rem', color: '#34d399', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} /> {success}
                </div>
              )}

              {/* Proposal Form for Certified Instructors */}
              {isInstructor && !isOwner && request.status === 'open' && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {hasAlreadyBid ? <CheckCircle2 size={18} color="#10b981" /> : <Briefcase size={18} style={{ color: 'var(--accent)' }} />}
                    {hasAlreadyBid ? 'Proposal Submitted' : 'Submit Your Proposal'}
                  </h3>

                  {hasAlreadyBid ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                      You have already submitted an hourly proposal for this learning job. The student will review your pitch shortly.
                    </p>
                  ) : (
                    <form onSubmit={submitBid} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Your Rate (ETB/hr) *</label>
                        <input
                          id="bid-rate"
                          type="number"
                          placeholder={`Max: ${request.budget_max_per_hour} ETB`}
                          min="50"
                          step="10"
                          value={bidForm.quoted_rate}
                          onChange={e => setBidForm(p => ({ ...p, quoted_rate: e.target.value }))}
                          required
                          style={{
                            width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-secondary)',
                            border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Est. Hours</label>
                        <input
                          id="bid-hours"
                          type="number"
                          placeholder="e.g. 1"
                          min="0.5"
                          step="0.5"
                          value={bidForm.estimated_hours}
                          onChange={e => setBidForm(p => ({ ...p, estimated_hours: e.target.value }))}
                          required
                          style={{
                            width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-secondary)',
                            border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Proposal Message *</label>
                        <textarea
                          id="bid-message"
                          placeholder="Explain your teaching approach, relevant experience, and how you will solve this challenge…"
                          rows={4}
                          value={bidForm.message}
                          onChange={e => setBidForm(p => ({ ...p, message: e.target.value }))}
                          required
                          style={{
                            width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-secondary)',
                            border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical',
                          }}
                        />
                      </div>

                      {bidForm.quoted_rate && bidForm.estimated_hours && (
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          Estimated Total: <strong style={{ color: 'var(--accent)' }}>{(parseFloat(bidForm.quoted_rate) * parseFloat(bidForm.estimated_hours)).toFixed(0)} ETB</strong>
                        </div>
                      )}

                      <button
                        id="submit-bid"
                        type="submit"
                        disabled={submitting}
                        style={{
                          width: '100%', padding: '0.85rem', borderRadius: 999, border: 'none',
                          background: 'var(--pine-deep)', color: '#ffffff', fontWeight: 800, fontSize: '0.92rem',
                          opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)', cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                        {submitting ? 'Submitting…' : 'Submit Proposal'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Connected Virtual Classroom for Accepted Sessions */}
              {isSessionHelper && request.session && !request.session.meeting_link && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ fontWeight: 800, marginBottom: '0.85rem', fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={18} style={{ color: 'var(--accent)' }} /> Connect Classroom Link
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    The student has accepted your bid. Generate or attach your Google Meet / Zoom meeting room for this session.
                  </p>

                  {!showMeetingCreator ? (
                    <button
                      onClick={() => openMeetingCreator(request.session.id)}
                      className="btn-primary"
                      style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', borderRadius: 999, fontWeight: 800 }}
                    >
                      Connect Virtual Classroom
                    </button>
                  ) : (
                    <MeetingCreator
                      onMeetingCreated={handleMeetingCreated}
                      defaultTitle={`Axumia Session: ${request.title}`}
                      defaultDuration={Number(request.estimated_hours || 1) * 60}
                      scheduledTime={new Date()}
                    />
                  )}
                </div>
              )}

              {/* Escrow Protection Guarantee Card */}
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 24, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 800, fontSize: '0.95rem' }}>
                  <ShieldCheck size={20} /> Axumia Escrow Protection
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.6, margin: 0 }}>
                  Funds are secured in escrow upon offer acceptance. Payment is only disbursed to the instructor after you confirm completion and review the delivered assistance.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .help-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
