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
  BookOpen, Globe, GraduationCap,
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
            Explore by Category
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
      <section style={{ padding: '5rem 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0c3b2e', marginBottom: '0.5rem' }}>
              Simple Process
            </div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--text-primary)' }}>
              How Axumia Works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {howItWorks.map(({ icon, title, desc }, i) => (
              <div key={title} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(12,59,46,0.08)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                  color: '#0c3b2e',
                }}>
                  {icon}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0c3b2e', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>
                  STEP {i + 1}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
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
