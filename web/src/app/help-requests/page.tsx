'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { HelpCircle, PlusCircle, Search, Clock, User, CheckCircle2, MessageSquare, X, AlertCircle, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SUBJECT_OPTIONS = [
  'All', 'Mathematics', 'Physics', 'Computer Science', 'English',
  'Chemistry', 'Biology', 'History', 'Other',
];

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  open:        { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  completed:   { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  cancelled:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
};

export default function HelpRequestMarketplacePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Post Request Modal
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState('');

  // Bid Modal (instructors)
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    fetch(`${API}/api/help-requests`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setRequests(Array.isArray(data) ? data : data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  // Only show open requests from OTHER students to instructors
  const visibleRequests = useMemo(() => {
    return requests.filter(r => {
      // Hide user's own requests from the public feed
      if (user && r.student_id === user.id) return false;
      // Apply search
      if (search) {
        const q = search.toLowerCase();
        if (!r.subject?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false;
      }
      // Apply subject filter
      if (subjectFilter !== 'All' && r.subject_area?.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      return true;
    });
  }, [requests, search, subjectFilter, user]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    if (!subject.trim() || !description.trim()) { setPostError('Subject and description are required.'); return; }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, budget: Number(budget) || 0 }),
      });
      if (res.ok) {
        setShowModal(false);
        setSubject(''); setDescription(''); setBudget('');
        fetchRequests();
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to post request');
      }
    } catch (err: any) { setPostError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setBidError('');
    if (!bidAmount || Number(bidAmount) <= 0) { setBidError('Enter a valid bid amount.'); return; }
    if (!bidMessage.trim()) { setBidError('Add a proposal message.'); return; }
    setSubmittingBid(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/${selectedReq.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(bidAmount), message: bidMessage }),
      });
      if (res.ok) {
        setSelectedReq(null); setBidAmount(''); setBidMessage('');
        fetchRequests();
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to submit bid');
      }
    } catch (err: any) { setBidError(err.message); }
    finally { setSubmittingBid(false); }
  };

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <PageTemplate fullWidth={true}>
      {/* ── Figma Hero Banner Container ────────────────────────── */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
        <div style={{
          background: 'var(--pine-deep)',
          borderRadius: 28,
          padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
        }}>
          {/* Subtle background circles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -100, left: '30%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 840 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.75rem',
              fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#fde047', marginBottom: '1.25rem',
            }}>
              <HelpCircle size={14} /> C O M M U N I T Y  H E L P
            </div>

            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.15,
              color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
            }}>
              Get personalized help from{' '}
              <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                verified tutors.
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h1>

            <p style={{
              color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
              lineHeight: 1.6, marginBottom: '2rem', maxWidth: 680,
            }}>
              Post your specific homework challenge, coding roadblock, or research question. Certified tutors submit proposals with guaranteed escrow protection.
            </p>

            {/* Action Bar (Pill Search + CTA) */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => { setShowModal(true); setPostError(''); }}
                className="btn-primary"
                style={{
                  padding: '0.9rem 2rem', borderRadius: 999, fontWeight: 800,
                  fontSize: '0.95rem', background: '#fde047', color: '#0c3b2e',
                  display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              >
                <PlusCircle size={18} /> Post a Help Request →
              </button>

              {user && !isInstructor && (
                <Link
                  href="/help-requests/mine"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 999, padding: '0.85rem 1.6rem', color: '#ffffff',
                    fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  My Open Requests
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Pill Bar ────────────────────────────── */}
      <div className="container" style={{ paddingBottom: '1.5rem' }}>
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 20, padding: '1rem 1.5rem',
          display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}>
          {/* Capsule Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              placeholder="Search by subject, skill, or problem description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                borderRadius: 999, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          {/* Subject Filter Pills */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {SUBJECT_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                style={{
                  padding: '0.5rem 1.15rem', borderRadius: 999, border: '1px solid',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: subjectFilter === s ? 'var(--pine-deep)' : 'transparent',
                  borderColor: subjectFilter === s ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: subjectFilter === s ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Request Grid ────────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: '5rem', flex: 1 }}>

        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Showing {visibleRequests.length} active learning request{visibleRequests.length !== 1 ? 's' : ''}
            </div>
            {(search || subjectFilter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setSubjectFilter('All'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '1.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: 220, borderRadius: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : visibleRequests.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '1.5rem' }}>
            {visibleRequests.map(req => {
              const statusStyle = STATUS_COLORS[req.status] || STATUS_COLORS.open;
              return (
                <div key={req.id} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  borderRadius: 24, padding: '1.75rem', display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--pine-deep)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(12, 59, 46, 0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.8rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {req.status?.replace('_', ' ') || 'OPEN'}
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)' }}>
                        {req.budget ? `${req.budget.toLocaleString()} ETB` : 'Flexible Budget'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>{req.subject}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                      {req.description?.length > 150 ? `${req.description.slice(0, 150)}…` : req.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                        <User size={13} color="var(--accent)" /> {req.student?.first_name || 'Student'}
                      </div>
                      {req._count?.bids > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: 999, fontWeight: 600 }}>
                          <MessageSquare size={12} /> {req._count.bids} proposal{req._count.bids !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Only instructors / non-owners can bid */}
                      {isInstructor && req.status === 'open' && (
                        <button
                          onClick={() => { setSelectedReq(req); setBidError(''); setBidAmount(''); setBidMessage(''); }}
                          style={{
                            background: 'var(--pine-deep)', border: 'none', color: '#ffffff',
                            borderRadius: 999, padding: '0.5rem 1.15rem', fontSize: '0.82rem',
                            fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(12, 59, 46, 0.2)',
                          }}
                        >
                          <MessageSquare size={13} /> Submit Proposal
                        </button>
                      )}

                      {/* View detail link */}
                      <Link
                        href={`/help-requests/${req.id}`}
                        style={{
                          fontSize: '0.85rem', color: 'var(--pine-deep)', textDecoration: 'none',
                          fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: 28, maxWidth: 520, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <HelpCircle size={48} color="var(--accent)" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No open requests right now</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              {search || subjectFilter !== 'All' ? 'Try adjusting or resetting your filter criteria.' : 'Be the first student to post a custom learning need and receive tailored instructor proposals!'}
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: 999, fontWeight: 700 }}>
              Post a Help Request →
            </button>
          </div>
        )}
      </div>

      {/* ── Post Request Modal ──────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12, 59, 46, 0.45)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '2.25rem', maxWidth: 500, width: '100%', boxShadow: '0 25px 60px rgba(12, 59, 46, 0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>Post a Help Request</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.6rem', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.5rem' }}>Describe what you need and your budget. Verified instructors will pitch proposals.</p>

            {postError && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertCircle size={15} /> {postError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject / Topic *</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Python AsyncIO & Recursion" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Description & Goal *</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="What exactly do you need help with? Include your goals and any relevant context…" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Budget (ETB) — optional</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 500 (leave blank for flexible)" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', borderRadius: 999, padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, borderRadius: 999, border: 'none', background: 'var(--pine-deep)', color: '#ffffff', padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Posting…</> : 'Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bid Modal (instructors only) ─────────────────────────── */}
      {selectedReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12, 59, 46, 0.45)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '2.25rem', maxWidth: 500, width: '100%', boxShadow: '0 25px 60px rgba(12, 59, 46, 0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Submit Proposal</h2>
              <button onClick={() => setSelectedReq(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.6rem', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
              Bidding for: <strong style={{ color: 'var(--text-primary)' }}>{selectedReq.subject}</strong>
              {selectedReq.budget ? ` · Client budget: ${selectedReq.budget} ETB` : ''}
            </p>

            {bidError && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertCircle size={15} /> {bidError}
              </div>
            )}

            <form onSubmit={handleSubmitBid} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Your Rate (ETB) *</label>
                <input type="number" required value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder={`Client budget: ${selectedReq.budget || 0} ETB`} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Proposal Message *</label>
                <textarea required rows={4} value={bidMessage} onChange={e => setBidMessage(e.target.value)} placeholder="Explain why you're the right tutor and how you'd approach this…" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedReq(null)} style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', borderRadius: 999, padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingBid} style={{ flex: 1, borderRadius: 999, border: 'none', background: 'var(--pine-deep)', color: '#ffffff', padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', opacity: submittingBid ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)', cursor: submittingBid ? 'not-allowed' : 'pointer' }}>
                  {submittingBid ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </PageTemplate>
  );
}
