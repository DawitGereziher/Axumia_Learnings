'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Send, ClipboardList, Briefcase, Check } from 'lucide-react';
import MeetingCreator from '@/components/MeetingCreator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HelpRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({ quoted_rate: '', estimated_hours: '', message: '' });
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
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/${id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoted_rate: parseFloat(bidForm.quoted_rate),
          estimated_hours: parseFloat(bidForm.estimated_hours),
          message: bidForm.message,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to submit bid');
      setSuccess('Bid submitted successfully!');
      setBidForm({ quoted_rate: '', estimated_hours: '', message: '' });
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
        setSuccess('Bid accepted! Redirecting to payment...');
        // Small delay so the user sees the success message before redirect
        setTimeout(() => { window.location.href = checkoutUrl; }, 700);
      } else {
        // Fallback: no checkout URL (should not happen in production)
        setSuccess('Bid accepted! Session created.');
        loadRequest();
      }
    } catch (err: any) { setError(err.message); }
    finally { setAccepting(''); }
  };

  const handleMeetingCreated = async (meetingUrl: string, platform: 'zoom' | 'google') => {
    try {
      // Update the session with the created meeting link
      if (selectedSessionId) {
        const res = await authFetch(`${API}/api/help-requests/sessions/${selectedSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meeting_link: meetingUrl }),
        });

        if (res.ok) {
          setSuccess('Meeting created and linked to session!');
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  if (!request) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Request not found.</p>
    </main>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ paddingTop: '84px', flex: 1 }}>
        <div className="container" style={{ maxWidth: 960, padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

            {/* Main */}
            <div>
              {/* Request card */}
              <div className="glass" style={{ borderRadius: 20, padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    {request.subject_area}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.8rem', borderRadius: 999, background: request.status === 'open' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)', color: request.status === 'open' ? '#34d399' : '#818cf8', border: `1px solid ${request.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
                    {request.status}
                  </span>
                </div>

                <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.75rem', marginBottom: '1rem', lineHeight: 1.3 }}>
                  {request.title}
                </h1>

                <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {request.description}
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>MAX BUDGET</span>
                    <span style={{ color: '#d4af37', fontWeight: 700 }}>≤ {request.budget_max_per_hour} ETB/hr</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>EST. HOURS</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>~{request.estimated_hours}h</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>DEADLINE</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{new Date(request.deadline).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>POSTED BY</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{request.student?.first_name} {request.student?.last_name}</span>
                  </div>
                </div>
              </div>

              {/* Bids */}
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
                  Bids ({request.bids?.length || 0})
                </h2>

                {request.bids?.length === 0 ? (
                  <div className="glass" style={{ borderRadius: 16, padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No bids yet. Be the first to offer help!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {request.bids.map((bid: any) => (
                      <div key={bid.id} className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                              {bid.helper?.user?.first_name?.[0] || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {bid.helper?.user?.first_name} {bid.helper?.user?.last_name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{bid.helper?.headline || 'Instructor'}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#d4af37', fontSize: '1rem' }}>{bid.quoted_rate} ETB/hr</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>~{bid.estimated_hours}h</div>
                          </div>
                        </div>

                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                          {bid.message}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                            Total estimate: <strong style={{ color: '#f8fafc' }}>
                              {(bid.quoted_rate * bid.estimated_hours).toFixed(0)} ETB
                            </strong>
                          </span>
                          {isOwner && request.status === 'open' && bid.status === 'pending' && (
                            <button
                              id={`accept-bid-${bid.id}`}
                              onClick={() => acceptBid(bid.id)}
                              className="btn-primary"
                              disabled={accepting === bid.id}
                              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', opacity: accepting === bid.id ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              {accepting === bid.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                              {accepting === bid.id ? 'Accepting...' : 'Accept & Pay'}
                            </button>
                          )}
                          {bid.status === 'accepted' && (
                            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={13} /> Accepted
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ position: 'sticky', top: '88px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '0.75rem 1rem', color: '#34d399', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={16} /> {success}
                </div>
              )}

              {/* Bid form for instructors (only if not the request owner) */}
              {isInstructor && !isOwner && request.status === 'open' && (
                <div className="glass" style={{ borderRadius: 20, padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {hasAlreadyBid ? <CheckCircle2 size={18} color="#10b981" /> : <Briefcase size={18} color="#818cf8" />}
                    {hasAlreadyBid ? 'Bid Submitted' : 'Place Your Bid'}
                  </h3>
                  {hasAlreadyBid ? (
                    <p style={{ color: '#64748b', fontSize: '0.88rem' }}>You have already placed a bid on this request.</p>
                  ) : (
                    <form onSubmit={submitBid} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Rate (ETB/hr)</label>
                        <input id="bid-rate" type="number" className="input-field" placeholder="e.g. 400" min="50" step="10"
                          value={bidForm.quoted_rate} onChange={e => setBidForm(p => ({ ...p, quoted_rate: e.target.value }))} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Est. Hours</label>
                        <input id="bid-hours" type="number" className="input-field" placeholder="e.g. 2" min="0.5" step="0.5"
                          value={bidForm.estimated_hours} onChange={e => setBidForm(p => ({ ...p, estimated_hours: e.target.value }))} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Message to student</label>
                        <textarea id="bid-message" className="input-field" placeholder="Explain your approach and why you're the best fit..." rows={4}
                          value={bidForm.message} onChange={e => setBidForm(p => ({ ...p, message: e.target.value }))} required style={{ resize: 'vertical' }} />
                      </div>
                      {bidForm.quoted_rate && bidForm.estimated_hours && (
                        <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#d4af37' }}>
                          Total estimate: <strong>{(parseFloat(bidForm.quoted_rate) * parseFloat(bidForm.estimated_hours)).toFixed(0)} ETB</strong>
                        </div>
                      )}
                      <button id="submit-bid" type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {submitting ? 'Submitting...' : 'Submit Bid'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Meeting Creator for instructors with accepted sessions */}
              {isSessionHelper && request.session && !request.session.meeting_link && (
                <div className="glass" style={{ borderRadius: 20, padding: '1.5rem', marginTop: '1rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={18} color="#818cf8" /> Create Meeting Link
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Create a meeting from your connected account for this session, or paste a manual link below.
                  </p>
                  
                  {!showMeetingCreator ? (
                    <button
                      onClick={() => openMeetingCreator(request.session.id)}
                      className="btn-primary"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                    >
                      Auto-Create Meeting
                    </button>
                  ) : (
                    <MeetingCreator
                      onMeetingCreated={handleMeetingCreated}
                      defaultTitle={`Help Session: ${request.title}`}
                      defaultDuration={request.estimated_hours * 60}
                      scheduledTime={new Date()}
                    />
                  )}
                </div>
              )}

              {/* Student info pane */}
              {!isInstructor && !isOwner && (
                <div className="glass" style={{ borderRadius: 20, padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <p style={{ fontSize: '0.9rem' }}>Only approved instructors can submit bids on help requests.</p>
                </div>
              )}

              {isOwner && (
                <div className="glass" style={{ borderRadius: 20, padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={18} color="#818cf8" /> Your Request
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Review the bids below and accept the one that best fits your needs. You'll pay upfront when accepting — funds are held in escrow until the session is complete.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
