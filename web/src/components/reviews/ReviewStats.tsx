'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  criteriaAverages: {
    content_quality: number;
    instructor_quality: number;
    course_structure: number;
    value_for_money: number;
  };
}

interface ReviewStatsProps {
  courseId: string;
}

export default function ReviewStats({ courseId }: ReviewStatsProps) {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authFetch(`/api/reviews/course/${courseId}/stats`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch stats');
        setStats(data);
      } catch (err) {
        console.error('Error fetching review stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [courseId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '1.5rem', background: '#09090b', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>Loading ratings...</div>
      </div>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', background: '#09090b', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>No ratings yet</div>
      </div>
    );
  }

  const StarDisplay = ({ rating, size = '1.5rem' }: { rating: number; size?: string }) => (
    <div style={{ display: 'flex', gap: '0.1rem' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            color: star <= rating ? '#fbbf24' : '#374151',
            fontSize: size,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );

  const maxCount = Math.max(...Object.values(stats.ratingDistribution));

  return (
    <div className="card" style={{ padding: '1.5rem', background: '#09090b', borderRadius: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Overall Rating */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.5rem' }}>
            {stats.averageRating.toFixed(1)}
          </div>
          <StarDisplay rating={Math.round(stats.averageRating)} />
          <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Rating Distribution */}
        <div>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[star] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem', width: '1rem' }}>{star}</span>
                <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>★</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: '#374151',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: '#fbbf24',
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ color: '#64748b', fontSize: '0.85rem', width: '2rem', textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Criteria Averages */}
      {(stats.criteriaAverages.content_quality > 0 || 
        stats.criteriaAverages.instructor_quality > 0 || 
        stats.criteriaAverages.course_structure > 0 || 
        stats.criteriaAverages.value_for_money > 0) && (
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #374151',
        }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem', fontSize: '0.95rem' }}>
            Rating Breakdown
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {stats.criteriaAverages.content_quality > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Content Quality</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    {stats.criteriaAverages.content_quality.toFixed(1)}
                  </span>
                  <StarDisplay rating={Math.round(stats.criteriaAverages.content_quality)} size="0.8rem" />
                </div>
              </div>
            )}
            {stats.criteriaAverages.instructor_quality > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Instructor Quality</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    {stats.criteriaAverages.instructor_quality.toFixed(1)}
                  </span>
                  <StarDisplay rating={Math.round(stats.criteriaAverages.instructor_quality)} size="0.8rem" />
                </div>
              </div>
            )}
            {stats.criteriaAverages.course_structure > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Course Structure</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    {stats.criteriaAverages.course_structure.toFixed(1)}
                  </span>
                  <StarDisplay rating={Math.round(stats.criteriaAverages.course_structure)} size="0.8rem" />
                </div>
              </div>
            )}
            {stats.criteriaAverages.value_for_money > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Value for Money</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    {stats.criteriaAverages.value_for_money.toFixed(1)}
                  </span>
                  <StarDisplay rating={Math.round(stats.criteriaAverages.value_for_money)} size="0.8rem" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}