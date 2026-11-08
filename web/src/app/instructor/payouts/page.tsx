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
  ShieldCheck,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';
type PayoutMethod = 'telebirr' | 'cbe_birr' | 'bank_transfer';

const METHOD_META: Record<PayoutMethod, { label: string; icon: React.ReactNode; placeholder: string }> = {
  telebirr:      { label: 'Telebirr',       icon: <Smartphone size={16} />,  placeholder: 'e.g. 0911 223 344' },
  cbe_birr:      { label: 'CBE Birr',       icon: <Smartphone size={16} />,  placeholder: 'e.g. 0911 223 344' },
  bank_transfer: { label: 'Bank Transfer',  icon: <Building2 size={16} />,   placeholder: 'Commercial Bank of Ethiopia - 1000...' },
};

const STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: <Clock size={13} /> },
  processing: { label: 'Processing',    color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)', icon: <Loader2 size={13} /> },
  paid:       { label: 'Settled & Paid',color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: <CheckCircle2 size={13} /> },
  rejected:   { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: <XCircle size={13} /> },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status as PayoutStatus] ?? STATUS_META.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 999, padding: '0.35rem 0.85rem',
      fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
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

      setSuccessMsg(`Withdrawal request of ${reqAmount.toLocaleString()} ETB submitted! Finance operations will process it shortly.`);
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

          {/* ── Hero Banner Container ───────────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3.5vw, 3rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
            marginBottom: '2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}>
            <div style={{ position: 'absolute', top: -70, right: -40, width: 300, height: 300, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 680 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.25rem 0.85rem', fontSize: '0.72rem',
                color: '#fde047', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem',
              }}>
                <Sparkles size={13} /> F I N A N C E  &amp;  E A R N I N G S
              </div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Earnings &amp; Payout Management
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                Seamlessly withdraw your course sales and tutoring session revenue via Telebirr, CBE Birr, or direct bank transfer across Ethiopia.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 14, padding: '0.75rem 1.25rem', color: '#ffffff',
                  fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>

              <button
                onClick={() => { setShowForm(true); setFormError(''); setSuccessMsg(''); }}
                disabled={availableBalance <= 0}
                style={{
                  padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 800,
                  borderRadius: 14, display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: availableBalance > 0 ? '#fde047' : 'rgba(255,255,255,0.15)',
                  color: availableBalance > 0 ? '#0c3b2e' : 'rgba(255,255,255,0.4)',
                  border: 'none', cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: availableBalance > 0 ? '0 4px 16px rgba(253, 224, 71, 0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={16} /> Request Withdrawal
              </button>
            </div>
          </div>

          {/* Feedback alerts */}
          {successMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '2rem',
            }}>
              <CheckCircle2 size={20} /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '2rem',
            }}>
              <AlertCircle size={20} /> {errorMsg}
            </div>
          )}

          {/* ── Summary Cards (Full Desktop Multi-Column Grid) ────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}>

            {/* Available Balance */}
            <div style={{
              background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(253, 224, 71, 0.05) 100%)',
              border: '2px solid rgba(253, 224, 71, 0.3)',
              borderRadius: 22, padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)' }}>Available to Withdraw</span>
                <Wallet size={22} style={{ color: 'var(--accent)' }} />
              </div>
              {loading ? (
                <div style={{ height: 42, background: 'var(--bg-secondary)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, fontFamily: 'Outfit, sans-serif' }}>
                    {availableBalance.toLocaleString()}
                    <span style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 700, marginLeft: '0.4rem' }}>ETB</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Net settled revenue ready for instant withdrawal request
                  </div>
                </>
              )}
            </div>

            {/* Total Paid Out */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 22, padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10b981' }}>Total Paid Out</span>
                <CheckCircle2 size={22} color="#10b981" />
              </div>
              {loading ? (
                <div style={{ height: 42, background: 'var(--bg-secondary)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, fontFamily: 'Outfit, sans-serif' }}>
                    {paidTotal.toLocaleString()}
                    <span style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 700, marginLeft: '0.4rem' }}>ETB</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Cumulative payout transfers successfully deposited
                  </div>
                </>
              )}
            </div>

            {/* Pending Requests */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 22, padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b' }}>Pending Requests</span>
                <Clock size={22} color="#f59e0b" />
              </div>
              {loading ? (
                <div style={{ height: 42, background: 'var(--bg-secondary)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, fontFamily: 'Outfit, sans-serif' }}>
                    {pendingCount}
                    <span style={{ fontSize: '1.1rem', color: '#f59e0b', fontWeight: 700, marginLeft: '0.4rem' }}>requests</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Processing in current batch cycle (24-48 business hours)
                  </div>
                </>
              )}
            </div>

            {/* Sales Ledger Shortcut */}
            <Link
              href="/instructor/earnings"
              style={{
                background: 'var(--bg-secondary)', border: '1px dashed var(--card-border)',
                borderRadius: 22, padding: '1.75rem', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'border-color 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Full Ledger</span>
                <ArrowUpRight size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800 }}>Detailed Sales Breakdown</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Inspect course enrollment orders, student booking escrow, and commission splits →
                </div>
              </div>
            </Link>
          </div>

          {/* ── Payout History Table Container ────────────────────────── */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '2rem',
          }}>
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={18} style={{ color: 'var(--accent)' }} /> Withdrawal &amp; Payout History
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
                  Auditable record of all requested, processing, and disbursed funds.
                </p>
              </div>

              {payouts.length > 0 && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {payouts.length} total transaction{payouts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 64, borderRadius: 14, background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : payouts.length === 0 ? (
              <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                <Wallet size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No withdrawal requests yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>
                  When students purchase your courses or book 1-on-1 tutoring sessions, your earnings appear here ready for withdrawal.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  disabled={availableBalance <= 0}
                  style={{
                    padding: '0.65rem 1.5rem', borderRadius: 12, fontWeight: 700,
                    background: availableBalance > 0 ? 'var(--pine-deep)' : 'var(--bg-secondary)',
                    color: availableBalance > 0 ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--card-border)', cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={15} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Request Your First Withdrawal
                </button>
              </div>
            ) : (
              <div>
                {/* Header row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'minmax(200px, 1.8fr) clamp(110px, 14vw, 160px) clamp(120px, 15vw, 180px) clamp(120px, 15vw, 180px) clamp(130px, 15vw, 160px)',
                  padding: '0.85rem 2rem',
                  fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--card-border)',
                  background: 'var(--bg-secondary)',
                }}>
                  <div>Payout Method &amp; Target</div>
                  <div>Amount</div>
                  <div>Requested Date</div>
                  <div>Disbursed Date</div>
                  <div style={{ textAlign: 'right' }}>Status</div>
                </div>

                {payouts.map((p: any, idx: number) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid', gridTemplateColumns: 'minmax(200px, 1.8fr) clamp(110px, 14vw, 160px) clamp(120px, 15vw, 180px) clamp(120px, 15vw, 180px) clamp(130px, 15vw, 160px)',
                      alignItems: 'center',
                      padding: '1.15rem 2rem',
                      borderBottom: idx < payouts.length - 1 ? '1px solid var(--card-border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Method + target */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                      }}>
                        {p.method === 'bank_transfer' ? <Building2 size={18} /> : <Smartphone size={18} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {METHOD_META[p.method as PayoutMethod]?.label ?? p.method?.toUpperCase() ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                          {p.account_details || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif' }}>
                      {Number(p.amount).toLocaleString()}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.35rem', fontWeight: 600 }}>ETB</span>
                    </div>

                    {/* Requested date */}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>

                    {/* Paid date */}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending payout</span>
                      )}
                    </div>

                    {/* Status badge */}
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance & SLA banner */}
          <div style={{
            display: 'flex', gap: '1rem', alignItems: 'flex-start',
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 20, padding: '1.25rem 1.75rem',
          }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Ethiopian Financial Regulatory SLA:</strong> Payout requests are verified by operations within <strong>1–2 business days</strong>.
              Telebirr and CBE Birr transfers settle instantly upon approval. Commercial bank transfers settle via CBE/NBE clearing in 1–2 business days. For escrow inquiries, contact{' '}
              <a href="mailto:support@axumia.com" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>support@axumia.com</a>.
            </div>
          </div>
        </div>
      </main>

      {/* ── Request Payout Modal ──────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 24, padding: '2rem', maxWidth: 520, width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Request Withdrawal</h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', fontSize: '1.4rem', lineHeight: 1 }}
              >×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', marginTop: 2 }}>
              Available balance: <strong style={{ color: 'var(--accent)' }}>{availableBalance.toLocaleString()} ETB</strong>
            </p>

            {formError && (
              <div style={{
                display: 'flex', gap: '0.6rem', alignItems: 'center',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', borderRadius: 12, padding: '0.75rem 1rem',
                fontSize: '0.85rem', marginBottom: '1.25rem',
              }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Method selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payout Destination
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                  {(Object.keys(METHOD_META) as PayoutMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      style={{
                        padding: '0.85rem 0.5rem', borderRadius: 14, border: '1px solid',
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                        background: method === m ? 'var(--pine-deep)' : 'var(--bg-secondary)',
                        borderColor: method === m ? 'var(--pine-deep)' : 'var(--card-border)',
                        color: method === m ? '#ffffff' : 'var(--text-secondary)',
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
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 12, color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                    }}
                  />
                  {availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(availableBalance))}
                      style={{
                        position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'var(--pine-deep)', border: 'none',
                        borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.72rem',
                        fontWeight: 800, color: '#fde047', cursor: 'pointer',
                      }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Account details */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {method === 'bank_transfer' ? 'Bank Account Number & Bank Name' : 'Registered Mobile Number'}
                </label>
                <input
                  type="text"
                  placeholder={METHOD_META[method].placeholder}
                  value={accountDetails}
                  onChange={e => setAccountDetails(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.85rem 1rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: '0.85rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 12, color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: 12, fontWeight: 800,
                    background: 'var(--pine-deep)', color: '#ffffff', border: 'none',
                    opacity: submitting ? 0.7 : 1, cursor: submitting ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <><Send size={16} /> Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
