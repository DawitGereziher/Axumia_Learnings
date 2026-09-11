'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface InstructorResponseFormProps {
  courseId: string;
  reviewId: string;
  existingResponse?: {
    id: string;
    response: string;
    is_public: boolean;
  };
  onResponseSubmitted?: () => void;
  onCancel?: () => void;
}

export default function InstructorResponseForm({
  courseId,
  reviewId,
  existingResponse,
  onResponseSubmitted,
  onCancel,
}: InstructorResponseFormProps) {
  const [response, setResponse] = useState(existingResponse?.response || '');
  const [isPublic, setIsPublic] = useState(existingResponse?.is_public ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      setError('Please enter a response');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await authFetch(`/api/reviews/${reviewId}/instructor-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          response: response.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit response');
      }

      if (onResponseSubmitted) onResponseSubmitted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!existingResponse) return;

    try {
      const res = await authFetch(`/api/reviews/instructor-responses/${existingResponse.id}/toggle-visibility`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to toggle visibility');
      }

      setIsPublic(!isPublic);
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
    }
  };

  const handleDelete = async () => {
    if (!existingResponse) return;
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const res = await authFetch(`/api/reviews/instructor-responses/${existingResponse.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete response');
      }

      if (onResponseSubmitted) onResponseSubmitted();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="card" style={{
      padding: '1.5rem',
      background: 'rgba(99,102,241,0.1)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 12,
      marginTop: '1rem',
    }}>
      <h4 style={{ fontWeight: 600, color: '#818cf8', marginBottom: '1rem', fontSize: '1rem' }}>
        {existingResponse ? 'Edit Your Response' : 'Respond as Instructor'}
      </h4>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '0.75rem',
          color: '#fca5a5',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Thank the student for their feedback and address any specific points they mentioned..."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 8,
            border: '1px solid #6366f1',
            background: '#09090b',
            color: '#fff',
            fontSize: '0.95rem',
            resize: 'vertical',
            marginBottom: '1rem',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ accentColor: '#6366f1' }}
          />
          <label htmlFor="isPublic" style={{ color: '#c7d2fe', fontSize: '0.9rem', cursor: 'pointer' }}>
            Make response visible to all students
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={submitting || !response.trim()}
            className="btn-primary"
            style={{
              padding: '0.6rem 1.2rem',
              fontSize: '0.9rem',
              opacity: submitting || !response.trim() ? 0.7 : 1,
              cursor: submitting || !response.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting...' : existingResponse ? 'Update Response' : 'Submit Response'}
          </button>

          {existingResponse && (
            <>
              <button
                type="button"
                onClick={handleToggleVisibility}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: 8,
                  background: isPublic ? '#374151' : '#16a34a',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {isPublic ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: 8,
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Delete
              </button>
            </>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 8,
                background: '#374151',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
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