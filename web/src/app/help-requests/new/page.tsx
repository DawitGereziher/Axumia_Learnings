'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Lightbulb,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SUBJECTS = [
  { value: 'math',     label: 'Mathematics',      emoji: '📐' },
  { value: 'physics',  label: 'Physics',           emoji: '⚛️' },
  { value: 'cs',       label: 'Computer Science',  emoji: '💻' },
  { value: 'english',  label: 'English',           emoji: '📖' },
  { value: 'chemistry',label: 'Chemistry',         emoji: '🧪' },
  { value: 'biology',  label: 'Biology',           emoji: '🧬' },
  { value: 'history',  label: 'History',           emoji: '🏛️' },
  { value: 'other',    label: 'Other',             emoji: '🎯' },
];

const TIPS = [
  'Be specific — "Grade 12 differential equations, struggling with chain rule" attracts better bids than "math help".',
  'Add context: Mention upcoming exams, project deadlines, or specific problem sets to help tutors assess effort.',
  'Escrow Security: When you accept a proposal, funds are deposited into secure escrow and only released after your session is completed.',
  'Direct Chat: You can message bidders to clarify questions before confirming an agreement.',
];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 800,
  color: 'var(--text-secondary)', marginBottom: '0.45rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.85rem 1.15rem',
  background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
  borderRadius: 14, color: 'var(--text-primary)', fontSize: '0.92rem',
  outline: 'none', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

export default function NewHelpRequestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Pre-fill deadline to 7 days from now
  const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_area: 'cs',
    budget_max_per_hour: '300',
    estimated_hours: '1',
    deadline: defaultDeadline,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!loading && !user) { router.push('/login'); return null; }

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const estimatedTotal =
    form.budget_max_per_hour && form.estimated_hours
      ? (parseFloat(form.budget_max_per_hour) * parseFloat(form.estimated_hours)).toLocaleString()
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.title.trim() || !form.description.trim() || !form.budget_max_per_hour) {
      setError('Please fill in all required fields (title, description, and budget).');
      return;
    }

    setSubmitting(true);
    try {
      const budgetNum = parseFloat(form.budget_max_per_hour) || 200;
      const hoursNum = parseFloat(form.estimated_hours) || 1;
      const deadlineDate = form.deadline ? new Date(form.deadline) : new Date(Date.now() + 7 * 86400000);

      const res = await authFetch(`${API}/api/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          subject_area: form.subject_area,
          budget_max_per_hour: budgetNum,
          estimated_hours: hoursNum,
          deadline: isNaN(deadlineDate.getTime()) ? new Date(Date.now() + 7 * 86400000).toISOString() : deadlineDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Failed to create request');
        throw new Error(msg);
      }

      const created = await res.json();
      setSuccessMsg('Help request published successfully! Navigating to your request…');

      setTimeout(() => {
        if (created?.id) {
          router.push(`/help-requests/${created.id}`);
        } else {
          router.push('/help-requests');
        }
      }, 700);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating your request.');
      setSubmitting(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />

      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{
          width: '100%',
          maxWidth: 1720,
          margin: '0 auto',
          padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem',
          boxSizing: 'border-box',
        }}>

          {/* ── Back Link ──────────────────────────────────────── */}
          <Link
            href="/help-requests"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: 'var(--accent)', fontSize: '0.88rem', fontWeight: 700,
              textDecoration: 'none', marginBottom: '1.5rem',
            }}
          >
            <ArrowLeft size={16} /> Back to Help Marketplace
          </Link>

          {/* ── Hero Banner Container ────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3.5vw, 3rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
            marginBottom: '2.5rem',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.85rem',
              }}>
                <Sparkles size={13} /> 1 - O N - 1  A S S I S T A N C E  J O B
              </div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem,3.5vw,2.5rem)', color: '#ffffff', margin: '0 0 0.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Post a New Tutoring Request
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
                Detail your learning roadblock, desired deadline, and hourly rate. Certified educators across Ethiopia will review and submit custom proposals.
              </p>
            </div>
          </div>

          {/* ── Two-column Desktop Layout (Full Width Canvas) ── */}
          <div className="new-help-request-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) clamp(300px, 30vw, 400px)',
            gap: '2.5rem',
            alignItems: 'start',
          }}>

            {/* ── Form Controls (Left) ─────────────────────────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {error && (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '1rem 1.25rem', color: '#fca5a5', fontSize: '0.88rem' }}>
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              {successMsg && (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '1rem 1.25rem', color: '#34d399', fontSize: '0.88rem' }}>
                  <CheckCircle2 size={18} /> {successMsg}
                </div>
              )}

              {/* Title Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label style={labelStyle}>Problem Title / Topic *</label>
                <input
                  id="help-title"
                  type="text"
                  name="title"
                  style={inputStyle}
                  placeholder="e.g. Help with Python recursion assignment — Grade 12"
                  value={form.title}
                  onChange={set('title')}
                  maxLength={120}
                  required
                />
                <div style={{ textAlign: 'right', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {form.title.length}/120 characters
                </div>
              </div>

              {/* Subject Area Selector Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label style={labelStyle}>Subject Area *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {SUBJECTS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, subject_area: s.value }))}
                      style={{
                        padding: '0.65rem 1.15rem', borderRadius: 999, border: '1px solid',
                        fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                        background: form.subject_area === s.value ? 'var(--pine-deep)' : 'var(--bg-secondary)',
                        borderColor: form.subject_area === s.value ? 'var(--pine-deep)' : 'var(--card-border)',
                        color: form.subject_area === s.value ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                      }}
                    >
                      <span>{s.emoji}</span> <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label style={labelStyle}>Detailed Problem Description *</label>
                <textarea
                  id="help-description"
                  name="description"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 160, lineHeight: 1.6 }}
                  placeholder="Describe exactly what you need help with. Include your current knowledge level, what you have attempted, and specific milestones for the session…"
                  value={form.description}
                  onChange={set('description')}
                  rows={6}
                  required
                />
              </div>

              {/* Budget & Timing Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label style={{ ...labelStyle, marginBottom: '1.25rem' }}>Budget &amp; Schedule</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Max Rate (ETB/hr) *</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        id="help-budget"
                        type="number"
                        name="budget_max_per_hour"
                        style={{ ...inputStyle, paddingLeft: '2.4rem' }}
                        placeholder="300"
                        value={form.budget_max_per_hour}
                        onChange={set('budget_max_per_hour')}
                        min="50"
                        step="10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Est. Session Hours</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        id="help-hours"
                        type="number"
                        name="estimated_hours"
                        style={{ ...inputStyle, paddingLeft: '2.4rem' }}
                        placeholder="1"
                        value={form.estimated_hours}
                        onChange={set('estimated_hours')}
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Live budget estimate */}
                {estimatedTotal && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.25rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 14, padding: '0.85rem 1.25rem', fontSize: '0.88rem', color: 'var(--text-primary)',
                  }}>
                    <CheckCircle2 size={16} color="var(--accent)" />
                    <span>Estimated session commitment: <strong style={{ color: 'var(--accent)' }}>{estimatedTotal} ETB</strong></span>
                  </div>
                )}
              </div>

              {/* Deadline Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <label style={labelStyle}>Target Completion Deadline *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="help-deadline"
                    type="datetime-local"
                    name="deadline"
                    style={{ ...inputStyle, paddingLeft: '2.4rem' }}
                    value={form.deadline}
                    onChange={set('deadline')}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Bidders are prioritized based on meeting your schedule before this deadline.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                id="submit-help-request"
                disabled={submitting}
                style={{
                  width: '100%', height: 52, fontSize: '1rem', fontWeight: 800,
                  borderRadius: 999, border: 'none', background: 'var(--pine-deep)', color: '#ffffff',
                  opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 6px 20px rgba(12, 59, 46, 0.22)',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Publishing Request…</>
                  : <><Send size={18} /> Post Help Request Now</>}
              </button>
            </form>

            {/* ── Sidebar Rail (Right) ─────────────────────────── */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: 96 }}>

              {/* How it works card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} color="var(--accent)" /> How Axumia Tutoring Works
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { step: '1', title: 'Post Your Need', desc: 'Describe your assignment, deadline, and maximum budget.' },
                    { step: '2', title: 'Compare Proposals', desc: 'Certified tutors pitch their approach and hourly rates.' },
                    { step: '3', title: 'Escrow & Classroom', desc: 'Payment is securely held in escrow until session completion.' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: 'var(--pine-deep)',
                        color: '#fde047', fontSize: '0.75rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {s.step}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips for Best Proposals */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={16} color="var(--accent)" /> Tips for Fast Proposals
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {TIPS.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escrow Guarantee Pill */}
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                borderRadius: 20, padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
              }}>
                <ShieldCheck size={26} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>100% Escrow Protected:</strong> Funds are only released to the instructor after you confirm satisfactory delivery.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .new-help-request-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
