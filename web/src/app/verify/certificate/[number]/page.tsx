'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Award, CheckCircle2, XCircle, Calendar, User, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CertificateVerificationPage() {
  const params = useParams();
  const certNumber = params.number as string;

  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!certNumber) return;
    setLoading(true);

    fetch(`${API}/api/certificates/verify/${certNumber}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setCertData(data))
      .catch(() => setErrorMsg('Certificate not found or invalid certificate ID.'))
      .finally(() => setLoading(false));
  }, [certNumber]);

  return (
    <div style={{ minHeight: '100vh', background: '#080a0f', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: 100, paddingBottom: 60, paddingLeft: '1rem', paddingRight: '1rem',
        background: 'radial-gradient(circle at 50% 30%, rgba(99,102,241,0.12) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: 640, width: '100%' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <Award size={48} className="animate-pulse" style={{ margin: '0 auto 1rem', color: '#818cf8' }} />
              <p>Verifying certificate authenticity...</p>
            </div>
          ) : errorMsg ? (
            <div style={{
              background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 24, padding: '3rem 2rem', textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}>
              <XCircle size={56} color="#f87171" style={{ margin: '0 auto 1.25rem' }} />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem' }}>
                Invalid Certificate
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                {errorMsg}
              </p>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Certificate ID: <code>{certNumber}</code>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 24, padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}>

              {/* Accent Header */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 6,
                background: 'linear-gradient(90deg, #d4af37, #f59e0b, #34d399)',
              }} />

              {/* Verified Badge */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                  padding: '0.4rem 1.1rem', borderRadius: 999, color: '#34d399',
                  fontSize: '0.85rem', fontWeight: 700,
                }}>
                  <ShieldCheck size={18} /> Official Verified Credential
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                  Certificate of Completion
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
                  Issued by <strong>EthioLearn Platform</strong>
                </p>
              </div>

              {/* Credential Attributes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <User size={24} color="#818cf8" />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Recipient</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>{certData.student_name}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <BookOpen size={24} color="#34d399" />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Course Completed</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{certData.course_title}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={20} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Issued Date</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                        {new Date(certData.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Award size={20} color="#d4af37" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Certificate ID</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d4af37', fontFamily: 'monospace' }}>
                        {certData.certificate_number}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Note */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                This digital credential confirms that the learner completed all required coursework and assessments on EthioLearn.
              </div>

            </div>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
}
