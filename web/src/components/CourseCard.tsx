'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Star, BookOpen, Clock, User } from 'lucide-react';
import { authFetch, getAccessToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    price: string | number;
    currency?: string;
    thumbnail?: string;
    level?: string;
    language?: string;
    avgRating?: number;
    totalStudents?: number;
    instructor?: {
      user?: { first_name?: string; last_name?: string };
    };
    category?: { name?: string };
    _count?: { reviews?: number; purchases?: number };
    [key: string]: any;
  };
  initialWishlisted?: boolean;
}

export default function CourseCard({ course, initialWishlisted = false }: CourseCardProps) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [toggling, setToggling] = useState(false);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = getAccessToken();
    if (!token) return;

    setToggling(true);
    try {
      const res = await authFetch(`/api/courses/${course.id}/wishlist`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setWishlisted(data.wishlisted);
      }
    } catch {}
    finally {
      setToggling(false);
    }
  };

  const instructorName = `${course.instructor?.user?.first_name || ''} ${course.instructor?.user?.last_name || ''}`.trim() || 'Instructor';
  const formattedPrice = Number(course.price) === 0 ? 'Free' : `${Number(course.price).toLocaleString()} ${course.currency || 'ETB'}`;

  return (
    <Link href={`/courses/${course.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="course-card-lms">
        {/* Thumbnail & Badges */}
        <div className="course-thumb-wrap" style={{ aspectRatio: '16/9', height: 'auto' }}>
          {course.thumbnail ? (
            <img
              className="course-thumb-img"
              src={course.thumbnail}
              alt={course.title}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
            }}>
              <BookOpen size={40} opacity={0.3} />
            </div>
          )}

          {/* Category Pill */}
          {course.category?.name && (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(12, 59, 46, 0.92)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 999,
              padding: '0.2rem 0.65rem', fontSize: '0.7rem', color: '#ffffff', fontWeight: 600,
              zIndex: 2,
            }}>
              {course.category.name}
            </span>
          )}

          {/* Wishlist Heart Button */}
          <button
            onClick={handleToggleWishlist}
            disabled={toggling}
            title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 32, height: 32, borderRadius: '50%',
              background: wishlisted ? 'rgba(239, 68, 68, 0.9)' : 'rgba(9, 10, 15, 0.75)',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease', color: wishlisted ? '#ffffff' : '#f87171',
              zIndex: 2,
            }}
          >
            <Heart size={15} fill={wishlisted ? '#ffffff' : 'transparent'} />
          </button>
        </div>

        {/* Content Details */}
        <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h3 className="course-card-title" style={{
              fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem',
              lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              lineHeight: 1.35,
            }}>
              {course.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
              <User size={13} color="var(--accent)" /> {instructorName}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.65rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700 }}>
              {course.avgRating && Number(course.avgRating) > 0 ? (
                <>
                  <Star size={14} fill="#f59e0b" /> {Number(course.avgRating).toFixed(1)}
                  {course._count?.reviews !== undefined && course._count.reviews > 0 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>
                      ({course._count.reviews})
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>New</span>
              )}
            </div>

            <div className="course-card-price" style={{
              fontSize: '0.85rem', fontWeight: 800,
              color: Number(course.price) === 0 ? 'var(--pine-deep)' : '#ffffff',
              background: Number(course.price) === 0 ? 'var(--pine-light)' : 'var(--pine-deep)',
              padding: '3px 10px', borderRadius: 999,
            }}>
              {formattedPrice}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
