'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'failed' | 'not_found'>('loading');
  const [verified, setVerified] = useState(false);
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);

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

    setTimeout(() => clearInterval(interval), 30000);

    return () => clearInterval(interval);
  }, [ref, status]);

  // Infer context: prefer entityType from API, fall back to tx_ref prefix
  const isCourse     = entityType === 'course'    || (!entityType && !ref.startsWith('h') && !ref.startsWith('b'));
  const isHelpSession = entityType === 'help_session' || ref.startsWith('h');
  const isBooking     = entityType === 'booking'   || ref.startsWith('b');

  if (status === 'loading') {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#10b981' }} />
        </div>
        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Verifying Payment...
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Please wait while we confirm your payment status with Chapa.
        </p>
      </div>
    );
  }

  if (status === 'failed' || status === 'not_found') {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: '#ef4444', margin: '0 auto 1.5rem',
        }}>
          <XCircle size={32} />
        </div>

        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          Payment Failed
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {status === 'not_found' 
            ? 'Payment reference not found. Please contact support if you believe this is an error.'
            : 'Your payment could not be completed. Please try again or contact support if the issue persists.'}
        </p>

        {ref && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
            Reference: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{ref}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/help-requests/mine" className="btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none' }}>
            Return to My Requests
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
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: '#f59e0b', margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={32} />
        </div>

        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Payment Processing
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Your payment is being processed. We're waiting for confirmation from Chapa. This page will update automatically, or you can refresh to check the status.
        </p>

        {ref && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
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
          <Link href="/help-requests/mine" className="btn-ghost" style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem' }}>
            Return to My Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', color: '#10b981', margin: '0 auto 1.5rem',
      }}>
        <CheckCircle2 size={32} />
      </div>

      <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Payment Successful!
      </h1>

      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {isHelpSession
          ? 'Your escrow payment is confirmed. The instructor will share a meeting link shortly — check your requests dashboard to join the session.'
          : isBooking
          ? 'Your session booking is confirmed! The instructor will be in touch with meeting details.'
          : 'Thank you! Your purchase is confirmed. You now have full access to your course.'}
      </p>

      {verified && (
        <div style={{ 
          background: 'rgba(16,185,129,0.1)', 
          border: '1px solid rgba(16,185,129,0.3)', 
          borderRadius: 8, 
          padding: '0.5rem 1rem', 
          fontSize: '0.8rem', 
          color: '#10b981', 
          marginBottom: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={14} /> Payment verified with Chapa
        </div>
      )}

      {ref && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
          Reference: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{ref}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {isHelpSession && (
          <Link href="/help-requests/mine" className="btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none' }}>
            📋 View My Requests &amp; Session →
          </Link>
        )}
        {isBooking && (
          <Link href="/dashboard" className="btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none' }}>
            View My Bookings →
          </Link>
        )}
        {isCourse && (
          courseSlug ? (
            <Link
              href={`/courses/${courseSlug}?enrolled=1`}
              className="btn-primary"
              style={{ display: 'block', width: '100%', textDecoration: 'none', textAlign: 'center' }}
            >
              ▶ Start Learning Now →
            </Link>
          ) : (
            <Link href="/dashboard" className="btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none' }}>
              Go to My Courses →
            </Link>
          )
        )}
        <Link href="/" className="btn-ghost" style={{ display: 'block', textDecoration: 'none', fontSize: '0.88rem' }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(16,185,129,0.1) 0%, transparent 60%)' }}>
        <div className="container section">
          <Suspense fallback={<p style={{ textAlign: 'center', color: '#64748b' }}>Loading payment confirmation…</p>}>
            <PaymentSuccessContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
