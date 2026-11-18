/**
 * Home page — Server Component
 *
 * Static sections render at build time (no JS shipped).
 * Dynamic sections (HeroSection, NewsletterSection) are client components.
 * FeaturedCoursesSection fetches real courses from the API with ISR (5 min TTL).
 */
import React, { Suspense } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import {
  Video, UserCheck, HelpCircle, Wallet,
  Code, TrendingUp, Briefcase, Camera, Music,
  BookOpen, Globe, GraduationCap, Sparkles,
} from 'lucide-react';

import { HeroSection } from './_components/home/HeroSection';
import { FeaturedCoursesSection, FeaturedCoursesSkeleton } from './_components/home/FeaturedCoursesSection';
import { NewsletterSection } from './_components/home/NewsletterSection';

// ── SEO metadata ──────────────────────────────────────────────────────────────
export const metadata = {
  title: 'Axumia Learnings — Ethiopian Online Learning Platform',
  description:
    'Learn from verified Ethiopian experts. Courses in Amharic, tech, business, exam prep and more. Pay with Telebirr or CBE Birr.',
};

// ── Data fetch (server-side, cached 5 min via ISR) ────────────────────────────
async function getFeaturedCourses() {
  try {
    // In Docker: backend service is at http://backend:3000
    // In local dev: falls back to NEXT_PUBLIC_API_URL
    const baseUrl =
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/courses?limit=6&sort=popular`, {
      next: { revalidate: 300 }, // ISR: re-fetch every 5 minutes
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return []; // graceful fallback if API is unreachable during build
  }
}

// ── Static section data ───────────────────────────────────────────────────────

const categories = [
  { id: 'tech', label: 'Development & Tech', image: '/assets/dev.jfif', icon: <Code size={20} />, href: '/courses?category=tech' },
  { id: 'lang', label: 'Ethiopian Languages', image: '/assets/language.jfif', icon: <Globe size={20} />, href: '/courses?category=lang' },
  { id: 'exams', label: 'Academics & Exam Prep', image: '/assets/exam.jpg', icon: <GraduationCap size={20} />, href: '/courses?category=exams' },
  { id: 'business', label: 'Business & Finance', image: '/assets/finance.jpg', icon: <TrendingUp size={20} />, href: '/courses?category=business' },
  { id: 'design', label: 'UX/UI & Design', image: '/assets/ui.jpg', icon: <Camera size={20} />, href: '/courses?category=design' },
  { id: 'music', label: 'Arts & Music', image: '/assets/music.jfif', icon: <Music size={20} />, href: '/courses?category=music' },
];

const howItWorks = [
  { icon: <BookOpen size={28} />, title: 'Browse Courses', desc: 'Explore hundreds of courses across tech, languages, business, and more.' },
  { icon: <Wallet size={28} />, title: 'Pay Easily', desc: 'Pay securely using Telebirr, CBE Birr, or other local methods.' },
  { icon: <Video size={28} />, title: 'Learn Anytime', desc: 'Watch high-quality video lessons at your own pace, on any device.' },
  { icon: <UserCheck size={28} />, title: 'Get Certified', desc: 'Complete courses and earn verified certificates recognized by employers.' },
];

const stats = [
  { label: 'Courses', value: '5,000+' },
  { label: 'Instructors', value: '300+' },
  { label: 'Students', value: '50,000+' },
  { label: 'Certificates Issued', value: '12,000+' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const featuredCourses = await getFeaturedCourses();

  return (
    <PageTemplate fullWidth={true}>

      {/* 1. Hero — client component (search input) */}
      <HeroSection />

      {/* 2. Stats bar */}
      <section style={{ padding: '2.5rem 0', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
            {stats.map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#0c3b2e' }}>{value}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Category browse */}
      <section style={{ padding: '4rem 0', width: '100%' }}>
        <div style={{ padding: '0 clamp(1.5rem, 3.5vw, 4rem)', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--text-primary)', marginBottom: '2rem' }}>
            Explore by{' '}
            <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
              Category.
              <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1.25rem',
            width: '100%',
          }}>
            {categories.map(({ id, label, image, icon, href }) => (
              <Link key={id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card card-hover" style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid var(--card-border)',
                  borderRadius: 16,
                  background: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}>
                  {/* Category Image */}
                  <div style={{
                    width: '100%',
                    height: 125,
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'rgba(12, 59, 46, 0.08)',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.92)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0c3b2e',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                    }}>
                      {icon}
                    </div>
                  </div>

                  {/* Category Title */}
                  <div style={{ padding: '0.85rem 0.75rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {label}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured courses — real API data with Suspense skeleton */}
      <Suspense fallback={<FeaturedCoursesSkeleton />}>
        <FeaturedCoursesSection courses={featuredCourses} />
      </Suspense>

      {/* 5. How it works */}
      <section style={{ padding: '5.5rem 0', background: 'var(--bg-surface)' }}>
        <div style={{ width: '100%', padding: '0 clamp(1.5rem, 3.5vw, 4rem)', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(253, 224, 71, 0.12)', border: '1px solid rgba(253, 224, 71, 0.25)',
              borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.75rem',
              fontWeight: 800, color: '#fde047', letterSpacing: '0.15em', textTransform: 'uppercase',
              marginBottom: '1rem',
            }}>
              <Sparkles size={14} /> SIMPLE 4-STEP LEARNING JOURNEY
            </div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', color: 'var(--text-primary)',
              lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 auto 0.75rem',
            }}>
              How Axumia{' '}
              <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                Works.
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
              From skill discovery to accredited certification — tailored for ambitious Ethiopian students and professionals.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
            {howItWorks.map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className="card"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 22,
                  padding: '2rem 1.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Subtle top-right step watermark */}
                <div style={{
                  position: 'absolute', top: 12, right: 18,
                  fontSize: '3.2rem', fontWeight: 900,
                  fontFamily: 'Outfit, sans-serif',
                  color: 'rgba(255, 255, 255, 0.04)',
                  lineHeight: 1, pointerEvents: 'none',
                  userSelect: 'none',
                }}>
                  0{i + 1}
                </div>

                {/* Top row: Icon container + Step pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 16,
                    background: 'linear-gradient(135deg, #0c3b2e 0%, #15805a 100%)',
                    border: '1px solid rgba(253, 224, 71, 0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fde047',
                    boxShadow: '0 6px 16px rgba(12, 59, 46, 0.35)',
                  }}>
                    {icon}
                  </div>

                  <span style={{
                    background: 'rgba(253, 224, 71, 0.12)',
                    color: '#fde047',
                    border: '1px solid rgba(253, 224, 71, 0.25)',
                    borderRadius: 999,
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    Step {i + 1}
                  </span>
                </div>

                {/* Step title */}
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.65rem',
                  lineHeight: 1.3,
                }}>
                  {title}
                </h3>

                {/* Step description */}
                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {desc}
                </p>

                {/* Bottom progress indicator bar */}
                <div style={{
                  width: '100%', height: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 999,
                  marginTop: '1.75rem',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(i + 1) * 25}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0c3b2e, #fde047)',
                    borderRadius: 999,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Newsletter — client component */}
      <NewsletterSection />

    </PageTemplate>
  );
}
