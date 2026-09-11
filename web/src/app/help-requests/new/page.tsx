'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Lightbulb, Send, Loader2, CheckCircle2,
  ArrowLeft, DollarSign, Clock, Calendar, AlertCircle, Sparkles,
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
  'Be specific — "Grade 12 differential equations, struggling with chain rule" beats "math help".',
  'Add context: exams, assignments, or projects give instructors a clearer picture.',
  'Once you accept a bid, payment is held in escrow and released after session completion.',
  'You can communicate with bidders before accepting to clarify details.',
];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 700,
  color: '#94a3b8', marginBottom: '0.5rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.8rem 1.1rem',
  background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
  borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.92rem',
  outline: 'none', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

export default function NewHelpRequestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_area: 'cs',
    budget_max_per_hour: '',
    estimated_hours: '1',
    deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    if (!form.title.trim() || !form.description.trim() || !form.budget_max_per_hour || !form.deadline) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budget_max_per_hour: parseFloat(form.budget_max_per_hour),
          estimated_hours: parseFloat(form.estimated_hours),
          deadline: new Date(form.deadline).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create request');
      }
      const created = await res.json();
      router.push(`/help-requests/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ paddingTop: 80, flex: 1 }}>
        <div className="container" style={{ maxWidth: 960, paddingTop: '1.5rem', paddingBottom: '5rem' }}>

          {/* ── Back Link ──────────────────────────────────────── */}
          <Link href="/help-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: '1.75rem' }}>
            <ArrowLeft size={15} /> Back to Marketplace
          </Link>

          {/* ── Figma Hero Banner Container ────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(12, 59, 46, 0.2)',
            marginBottom: '2.5rem',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.85rem',
              }}>
                1 - O N - 1  A S S I S T A N C E
              </div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', color: '#ffffff', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                Describe Your Tutoring Need
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem' }}>
                Be specific — detailed requests attract the best instructor proposals and fast response times.
              </p>
            </div>
          </div>

          {/* ── Two-column layout ──────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '2rem', alignItems: 'start' }}>

            {/* ── FORM ─────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {error && (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.85rem 1rem', color: '#f87171', fontSize: '0.88rem' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Title */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <label style={labelStyle}>Request Title *</label>
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
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {form.title.length}/120
                </div>
              </div>

              {/* Subject area — chip selector */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <label style={labelStyle}>Subject Area *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {SUBJECTS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, subject_area: s.value }))}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: 999, border: '1px solid',
                        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        background: form.subject_area === s.value ? 'var(--pine-light)' : 'var(--bg-secondary)',
                        borderColor: form.subject_area === s.value ? 'var(--accent)' : 'var(--card-border)',
                        color: form.subject_area === s.value ? 'var(--pine-deep)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      }}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <label style={labelStyle}>Detailed Description *</label>
                <textarea
                  id="help-description"
                  name="description"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 140, lineHeight: 1.6 }}
                  placeholder="Describe exactly what you need help with. Include relevant context, what you've already tried, and your goal for the session…"
                  value={form.description}
                  onChange={set('description')}
                  rows={6}
                  required
                />
              </div>

              {/* Budget + Hours */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <label style={{ ...labelStyle, marginBottom: '1rem' }}>Budget & Timing</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Max Rate (ETB/hr) *</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        id="help-budget"
                        type="number"
                        name="budget_max_per_hour"
                        style={{ ...inputStyle, paddingLeft: '2.3rem' }}
                        placeholder="500"
                        value={form.budget_max_per_hour}
                        onChange={set('budget_max_per_hour')}
                        min="50"
                        step="10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Est. Hours</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        id="help-hours"
                        type="number"
                        name="estimated_hours"
                        style={{ ...inputStyle, paddingLeft: '2.3rem' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', background: 'var(--pine-light)', border: '1px solid rgba(12,59,46,0.15)', borderRadius: 12, padding: '0.65rem 1rem', fontSize: '0.84rem', color: 'var(--pine-deep)', fontWeight: 600 }}>
                    <CheckCircle2 size={15} color="var(--pine-deep)" />
                    Estimated session total: <strong>{estimatedTotal} ETB</strong>
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <label style={labelStyle}>Deadline *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="help-deadline"
                    type="datetime-local"
                    name="deadline"
                    style={{ ...inputStyle, paddingLeft: '2.3rem' }}
                    value={form.deadline}
                    onChange={set('deadline')}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  When do you need this completed by? Instructors can see your urgency.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-help-request"
                disabled={submitting}
                style={{
                  width: '100%', height: 48, fontSize: '0.95rem', fontWeight: 700,
                  borderRadius: 999, border: 'none', background: 'var(--pine-deep)', color: '#ffffff',
                  opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 6px 20px rgba(12, 59, 46, 0.22)',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Posting Request…</>
                  : <><Send size={18} /> Post Help Request</>}
              </button>
            </form>

            {/* ── TIPS SIDEBAR ─────────────────────────────────── */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: 90 }}>

              {/* How it works */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.4rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={15} color="var(--accent)" /> How It Works
                </h3>
                {[
                  ['1', 'Post your request with details & budget', 'var(--pine-deep)'],
                  ['2', 'Verified instructors submit proposals', '#10b981'],
                  ['3', 'Review bids and accept the best one', '#f59e0b'],
                  ['4', 'Pay securely; released after session', '#059669'],
                ].map(([num, text, color]) => (
                  <div key={num} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--pine-light)', border: '1px solid var(--accent)', color: 'var(--pine-deep)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {num}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{text}</p>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div style={{ background: 'var(--pine-light)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '1.4rem' }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--pine-deep)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={15} /> Pro Tips
                </h3>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {TIPS.map((tip, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--pine-deep)', fontWeight: 800, fontSize: '0.75rem', marginTop: 1, flexShrink: 0 }}>→</span>
                      <p style={{ fontSize: '0.78rem', color: '#3d5c52', lineHeight: 1.55, margin: 0 }}>{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Already have requests? */}
              <Link href="/help-requests/mine" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 16, padding: '1rem 1.1rem', textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Requests</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View your submitted requests</div>
                </div>
                <FileText size={16} color="var(--text-muted)" />
              </Link>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
