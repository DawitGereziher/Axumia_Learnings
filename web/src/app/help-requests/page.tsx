'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  PlusCircle,
  Search,
  Clock,
  User,
  CheckCircle2,
  MessageSquare,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
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
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [feedTab, setFeedTab] = useState<'all' | 'mine'>('all');

  // Post Request Modal
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [subjectArea, setSubjectArea] = useState('Mathematics');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('300');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [successToast, setSuccessToast] = useState('');

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

  const myRequestsCount = useMemo(() => {
    if (!user) return 0;
    return requests.filter(r => r.student_id === user.id).length;
  }, [requests, user]);

  const visibleRequests = useMemo(() => {
    return requests.filter(r => {
      // If user selected 'mine', filter to user's requests only
      if (feedTab === 'mine') {
        if (!user || r.student_id !== user.id) return false;
      }
      // Apply search
      if (search) {
        const q = search.toLowerCase();
        const titleMatch = (r.title || r.subject || '').toLowerCase().includes(q);
        const descMatch = (r.description || '').toLowerCase().includes(q);
        const areaMatch = (r.subject_area || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !areaMatch) return false;
      }
      // Apply subject filter
      if (subjectFilter !== 'All' && r.subject_area?.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      return true;
    });
  }, [requests, search, subjectFilter, user, feedTab]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    if (!subject.trim() || !description.trim()) {
      setPostError('Subject and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const budgetNum = Number(budget) > 0 ? Number(budget) : 100;
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + (Number(deadlineDays) || 7));

      const res = await authFetch(`${API}/api/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subject.trim(),
          subject: subject.trim(),
          description: description.trim(),
          subject_area: subjectArea || 'General',
          budget_max_per_hour: budgetNum,
          budget: budgetNum,
          estimated_hours: 1,
          deadline: deadlineDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = Array.isArray(d.message) ? d.message.join(', ') : (d.message || 'Failed to post request');
        throw new Error(msg);
      }

      const created = await res.json();
      setShowModal(false);
      setSubject('');
      setDescription('');
      setBudget('300');
      setSuccessToast('Your help request was published successfully!');
      setTimeout(() => setSuccessToast(''), 5000);

      if (created?.id) {
        router.push(`/help-requests/${created.id}`);
        return;
      }
      fetchRequests();
    } catch (err: any) {
      setPostError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setBidError('');
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) { setBidError('Enter a valid bid amount.'); return; }
    if (selectedReq.budget_max_per_hour && amount > Number(selectedReq.budget_max_per_hour)) {
      setBidError(`Your rate cannot exceed the student's maximum budget of ${selectedReq.budget_max_per_hour} ETB/hr.`);
      return;
    }
    if (!bidMessage.trim()) { setBidError('Please add a proposal message explaining how you will assist.'); return; }
    setSubmittingBid(true);
    try {
      const res = await authFetch(`${API}/api/help-requests/${selectedReq.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoted_rate: amount, estimated_hours: 1, message: bidMessage.trim() }),
      });
      if (res.ok) {
        setSelectedReq(null); setBidAmount(''); setBidMessage('');
        setSuccessToast('Your proposal has been successfully submitted to the student!');
        setTimeout(() => setSuccessToast(''), 5000);
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
      <div style={{ width: '100%', maxWidth: 1720, margin: '0 auto', padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem', boxSizing: 'border-box' }}>

        {/* ── Success Banner ────────────────────────────────────────── */}
        {successToast && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#34d399', borderRadius: 16, padding: '1rem 1.5rem', marginBottom: '1.75rem',
            boxShadow: '0 4px 18px rgba(16,185,129,0.15)',
          }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{successToast}</span>
          </div>
        )}

        {/* ── Figma Hero Banner Container ────────────────────────── */}
        <div style={{
          background: 'var(--pine-deep)',
          borderRadius: 28,
          padding: 'clamp(2rem, 4vw, 3.25rem) clamp(1.5rem, 3.5vw, 3rem)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
          marginBottom: '2rem',
        }}>
          {/* Subtle ambient glows */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -100, left: '30%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ maxWidth: 840 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.75rem',
                fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '1.25rem',
              }}>
                <Sparkles size={14} /> 1 - O N - 1  A S S I S T A N C E  M A R K E T P L A C E
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', lineHeight: 1.15,
                color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
              }}>
                Get personalized help from{' '}
                <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                  verified Ethiopian tutors.
                  <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                  </svg>
                </span>
              </h1>

              <p style={{
                color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.4vw, 1.05rem)',
                lineHeight: 1.6, margin: 0, maxWidth: 680,
              }}>
                Post your specific homework challenge, coding roadblock, or research question. Certified educators submit competitive hourly proposals backed by guaranteed escrow protection.
              </p>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href="/help-requests/new"
                className="btn-primary"
                style={{
                  padding: '0.9rem 2rem', borderRadius: 999, fontWeight: 800,
                  fontSize: '0.95rem', background: '#fde047', color: '#0c3b2e',
                  display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                  border: 'none', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              >
                <PlusCircle size={18} /> Post a Help Request →
              </Link>

              {user && (
                <button
                  onClick={() => { setShowModal(true); setPostError(''); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 999, padding: '0.85rem 1.6rem', color: '#ffffff',
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Quick Post Modal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Feed Tab Switcher + Search Bar ─────────────────────────── */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 22, padding: '1rem 1.5rem', marginBottom: '2rem',
          display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}>
          {/* Feed View Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFeedTab('all')}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: 999, border: '1px solid',
                background: feedTab === 'all' ? 'var(--pine-deep)' : 'transparent',
                borderColor: feedTab === 'all' ? 'var(--pine-deep)' : 'var(--card-border)',
                color: feedTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              All Open Requests ({requests.length})
            </button>
            {user && (
              <button
                onClick={() => setFeedTab('mine')}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: 999, border: '1px solid',
                  background: feedTab === 'mine' ? 'var(--pine-deep)' : 'transparent',
                  borderColor: feedTab === 'mine' ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: feedTab === 'mine' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                👑 My Requests ({myRequestsCount})
              </button>
            )}
          </div>

          {/* Search Capsule */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 440 }}>
            <Search size={16} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              placeholder="Search by subject, skill, or problem description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
                background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                borderRadius: 999, color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Subject Filter Pills ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {SUBJECT_OPTIONS.map(s => {
            const active = subjectFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                style={{
                  padding: '0.45rem 1.1rem', borderRadius: 999, border: '1px solid',
                  background: active ? 'var(--pine-deep)' : 'var(--card-bg)',
                  borderColor: active ? 'var(--pine-deep)' : 'var(--card-border)',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* ── Results Info Bar ──────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Showing {visibleRequests.length} {feedTab === 'mine' ? 'of your' : 'active'} learning request{visibleRequests.length !== 1 ? 's' : ''}
            </div>
            {(search || subjectFilter !== 'All' || feedTab !== 'all') && (
              <button
                onClick={() => { setSearch(''); setSubjectFilter('All'); setFeedTab('all'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* ── Full Width Desktop Request Cards Grid ─────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 240, borderRadius: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : visibleRequests.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {visibleRequests.map(req => {
              const statusStyle = STATUS_COLORS[req.status] || STATUS_COLORS.open;
              const isOwner = user && req.student_id === user.id;

              return (
                <div
                  key={req.id}
                  style={{
                    background: isOwner ? 'linear-gradient(160deg, var(--card-bg) 0%, rgba(253, 224, 71, 0.04) 100%)' : 'var(--card-bg)',
                    border: isOwner ? '2px solid rgba(253, 224, 71, 0.5)' : '1px solid var(--card-border)',
                    borderRadius: 24, padding: '1.75rem', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', transition: 'all 0.2s ease',
                    boxShadow: isOwner ? '0 8px 30px rgba(253, 224, 71, 0.1)' : '0 4px 20px rgba(0,0,0,0.03)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = isOwner ? 'rgba(253, 224, 71, 0.5)' : 'var(--card-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <div>
                    {/* Top Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.8rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {req.status?.replace('_', ' ') || 'OPEN'}
                        </span>
                        {isOwner && (
                          <span style={{
                            background: '#fde047', color: '#0c3b2e',
                            fontSize: '0.72rem', fontWeight: 900, padding: '0.25rem 0.75rem',
                            borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            👑 Your Request
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent)', fontFamily: 'Outfit, sans-serif' }}>
                        {(req.budget_max_per_hour || req.budget) ? `${Number(req.budget_max_per_hour || req.budget).toLocaleString()} ETB/hr` : 'Negotiable'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                      {req.title || req.subject || 'Help Request'}
                    </h3>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                      {req.description?.length > 150 ? `${req.description.slice(0, 150)}…` : req.description}
                    </p>
                  </div>

                  {/* Bottom Footer Info */}
                  <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                        <User size={13} style={{ color: 'var(--accent)' }} /> {req.student?.first_name || 'Student'}
                      </div>
                      {req._count?.bids > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', padding: '0.25rem 0.7rem', borderRadius: 999, fontWeight: 700, border: '1px solid var(--card-border)' }}>
                          <MessageSquare size={12} /> {req._count.bids} proposal{req._count.bids !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {/* If owner: direct manage button */}
                      {isOwner ? (
                        <Link
                          href={`/help-requests/${req.id}`}
                          style={{
                            background: 'var(--pine-deep)', color: '#ffffff',
                            borderRadius: 999, padding: '0.5rem 1.25rem', fontSize: '0.82rem',
                            fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 4px 12px rgba(12, 59, 46, 0.2)',
                          }}
                        >
                          View Bids ({req._count?.bids || 0}) →
                        </Link>
                      ) : isInstructor && req.status === 'open' ? (
                        <button
                          onClick={() => { setSelectedReq(req); setBidError(''); setBidAmount(''); setBidMessage(''); }}
                          style={{
                            background: 'var(--pine-deep)', border: 'none', color: '#ffffff',
                            borderRadius: 999, padding: '0.5rem 1.15rem', fontSize: '0.82rem',
                            fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(12, 59, 46, 0.2)',
                          }}
                        >
                          <MessageSquare size={13} /> Submit Proposal
                        </button>
                      ) : (
                        <Link
                          href={`/help-requests/${req.id}`}
                          style={{
                            fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none',
                            fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}
                        >
                          Details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: 28, maxWidth: 540, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <HelpCircle size={48} style={{ color: 'var(--accent)', margin: '0 auto 1rem', opacity: 0.8 }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {feedTab === 'mine' ? 'You have no open requests yet' : 'No open requests found'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              {feedTab === 'mine'
                ? 'Create a customized help request for your assignments, exam prep, or coding projects.'
                : 'Be the first student to post a custom learning need and receive tailored instructor proposals!'}
            </p>
            <Link href="/help-requests/new" className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: 999, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
              Post a Help Request →
            </Link>
          </div>
        )}
      </div>

      {/* ── Post Request Modal ──────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '2.25rem', maxWidth: 520, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Post a Help Request</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.6rem', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.5rem', marginTop: 2 }}>
              Describe what you need and your hourly budget. Verified instructors will pitch proposals.
            </p>

            {postError && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertCircle size={15} /> {postError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Subject / Topic *</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Python AsyncIO & Recursion" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Subject Area / Category</label>
                <select
                  value={subjectArea}
                  onChange={e => setSubjectArea(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                >
                  {SUBJECT_OPTIONS.filter(s => s !== 'All').map(s => (
                    <option key={s} value={s} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Description &amp; Goal *</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="What exactly do you need help with? Include your goals and any relevant context…" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Max Rate (ETB/hr)</label>
                  <input type="number" min="50" step="10" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 300" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Deadline (days)</label>
                  <input type="number" min="1" max="60" value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} placeholder="e.g. 7" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', borderRadius: 12, padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, borderRadius: 12, border: 'none', background: 'var(--pine-deep)', color: '#ffffff', padding: '0.75rem', fontWeight: 800, fontSize: '0.9rem', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Posting…</> : 'Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bid Modal (instructors only) ─────────────────────────── */}
      {selectedReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '2.25rem', maxWidth: 520, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Submit Proposal</h2>
              <button onClick={() => setSelectedReq(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.6rem', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem', marginTop: 2 }}>
              Bidding for: <strong style={{ color: 'var(--text-primary)' }}>{selectedReq.title || selectedReq.subject}</strong>
              {(selectedReq.budget_max_per_hour || selectedReq.budget) ? ` · Client budget: ${selectedReq.budget_max_per_hour || selectedReq.budget} ETB/hr` : ''}
            </p>

            {bidError && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertCircle size={15} /> {bidError}
              </div>
            )}

            <form onSubmit={handleSubmitBid} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Your Rate (ETB/hr) *</label>
                <input type="number" required min="1" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder={`Client budget: ${selectedReq.budget_max_per_hour || selectedReq.budget || 0} ETB`} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Proposal Message *</label>
                <textarea required rows={4} value={bidMessage} onChange={e => setBidMessage(e.target.value)} placeholder="Explain why you're the right tutor and how you'd approach this…" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedReq(null)} style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', borderRadius: 12, padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingBid} style={{ flex: 1, borderRadius: 12, border: 'none', background: 'var(--pine-deep)', color: '#ffffff', padding: '0.75rem', fontWeight: 800, fontSize: '0.9rem', opacity: submittingBid ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(12, 59, 46, 0.22)', cursor: submittingBid ? 'not-allowed' : 'pointer' }}>
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
