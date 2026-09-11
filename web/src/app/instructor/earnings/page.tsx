'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Building2,
  Smartphone,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function InstructorEarningsPage() {
  const { user } = useAuth();
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('telebirr');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchEarnings = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    setLoading(true);

    fetch(`${API}/api/payments/instructor/earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setEarningsData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const reqAmount = Number(amount);
    if (!reqAmount || reqAmount <= 0) {
      setErrorMsg('Please enter a valid payout amount.');
      return;
    }

    if (reqAmount > (earningsData?.availableBalance || 0)) {
      setErrorMsg(`Amount exceeds available balance (${earningsData?.availableBalance || 0} ETB).`);
      return;
    }

    if (!accountDetails.trim()) {
      setErrorMsg('Please enter your account number or phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/payments/instructor/request-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: reqAmount,
          method,
          account_details: accountDetails.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit payout request');
      }

      setSuccessMsg('Payout request submitted successfully! Admin will process your withdrawal.');
      setAmount('');
      setAccountDetails('');
      setShowPayoutModal(false);
      fetchEarnings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request payout');
    } finally {
      setSubmitting(false);
    }
  };

  const grossEarned = earningsData?.grossEarned || 0;
  const platformFees = earningsData?.platformFees || 0;
  const netEarned = earningsData?.netEarned || 0;
  const totalPaidOut = earningsData?.totalPaidOut || 0;
  const pendingPayouts = earningsData?.totalPendingPayouts || 0;
  const availableBalance = earningsData?.availableBalance || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080a0f', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        paddingTop: 90, paddingBottom: '2.5rem',
        background: 'linear-gradient(180deg, rgba(16,185,129,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, padding: '0.3rem 0.85rem', fontSize: '0.78rem', color: '#34d399', fontWeight: 600, marginBottom: '0.75rem' }}>
              <Sparkles size={13} /> Instructor Portal
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', color: '#ffffff', margin: 0 }}>
              Earnings & Withdrawals
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.35rem' }}>
              Track course sales revenue, 1-on-1 session fees, and request payouts to Telebirr or CBE.
            </p>
          </div>

          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={availableBalance <= 0}
            className="btn-primary"
            style={{
              padding: '0.85rem 1.75rem', fontSize: '0.95rem', fontWeight: 700,
              borderRadius: 14, boxShadow: '0 0 20px rgba(16,185,129,0.3)',
              background: availableBalance <= 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981, #059669)',
              cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <CreditCard size={18} /> Request Payout
          </button>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', flex: 1 }}>

        {successMsg && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '1rem 1.25rem', borderRadius: 14, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} /> {successMsg}
          </div>
        )}

        {/* ── Financial Cards Grid ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
          
          {/* Available Balance */}
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#34d399', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Balance</span>
              <DollarSign size={20} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {availableBalance.toLocaleString()} <span style={{ fontSize: '1rem', color: '#34d399', fontWeight: 600 }}>ETB</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>Ready for withdrawal</div>
          </div>

          {/* Net Earned */}
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#818cf8', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Net Earned</span>
              <TrendingUp size={20} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {netEarned.toLocaleString()} <span style={{ fontSize: '1rem', color: '#818cf8', fontWeight: 600 }}>ETB</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>After platform commission</div>
          </div>

          {/* Paid Out */}
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#c084fc', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid Out</span>
              <CheckCircle2 size={20} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {totalPaidOut.toLocaleString()} <span style={{ fontSize: '1rem', color: '#c084fc', fontWeight: 600 }}>ETB</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>Withdrawn to account</div>
          </div>

          {/* Pending Payouts */}
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f59e0b', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Payouts</span>
              <Clock size={20} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {pendingPayouts.toLocaleString()} <span style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 600 }}>ETB</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>Under admin review</div>
          </div>

        </div>

        {/* ── Payout History & Ledger Tables ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>

          {/* Payout History Table */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} color="#34d399" /> Payout Requests History
            </h3>

            {earningsData?.payouts && earningsData.payouts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {earningsData.payouts.map((p: any) => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                        {Number(p.amount).toLocaleString()} ETB
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {p.method?.toUpperCase()} ({p.account_details || 'N/A'}) • {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <span style={{
                        padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        background: p.status === 'paid' ? 'rgba(16,185,129,0.15)' : p.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.status === 'paid' ? '#34d399' : p.status === 'pending' ? '#f59e0b' : '#f87171',
                        border: `1px solid ${p.status === 'paid' ? 'rgba(16,185,129,0.3)' : p.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No payout requests submitted yet.
              </div>
            )}
          </div>

          {/* Sales Ledger */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#818cf8" /> Recent Sales Ledger
            </h3>

            {earningsData?.earningsLedger && earningsData.earningsLedger.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {earningsData.earningsLedger.slice(0, 8).map((item: any) => (
                  <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', lineClamp: 1, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        Student: {item.student} • {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#34d399', fontSize: '0.92rem' }}>
                        +{item.net} ETB
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Gross: {item.amount} ETB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No recorded sales transactions yet.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Request Payout Modal ───────────────────────────────────────── */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 24, padding: '2rem', maxWidth: 480, width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              Request Instructor Payout
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Available Balance: <strong style={{ color: '#34d399' }}>{availableBalance.toLocaleString()} ETB</strong>
            </p>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 12, fontSize: '0.85rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payout Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { id: 'telebirr', label: 'Telebirr' },
                    { id: 'cbe_birr', label: 'CBE Birr' },
                    { id: 'bank_transfer', label: 'Bank Transfer' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      style={{
                        padding: '0.65rem 0.5rem', borderRadius: 10, border: '1px solid',
                        fontSize: '0.82rem', fontWeight: method === m.id ? 700 : 500,
                        background: method === m.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: method === m.id ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
                        color: method === m.id ? '#34d399' : '#94a3b8',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Amount to Withdraw (ETB)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  max={availableBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#ffffff',
                    fontSize: '0.95rem', outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {method === 'bank_transfer' ? 'Bank Account Number & Bank Name' : 'Phone / Wallet Account Number'}
                </label>
                <input
                  type="text"
                  placeholder={method === 'telebirr' ? '0911223344 (Telebirr)' : 'Account Number'}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#ffffff',
                    fontSize: '0.95rem', outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 12, fontWeight: 700 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
