'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Wallet,
  Building2,
  Smartphone,
  RefreshCw,
  Loader2,
  ChevronRight,
  Sparkles,
  Send,
  TrendingUp,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';
type PayoutMethod = 'telebirr' | 'cbe_birr' | 'bank_transfer';

const METHOD_META: Record<PayoutMethod, { label: string; icon: React.ReactNode; placeholder: string }> = {
  telebirr:      { label: 'Telebirr',       icon: <Smartphone size={16} />,  placeholder: '0911 223 344' },
  cbe_birr:      { label: 'CBE Birr',       icon: <Smartphone size={16} />,  placeholder: '0911 223 344' },
  bank_transfer: { label: 'Bank Transfer',  icon: <Building2 size={16} />,   placeholder: 'Account number & bank name' },
};

const STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: <Clock size={13} /> },
  processing: { label: 'Processing',    color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.25)', icon: <Loader2 size={13} /> },
  paid:       { label: 'Paid Out',      color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: <CheckCircle2 size={13} /> },
  rejected:   { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: <XCircle size={13} /> },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status as PayoutStatus] ?? STATUS_META.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 999, padding: '0.3rem 0.8rem',
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

export default function InstructorPayoutsPage() {
  const { user } = useAuth();

  // Data
  const [availableBalance, setAvailableBalance] = useState(0);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Request form
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>('telebirr');
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async (isRefresh = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    isRefresh ? setRefreshing(true) : setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API}/api/payments/instructor/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load payout data');
      const data = await res.json();
      setAvailableBalance(data.availableBalance ?? 0);
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Unable to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const reqAmount = Number(amount);
    if (!reqAmount || reqAmount <= 0) { setFormError('Enter a valid amount.'); return; }
    if (reqAmount > availableBalance) { setFormError(`Amount exceeds your available balance (${availableBalance.toLocaleString()} ETB).`); return; }
    if (!accountDetails.trim()) { setFormError('Enter your account / phone number.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/payments/instructor/request-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: reqAmount, method, account_details: accountDetails.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request');

      setSuccessMsg(`Withdrawal request of ${reqAmount.toLocaleString()} ETB submitted! Admin will process it shortly.`);
      setAmount('');
      setAccountDetails('');
      setShowForm(false);
      fetchData(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit payout');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = payouts.filter(p => p.status === 'pending' || p.status === 'processing').length;
  const paidTotal = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#080a0f', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div style={{
        paddingTop: 90, paddingBottom: '2.5rem',
        background: 'linear-gradient(180deg, rgba(99,102,241,0.09) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 999, padding: '0.3rem 0.85rem',
              fontSize: '0.78rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.75rem',
            }}>
              <Sparkles size={13} /> Instructor Portal
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', color: '#ffffff', margin: 0 }}>
              Payout Management
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.35rem' }}>
              Request withdrawals, track payout status, and manage your payment accounts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '0.7rem 1.1rem', color: '#94a3b8',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>

            <button
              onClick={() => { setShowForm(true); setFormError(''); setSuccessMsg(''); }}
              disabled={availableBalance <= 0}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 700,
                borderRadius: 14, display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: availableBalance > 0 ? '0 0 22px rgba(99,102,241,0.35)' : 'none',
                opacity: availableBalance <= 0 ? 0.45 : 1,
                cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={16} /> Request Withdrawal
            </button>
          </div>
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', flex: 1 }}>

        {/* Global success */}
        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#34d399', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '2rem',
          }}>
            <CheckCircle2 size={20} /> {successMsg}
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '2rem',
          }}>
            <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        {/* ── Summary Cards ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>

          {/* Available Balance — highlighted */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.12))',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 20, padding: '1.5rem', gridColumn: 'span 1',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', color: '#818cf8' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available to Withdraw</span>
              <Wallet size={20} />
            </div>
            {loading ? (
              <div style={{ height: 36, background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {availableBalance.toLocaleString()}
                  <span style={{ fontSize: '1rem', color: '#818cf8', fontWeight: 600, marginLeft: '0.35rem' }}>ETB</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Ready for withdrawal</div>
              </>
            )}
          </div>

          {/* All-time paid out */}
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', color: '#10b981' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Paid Out</span>
              <CheckCircle2 size={20} />
            </div>
            {loading ? (
              <div style={{ height: 36, background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                  {paidTotal.toLocaleString()}
                  <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: 600, marginLeft: '0.35rem' }}>ETB</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Across all completed payouts</div>
              </>
            )}
          </div>

          {/* Pending requests */}
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', color: '#f59e0b' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</span>
              <Clock size={20} />
            </div>
            {loading ? (
              <div style={{ height: 36, background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                  {pendingCount}
                  <span style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 600, marginLeft: '0.35rem' }}>requests</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Awaiting admin approval</div>
              </>
            )}
          </div>

          {/* Go to Earnings shortcut */}
          <Link href="/instructor/earnings" style={{
            background: 'rgba(15,23,42,0.4)', border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '1.5rem', textDecoration: 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            transition: 'border-color 0.2s, background 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(15,23,42,0.4)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#818cf8' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Earnings</span>
              <TrendingUp size={20} />
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ color: '#f8fafc', fontSize: '0.92rem', fontWeight: 600 }}>View Sales Ledger</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                Gross earnings & commissions <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Payout History ────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 22, overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} color="#818cf8" /> Payout History
            </h2>
            {payouts.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{payouts.length} total request{payouts.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
              <CreditCard size={48} color="#334155" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>No payout requests yet</h3>
              <p style={{ color: '#334155', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                Once you have earnings, you can request withdrawals here.
              </p>
              <button
                onClick={() => setShowForm(true)}
                disabled={availableBalance <= 0}
                className="btn-primary"
                style={{ opacity: availableBalance <= 0 ? 0.4 : 1, cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer', padding: '0.65rem 1.5rem' }}
              >
                <Send size={15} style={{ marginRight: '0.4rem' }} /> Request Your First Payout
              </button>
            </div>
          ) : (
            <>
              {/* Column headings */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 180px 140px 120px',
                padding: '0.65rem 1.75rem',
                fontSize: '0.72rem', fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.2)',
              }}>
                <div>Account / Method</div>
                <div>Amount</div>
                <div>Requested On</div>
                <div>Paid On</div>
                <div style={{ textAlign: 'right' }}>Status</div>
              </div>

              {payouts.map((p: any, idx: number) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 180px 140px 120px',
                  alignItems: 'center',
                  padding: '1rem 1.75rem',
                  borderBottom: idx < payouts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Method + account */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
                    }}>
                      {p.method === 'bank_transfer' ? <Building2 size={16} /> : <Smartphone size={16} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                        {METHOD_META[p.method as PayoutMethod]?.label ?? p.method?.toUpperCase() ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {p.account_details || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                    {Number(p.amount).toLocaleString()}
                    <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '0.3rem' }}>ETB</span>
                  </div>

                  {/* Requested on */}
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </div>

                  {/* Paid on */}
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (
                      <span style={{ color: '#334155', fontStyle: 'italic' }}>Not yet</span>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Info note */}
        <div style={{
          marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 14, padding: '1rem 1.25rem',
        }}>
          <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>
            <strong style={{ color: '#f59e0b' }}>Processing time:</strong> Payout requests are typically reviewed and processed within <strong style={{ color: '#f8fafc' }}>2–5 business days</strong>.
            For bank transfers, allow an additional 1–2 days after admin approval. For any issues, contact{' '}
            <a href="mailto:support@axumia.com" style={{ color: '#818cf8', textDecoration: 'none' }}>support@axumia.com</a>.
          </p>
        </div>
      </div>

      {/* ── Request Payout Modal ──────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #0c1222 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 24, padding: '2rem', maxWidth: 500, width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>Request Withdrawal</h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.25rem', fontSize: '1.3rem', lineHeight: 1 }}
              >×</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Available balance: <strong style={{ color: '#818cf8' }}>{availableBalance.toLocaleString()} ETB</strong>
            </p>

            {formError && (
              <div style={{
                display: 'flex', gap: '0.6rem', alignItems: 'center',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', borderRadius: 12, padding: '0.75rem 1rem',
                fontSize: '0.85rem', marginBottom: '1.25rem',
              }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Method selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payout Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {(Object.keys(METHOD_META) as PayoutMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      style={{
                        padding: '0.7rem 0.5rem', borderRadius: 12, border: '1px solid',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                        background: method === m ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: method === m ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
                        color: method === m ? '#818cf8' : '#64748b',
                        transition: 'all 0.15s',
                      }}
                    >
                      {METHOD_META[m].icon}
                      {METHOD_META[m].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Amount (ETB)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    max={availableBalance}
                    step="1"
                    placeholder={`Max: ${availableBalance.toLocaleString()} ETB`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.85rem 1rem', paddingRight: '5.5rem',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12, color: '#ffffff', fontSize: '1rem', outline: 'none',
                    }}
                  />
                  {availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(availableBalance))}
                      style={{
                        position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 8, padding: '0.3rem 0.65rem', fontSize: '0.72rem',
                        fontWeight: 700, color: '#818cf8', cursor: 'pointer',
                      }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Account details */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {method === 'bank_transfer' ? 'Bank Account & Bank Name' : 'Phone / Wallet Number'}
                </label>
                <input
                  type="text"
                  placeholder={METHOD_META[method].placeholder}
                  value={accountDetails}
                  onChange={e => setAccountDetails(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, color: '#ffffff', fontSize: '0.95rem', outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: '0.85rem',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.85rem', borderRadius: 12, fontWeight: 700, opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <><Send size={16} /> Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <Footer />
    </div>
  );
}
