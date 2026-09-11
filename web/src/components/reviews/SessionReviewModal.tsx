'use client';

import React, { useState } from 'react';
import { Star, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { authFetch } from '@/lib/auth';

interface SessionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  helpSessionId?: string;
  instructorName: string;
  onSuccess?: () => void;
}

export default function SessionReviewModal({
  isOpen,
  onClose,
  bookingId,
  helpSessionId,
  instructorName,
  onSuccess,
}: SessionReviewModalProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [hoverOverall, setHoverOverall] = useState(0);

  const [teachingStyleRating, setTeachingStyleRating] = useState(5);
  const [hoverStyle, setHoverStyle] = useState(0);

  const [communicationRating, setCommunicationRating] = useState(5);
  const [hoverComm, setHoverComm] = useState(0);

  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const endpoint = bookingId
        ? `/api/reviews/sessions/booking/${bookingId}`
        : `/api/reviews/sessions/help/${helpSessionId}`;

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_rating: overallRating,
          teaching_style_rating: teachingStyleRating,
          communication_rating: communicationRating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--card-bg, #0f172a)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
        borderRadius: 24, padding: '2rem',
        maxWidth: 520, width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer', padding: 4,
          }}
        >
          <X size={20} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: '0.5rem' }}>
              Thank You for Your Feedback!
            </h3>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
              Your review of {instructorName}&apos;s learning &amp; teaching style has been submitted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Sparkles size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0 }}>
                Review Teacher&apos;s Learning Style
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              How was your live session with <strong style={{ color: 'var(--text-primary, #fff)' }}>{instructorName}</strong>? Rate their teaching method and communication.
            </p>

            {/* Criteria 1: Overall Rating */}
            <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border, rgba(255,255,255,0.06))', borderRadius: 14, padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                  Overall Session Quality
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b' }}>
                  {hoverOverall || overallRating} / 5
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    onMouseEnter={() => setHoverOverall(star)}
                    onMouseLeave={() => setHoverOverall(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <Star
                      size={24}
                      fill={(hoverOverall || overallRating) >= star ? '#f59e0b' : 'none'}
                      color="#f59e0b"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Criteria 2: Teaching & Learning Style */}
            <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border, rgba(255,255,255,0.06))', borderRadius: 14, padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                    Teaching &amp; Learning Style
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Patience, clarity of explanation, interactive approach
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1' }}>
                  {hoverStyle || teachingStyleRating} / 5
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: '0.3rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setTeachingStyleRating(star)}
                    onMouseEnter={() => setHoverStyle(star)}
                    onMouseLeave={() => setHoverStyle(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <Star
                      size={22}
                      fill={(hoverStyle || teachingStyleRating) >= star ? '#6366f1' : 'none'}
                      color="#6366f1"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Criteria 3: Communication & Clarity */}
            <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border, rgba(255,255,255,0.06))', borderRadius: 14, padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                    Communication &amp; Responsiveness
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Active listening, answering questions, punctuality
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                  {hoverComm || communicationRating} / 5
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: '0.3rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCommunicationRating(star)}
                    onMouseEnter={() => setHoverComm(star)}
                    onMouseLeave={() => setHoverComm(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <Star
                      size={22}
                      fill={(hoverComm || communicationRating) >= star ? '#10b981' : 'none'}
                      color="#10b981"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Comment */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #fff)', marginBottom: '0.5rem' }}>
                Feedback on Teacher&apos;s Style (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like about how the teacher explained topics? Any tips on their pace or style?"
                rows={3}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 12,
                  background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                  border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                  color: 'var(--text-primary, #fff)', fontSize: '0.88rem', resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--card-border, rgba(255,255,255,0.15))',
                  color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.65rem 1.5rem', borderRadius: 999,
                  background: 'var(--pine-deep, #0c3b2e)', border: 'none',
                  color: '#ffffff', fontWeight: 700, fontSize: '0.85rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(12, 59, 46, 0.35)',
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? 'Submitting...' : 'Submit Session Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
