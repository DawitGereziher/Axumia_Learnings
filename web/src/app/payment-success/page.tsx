'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ArrowRight, BookOpen, Calendar, HelpCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref') || searchParams?.get('tx_ref') || '';
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'failed' | 'not_found'>('loading');
  const [verified, setVerified] = useState(false);
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [itemTitle, setItemTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setStatus('not_found');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await authFetch(`${API}/api/payments/verify/${ref}`);
        const data = await response.json();

        setStatus(data.status);
        setVerified(data.verified || false);
        if (data.courseSlug) setCourseSlug(data.courseSlug);
        if (data.entityType) setEntityType(data.entityType);
        if (data.entityId) setEntityId(data.entityId);
        if (data.amount !== undefined) setAmount(Number(data.amount));
        if (data.itemTitle) setItemTitle(data.itemTitle);
      } catch (error) {
        console.error('Payment verification failed:', error);
        setStatus('failed');
      }
    };

    verifyPayment();

    // Poll every 3 seconds for up to 30 seconds if payment is pending
    const interval = setInterval(() => {
      if (status === 'pending') {
        verifyPayment();
      } else {
        clearInterval(interval);
      }
    }, 3000);

    const timeout = setTimeout(() => clearInterval(interval), 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ref, status]);

  // Infer context: prefer entityType from API, fall back to tx_ref prefix
  const isCourse      = entityType === 'course'      || (!entityType && !ref.startsWith('h') && !ref.startsWith('b'));
  const isHelpSession = entityType === 'help_session' || ref.startsWith('h');
  const isBooking     = entityType === 'booking'     || ref.startsWith('b');

  const defaultReturnUrl = isCourse
    ? (courseSlug ? `/courses/${courseSlug}` : '/courses')
    : isBooking
    ? '/dashboard'
    : '/help-requests/mine';

  const defaultReturnLabel = isCourse
    ? 'Browse Courses'
    : isBooking
    ? 'View My Bookings'
    : 'View My Requests';

  if (status === 'loading') {
    return (
      <div className="card" style={{ maxWidth: 540, margin: '0 auto', padding: '3.5rem 2.5rem', textAlign: 'center', background: 'rgba(15,23,42,0.85)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#10b981' }} />
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.6rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
          Verifying Payment...
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Connecting with the payment gateway to confirm your transaction status.
        </p>
      </div>
    );
  }

  if (status === 'failed' || status === 'not_found') {
    return (
      <div className="card" style={{ maxWidth: 540, margin: '0 auto', padding: '3.5rem 2.5rem', textAlign: 'center', background: 'rgba(15,23,42,0.85)', borderRadius: 24, border: '1px solid rgba(239,68,68,0.25)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ef4444', margin: '0 auto 1.5rem',
        }}>
          <XCircle size={36} />
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.75rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
          Payment Unsuccessful
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {status === 'not_found'
            ? 'We could not locate this payment reference. Please check your bank records or contact support.'
            : 'Your payment could not be completed. No funds have been deducted from your account.'}
        </p>

        {ref && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
            Reference: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{ref}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href={defaultReturnUrl} className="btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none', padding: '0.85rem' }}>
            {defaultReturnLabel}
          </Link>
          <Link href="/" className="btn-ghost" style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="card" style={{ maxWidth: 540, margin: '0 auto', padding: '3.5rem 2.5rem', textAlign: 'center', background: 'rgba(15,23,42,0.85)', borderRadius: 24, border: '1px solid rgba(245,158,11,0.25)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f59e0b', margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={34} />
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.6rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
          Payment In Progress
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          We are waiting for final confirmation from Chapa. This page will update automatically once verified.
        </p>

        {ref && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
            Reference: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{ref}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost"
            style={{ display: 'block', width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
          >
            Refresh Status
          </button>
          <Link href={defaultReturnUrl} className="btn-ghost" style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem' }}>
            {defaultReturnLabel}
          </Link>
        </div>
      </div>
    );
  }

  // ── Successful Payment ────────────────────────────────────────────────────────
  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto', padding: '3.5rem 2.5rem', textAlign: 'center', background: 'rgba(15,23,42,0.9)', borderRadius: 24, border: '1px solid rgba(16,185,129,0.3)' }}>
      <div style={{
        width: 76, height: 76, borderRadius: '50%',
        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#10b981', margin: '0 auto 1.5rem',
      }}>
        <CheckCircle2 size={38} />
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
        color: '#34d399', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem',
        borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem',
      }}>
        <ShieldCheck size={13} /> Payment Confirmed
      </div>

      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
        Payment Successful!
      </h1>

      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
        {isHelpSession
          ? 'Your escrow payment has been secured. Your tutor has been notified and will share the session link shortly.'
          : isBooking
          ? 'Your 1-on-1 session is confirmed! The instructor will meet you at the scheduled time.'
          : 'Your course enrollment is complete. You now have lifetime access to all lectures and materials.'}
      </p>

      {/* Payment Summary Box */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '1.25rem',
        marginBottom: '2rem',
        textAlign: 'left',
      }}>
        {itemTitle && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
            <span style={{ color: '#64748b' }}>Item</span>
            <span style={{ color: '#f1f5f9', fontWeight: 600, maxWidth: '65%', textAlign: 'right' }}>{itemTitle}</span>
          </div>
        )}
        {amount !== null && amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
            <span style={{ color: '#64748b' }}>Amount Paid</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>{amount.toLocaleString()} ETB</span>
          </div>
        )}
        {ref && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Reference ID</span>
            <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{ref}</span>
          </div>
        )}
      </div>

      {/* Escrow safety badge for help sessions */}
      {isHelpSession && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 12,
          padding: '0.85rem 1rem',
          fontSize: '0.82rem',
          color: '#a5b4fc',
          textAlign: 'left',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2, color: '#818cf8' }} />
          <span>
            <strong>Axumia Escrow Protection:</strong> Your payment remains securely locked in platform escrow. The helper receives compensation only after you verify and mark the task complete.
          </span>
        </div>
      )}

      {/* Contextual Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {isCourse && (
          courseSlug ? (
            <Link
              href={`/courses/${courseSlug}/learn`}
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', textDecoration: 'none', padding: '0.9rem', fontSize: '1rem', fontWeight: 700,
              }}
            >
              <BookOpen size={18} /> Start Learning Now <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', textDecoration: 'none', padding: '0.9rem', fontSize: '1rem', fontWeight: 700,
              }}
            >
              <BookOpen size={18} /> Go to My Courses <ArrowRight size={16} />
            </Link>
          )
        )}

        {isBooking && (
          <Link
            href="/dashboard"
            className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', textDecoration: 'none', padding: '0.9rem', fontSize: '1rem', fontWeight: 700,
            }}
          >
            <Calendar size={18} /> View My Bookings <ArrowRight size={16} />
          </Link>
        )}

        {isHelpSession && (
          <Link
            href="/help-requests/mine"
            className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', textDecoration: 'none', padding: '0.9rem', fontSize: '1rem', fontWeight: 700,
            }}
          >
            <HelpCircle size={18} /> View My Help Requests &amp; Session <ArrowRight size={16} />
          </Link>
        )}

        {isCourse && courseSlug && (
          <Link
            href={`/courses/${courseSlug}`}
            className="btn-ghost"
            style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem' }}
          >
            View Course Syllabus
          </Link>
        )}

        <Link
          href="/"
          className="btn-ghost"
          style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem', color: '#64748b' }}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ paddingTop: '120px', flex: 1, paddingBottom: '4rem', background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(16,185,129,0.1) 0%, transparent 60%)' }}>
        <div className="container section">
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#10b981' }} />
              <p>Loading payment status...</p>
            </div>
          }>
            <PaymentSuccessContent />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  );
}
