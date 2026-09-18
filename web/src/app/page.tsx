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
  { id: 'tech', label: 'Development & Tech', icon: <Code size={22} />, href: '/courses?category=tech' },
  { id: 'lang', label: 'Ethiopian Languages', icon: <Globe size={22} />, href: '/courses?category=lang' },
  { id: 'exams', label: 'Academics & Exam Prep', icon: <GraduationCap size={22} />, href: '/courses?category=exams' },
  { id: 'business', label: 'Business & Finance', icon: <TrendingUp size={22} />, href: '/courses?category=business' },
  { id: 'design', label: 'UX/UI & Design', icon: <Camera size={22} />, href: '/courses?category=design' },
  { id: 'music', label: 'Arts & Music', icon: <Music size={22} />, href: '/courses?category=music' },
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
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--text-primary)', marginBottom: '2rem' }}>
            Explore by Category
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {categories.map(({ id, label, icon, href }) => (
              <Link key={id} href={href} style={{ textDecoration: 'none' }}>
                <div className="card card-hover" style={{
                  padding: '1.5rem 1rem', textAlign: 'center',
                  border: '1px solid var(--card-border)', borderRadius: 16,
                  background: 'var(--card-bg)', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ color: '#0c3b2e' }}>{icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{label}</span>
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
