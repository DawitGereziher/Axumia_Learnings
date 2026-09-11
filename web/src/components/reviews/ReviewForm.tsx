'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ReviewFormProps {
  courseId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ courseId, onSuccess, onCancel }: ReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState({
    content_quality: 0,
    instructor_quality: 0,
    course_structure: 0,
    value_for_money: 0,
  });
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [newPro, setNewPro] = useState('');
  const [cons, setCons] = useState<string[]>([]);
  const [newCon, setNewCon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const addPro = () => {
    if (newPro.trim()) {
      setPros([...pros, newPro.trim()]);
      setNewPro('');
    }
  };

  const removePro = (index: number) => {
    setPros(pros.filter((_, i) => i !== index));
  };

  const addCon = () => {
    if (newCon.trim()) {
      setCons([...cons, newCon.trim()]);
      setNewCon('');
    }
  };

  const removeCon = (index: number) => {
    setCons(cons.filter((_, i) => i !== index));
  };

  const StarRating = ({ rating, onRate, label }: { rating: number; onRate: (r: number) => void; label: string }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#e2e8f0' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: star <= rating ? '#fbbf24' : '#374151',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setWarnings([]);

    if (overallRating === 0) {
      setError('Please provide an overall rating');
      setSubmitting(false);
      return;
    }

    try {
      const reviewData = {
        overall_rating: overallRating,
        content_quality: criteriaRatings.content_quality || undefined,
        instructor_quality: criteriaRatings.instructor_quality || undefined,
        course_structure: criteriaRatings.course_structure || undefined,
        value_for_money: criteriaRatings.value_for_money || undefined,
        title: title || undefined,
        comment: comment || undefined,
        pros: pros.length > 0 ? pros : undefined,
        cons: cons.length > 0 ? cons : undefined,
      };

      
      const res = await authFetch(`/api/reviews/course/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setError(data.errors.join(', '));
        } else {
          setError(data.message || 'Failed to submit review');
        }
        setSubmitting(false);
        return;
      }

      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      if (data.success) {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem', background: '#09090b', borderRadius: 16 }}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
        Write a Review
      </h3>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          color: '#fca5a5',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          color: '#fcd34d',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          <strong>Note:</strong> {warnings.join(', ')}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <StarRating
          rating={overallRating}
          onRate={setOverallRating}
          label="Overall Rating *"
        />

        <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#e2e8f0' }}>
            Detailed Ratings (Optional)
          </label>
          
          <StarRating
            rating={criteriaRatings.content_quality}
            onRate={(r) => setCriteriaRatings({ ...criteriaRatings, content_quality: r })}
            label="Content Quality"
          />
          
          <StarRating
            rating={criteriaRatings.instructor_quality}
            onRate={(r) => setCriteriaRatings({ ...criteriaRatings, instructor_quality: r })}
            label="Instructor Quality"
          />
          
          <StarRating
            rating={criteriaRatings.course_structure}
            onRate={(r) => setCriteriaRatings({ ...criteriaRatings, course_structure: r })}
            label="Course Structure"
          />
          
          <StarRating
            rating={criteriaRatings.value_for_money}
            onRate={(r) => setCriteriaRatings({ ...criteriaRatings, value_for_money: r })}
            label="Value for Money"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#e2e8f0' }}>
            Review Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid #374151',
              background: '#18181b',
              color: '#fff',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#e2e8f0' }}>
            Your Review (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this course..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid #374151',
              background: '#18181b',
              color: '#fff',
              fontSize: '0.95rem',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#e2e8f0' }}>
            What you liked (Pros)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={newPro}
              onChange={(e) => setNewPro(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
              placeholder="Add a pro..."
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#18181b',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
            <button
              type="button"
              onClick={addPro}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 6,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Add
            </button>
          </div>
          {pros.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {pros.map((pro, index) => (
                <span
                  key={index}
                  style={{
                    background: 'rgba(16,163,74,0.2)',
                    color: '#4ade80',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 16,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  ✓ {pro}
                  <button
                    type="button"
                    onClick={() => removePro(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4ade80',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#e2e8f0' }}>
            What could be improved (Cons)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={newCon}
              onChange={(e) => setNewCon(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
              placeholder="Add a con..."
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#18181b',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
            <button
              type="button"
              onClick={addCon}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 6,
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Add
            </button>
          </div>
          {cons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {cons.map((con, index) => (
                <span
                  key={index}
                  style={{
                    background: 'rgba(220,38,38,0.2)',
                    color: '#f87171',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 16,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  ✗ {con}
                  <button
                    type="button"
                    onClick={() => removeCon(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.85rem 1.5rem',
                borderRadius: 8,
                background: '#374151',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}