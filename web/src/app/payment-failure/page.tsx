'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useSearchParams } from 'next/navigation';
import { XCircle, RefreshCw, HelpCircle, ArrowLeft } from 'lucide-react';

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref') || searchParams?.get('tx_ref') || '';
  const reason = searchParams?.get('reason') || 'Transaction was cancelled or declined by your payment provider.';

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', color: '#ef4444', margin: '0 auto 1.5rem',
      }}>
        <XCircle size={36} />
      </div>

      <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Payment Unsuccessful
      </h1>

      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {reason}
      </p>

      {ref && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '2rem' }}>
          Reference: <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{ref}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={() => window.history.back()}
          className="btn-primary"
          style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} /> Try Again
        </button>

        <Link
          href="/courses"
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={16} /> Return to Courses
        </Link>

        <a
          href="mailto:support@ethiolearn.com"
          style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'underline', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
        >
          <HelpCircle size={14} /> Need help? Contact Support
        </a>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ paddingTop: '120px', flex: 1, background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(239,68,68,0.08) 0%, transparent 60%)' }}>
        <div className="container section">
          <Suspense fallback={<p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>}>
            <PaymentFailureContent />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  );
}
