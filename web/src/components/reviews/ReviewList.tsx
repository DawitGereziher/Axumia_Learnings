'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Review {
  id: string;
  overall_rating: number;
  content_quality: number;
  instructor_quality: number;
  course_structure: number;
  value_for_money: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  completion_percentage?: number;
  is_verified: boolean;
  is_featured: boolean;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    image?: string;
  };
  instructorResponse?: any;
}

interface ReviewListProps {
  courseId: string;
  showWriteReview?: boolean;
  onWriteReview?: () => void;
  userHasReviewed?: boolean;
}

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function ReviewList({ courseId, showWriteReview, onWriteReview, userHasReviewed }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    is_verified: false,
    is_featured: false,
    min_rating: 0,
    sort_by: 'recent' as 'recent' | 'helpful' | 'rating_high' | 'rating_low',
  });
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.is_verified) params.append('is_verified', 'true');
      if (filters.is_featured) params.append('is_featured', 'true');
      if (filters.min_rating > 0) params.append('min_rating', filters.min_rating.toString());
      params.append('sort_by', filters.sort_by);
      params.append('limit', '20');

      
      const res = await authFetch(`/api/reviews/course/${courseId}?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch reviews');
      setReviews(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [courseId, filters]);

  const StarDisplay = ({ rating, size = '1rem' }: { rating: number; size?: string }) => (
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

  const ReviewCard = ({ review }: { review: Review }) => {
    const isExpanded = expandedReview === review.id;
    const avatarUrl = getFullUrl(review.user.image);

    return (
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1rem',
          background: '#09090b',
          borderRadius: 12,
          border: review.is_featured ? '1px solid #fbbf24' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: avatarUrl 
                  ? `url(${avatarUrl}) center/cover` 
                  : '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#9ca3af',
              }}
            >
              {avatarUrl ? '' : review.user.first_name?.[0] || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                {review.user.first_name} {review.user.last_name}
                {review.is_verified && (
                  <span style={{
                    marginLeft: '0.5rem',
                    background: 'rgba(16,185,129,0.2)',
                    color: '#34d399',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                  }}>
                    ✓ Verified
                  </span>
                )}
                {review.is_featured && (
                  <span style={{
                    marginLeft: '0.5rem',
                    background: 'rgba(251,191,36,0.2)',
                    color: '#fbbf24',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                  }}>
                    ★ Featured
                  </span>
                )}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {new Date(review.created_at).toLocaleDateString()}
                {review.completion_percentage !== undefined && (
                  <span style={{ marginLeft: '0.5rem' }}>
                    • {review.completion_percentage}% completed
                  </span>
                )}
              </div>
            </div>
          </div>
          <StarDisplay rating={review.overall_rating} />
        </div>

        {review.title && (
          <h4 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
            {review.title}
          </h4>
        )}

        <div style={{ color: '#9ca3af', lineHeight: 1.6, marginBottom: '1rem' }}>
          {isExpanded || (review.comment && review.comment.length < 200)
            ? review.comment
            : review.comment?.slice(0, 200) + '...'}
          {review.comment && review.comment.length >= 200 && (
            <button
              onClick={() => setExpandedReview(isExpanded ? null : review.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Detailed ratings */}
        {(review.content_quality > 0 || review.instructor_quality > 0 || 
          review.course_structure > 0 || review.value_for_money > 0) && (
          <div style={{
            background: '#18181b',
            padding: '0.75rem',
            borderRadius: 8,
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {review.content_quality > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Content Quality:</span>
                  <StarDisplay rating={review.content_quality} size="0.8rem" />
                </div>
              )}
              {review.instructor_quality > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Instructor Quality:</span>
                  <StarDisplay rating={review.instructor_quality} size="0.8rem" />
                </div>
              )}
              {review.course_structure > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Course Structure:</span>
                  <StarDisplay rating={review.course_structure} size="0.8rem" />
                </div>
              )}
              {review.value_for_money > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Value for Money:</span>
                  <StarDisplay rating={review.value_for_money} size="0.8rem" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pros and Cons */}
        {(review.pros?.length || review.cons?.length) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            {review.pros?.length && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#34d399', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  ✓ Pros
                </div>
                <ul style={{ margin: 0, paddingLeft: '1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                  {review.pros.map((pro, i) => (
                    <li key={i}>{pro}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.cons?.length && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#f87171', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  ✗ Cons
                </div>
                <ul style={{ margin: 0, paddingLeft: '1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                  {review.cons.map((con, i) => (
                    <li key={i}>{con}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructor Response */}
        {review.instructorResponse && (
          <div style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8,
            padding: '1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Instructor Response
            </div>
            <div style={{ color: '#c7d2fe', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {review.instructorResponse.response}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
          <button
            onClick={() => {
              // TODO: Implement helpful voting
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            👍 {review.helpful_count} helpful
          </button>
          <span>•</span>
          <span>{review.reply_count} replies</span>
          <span>•</span>
          <button
            onClick={() => {
              // TODO: Implement report
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Report
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
          Reviews ({reviews.length})
        </h3>
        {showWriteReview && !userHasReviewed && (
          <button
            onClick={onWriteReview}
            className="btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#09090b', borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={filters.is_verified}
              onChange={(e) => setFilters({ ...filters, is_verified: e.target.checked })}
              style={{ marginRight: '0.5rem' }}
            />
            Verified only
          </label>
          <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={filters.is_featured}
              onChange={(e) => setFilters({ ...filters, is_featured: e.target.checked })}
              style={{ marginRight: '0.5rem' }}
            />
            Featured only
          </label>
          <select
            value={filters.min_rating}
            onChange={(e) => setFilters({ ...filters, min_rating: parseInt(e.target.value) })}
            style={{
              padding: '0.5rem',
              borderRadius: 6,
              background: '#18181b',
              color: '#fff',
              border: '1px solid #374151',
              fontSize: '0.9rem',
            }}
          >
            <option value="0">All Ratings</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="1">1+ Stars</option>
          </select>
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters({ ...filters, sort_by: e.target.value as any })}
            style={{
              padding: '0.5rem',
              borderRadius: 6,
              background: '#18181b',
              color: '#fff',
              border: '1px solid #374151',
              fontSize: '0.9rem',
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating_high">Highest Rated</option>
            <option value="rating_low">Lowest Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Loading reviews...
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '1rem',
          color: '#fca5a5',
          textAlign: 'center',
        }}>
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass" style={{ padding: '2rem', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
          No reviews yet. Be the first to review this course!
        </div>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}