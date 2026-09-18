import Link from 'next/link';
import { Star, Users } from 'lucide-react';

// ── Types matching the API response ──────────────────────────────────────────

interface ApiCourse {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: string | number;
  level?: string;
  thumbnail_url?: string;
  total_lessons: number;
  avgRating?: number;
  _count?: { purchases: number; reviews: number };
  instructor?: {
    user?: { first_name?: string; last_name?: string };
  };
}

interface FeaturedCoursesSectionProps {
  courses: ApiCourse[];
}

// ── Server component — receives pre-fetched courses as props ─────────────────

export function FeaturedCoursesSection({ courses }: FeaturedCoursesSectionProps) {
  if (!courses.length) return null;

  return (
    <section style={{ padding: '4rem 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0c3b2e', marginBottom: '0.5rem' }}>
              Live on Platform
            </div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '-0.02em', color: '#0f172a' }}>
              Featured Courses
            </h2>
          </div>
          <Link href="/courses" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0c3b2e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {courses.map((course) => {
            const instructorName = course.instructor?.user
              ? `${course.instructor.user.first_name ?? ''} ${course.instructor.user.last_name ?? ''}`.trim()
              : 'Axumia Instructor';
            const rating = course.avgRating ?? 0;
            const enrolledCount = course._count?.purchases ?? 0;
            const price = Number(course.price);

            return (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div className="course-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Thumbnail */}
                  <div style={{
                    height: 180, borderRadius: '12px 12px 0 0', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #0c3b2e 0%, #1a5c45 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {course.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}>📚</span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {course.level && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0c3b2e', marginBottom: '0.5rem' }}>
                        {course.level}
                      </span>
                    )}
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, color: '#0f172a', marginBottom: '0.5rem', flex: 1 }}>
                      {course.title}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      {instructorName}
                    </p>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                      {rating > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>
                          <Star size={12} fill="#f59e0b" /> {rating.toFixed(1)}
                        </span>
                      )}
                      {enrolledCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', color: '#64748b' }}>
                          <Users size={12} /> {enrolledCount.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0c3b2e' }}>
                      {price === 0 ? 'Free' : `${price.toLocaleString()} ETB`}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Skeleton shown while courses are loading (for Suspense) ──────────────────

export function FeaturedCoursesSkeleton() {
  return (
    <section style={{ padding: '4rem 0' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="course-card" style={{ height: 340 }}>
              <div style={{ height: 180, background: '#e2e8f0', borderRadius: '12px 12px 0 0', animation: 'pulse 1.5s ease infinite' }} />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ height: 14, background: '#e2e8f0', borderRadius: 4, marginBottom: 10, width: '60%' }} />
                <div style={{ height: 14, background: '#e2e8f0', borderRadius: 4, marginBottom: 8, width: '90%' }} />
                <div style={{ height: 14, background: '#e2e8f0', borderRadius: 4, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
