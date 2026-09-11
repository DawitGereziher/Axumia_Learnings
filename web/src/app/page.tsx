'use client';

import React, { useState } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

import {
  Search,
  Video,
  UserCheck,
  HelpCircle,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Globe,
  GraduationCap,
  Star,
  ArrowRight,
  BookOpen,
  Users,
  Code,
  TrendingUp,
  Briefcase,
  Camera,
  Music,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
  Play,
  Mail,
} from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const categories = [
    { id: 'All', label: 'All Courses' },
    { id: 'tech', label: 'Development & Tech' },
    { id: 'lang', label: 'Ethiopian Languages' },
    { id: 'exams', label: 'Academics & Exam Prep' },
    { id: 'design', label: 'UX/UI & Design' },
    { id: 'business', label: 'Business & Finance' },
  ];

  const featuredCourses = [
    {
      id: '1',
      title: 'Complete Amharic Language & Grammar Masterclass',
      category: 'lang',
      level: 'All Levels',
      instructor: 'Dr. Solomon Worku',
      role: 'Linguistics Specialist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviews: '1.2k',
      enrolled: '3,850',
      price: '450 ETB',
      img: '/assets/course-amharic.jpg',
      desc: 'Master spoken and written Amharic from alphabet fundamentals to professional business correspondence.',
    },
    {
      id: '2',
      title: 'Fullstack Web Development: Next.js & PostgreSQL',
      category: 'tech',
      level: 'Intermediate',
      instructor: 'Biniyam Alemu',
      role: 'Senior Software Engineer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      rating: 4.95,
      reviews: '2.1k',
      enrolled: '5,200',
      price: '850 ETB',
      img: '/assets/course-webdev.jpg',
      desc: 'Build scalable modern web applications from database architecture to deployment on cloud servers.',
    },
    {
      id: '3',
      title: 'Afaan Oromoo for Beginners & Conversational Mastery',
      category: 'lang',
      level: 'Beginner',
      instructor: 'Chaltu Tadesse',
      role: 'Cultural Educator',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      rating: 4.88,
      reviews: '870',
      enrolled: '2,140',
      price: '400 ETB',
      img: '/assets/course-oromoo.jpg',
      desc: 'A practical, conversational approach to speaking Afaan Oromoo naturally with real-world dialogs.',
    },
    {
      id: '4',
      title: 'Grade 12 National Exam Prep: Physics & Math',
      category: 'exams',
      level: 'High School',
      instructor: 'Abebe Kebede',
      role: 'Exam Board Tutor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      rating: 4.97,
      reviews: '3.6k',
      enrolled: '9,400',
      price: '350 ETB',
      img: '/assets/course-exam.jpg',
      desc: 'Comprehensive step-by-step problem solving covering past 10 years of national matric exam papers.',
    },
  ];

  const filteredCourses = activeCategory === 'All'
    ? featuredCourses
    : featuredCourses.filter(c => c.category === activeCategory);

  const topInstructors = [
    {
      name: 'Darrell Steward',
      subject: 'UX/UI & Product Design',
      role: 'Lead Product Designer',
      rate: '650 ETB/hr',
      rating: 4.8,
      reviews: '44k',
      img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      desc: 'Helping learners build stunning interfaces and portfolio-ready designs using modern industry tools.',
    },
    {
      name: 'Kathryn Murphy',
      subject: 'Data Science & Machine Learning',
      role: 'AI Researcher',
      rate: '750 ETB/hr',
      rating: 4.9,
      reviews: '38k',
      img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      desc: 'Specializing in Python, data analysis pipelines, and neural networks with real-world datasets.',
    },
    {
      name: 'Brooklyn Simmons',
      subject: 'Fullstack Cloud Architecture',
      role: 'DevOps Architect',
      rate: '700 ETB/hr',
      rating: 4.85,
      reviews: '41k',
      img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      desc: 'Dedicated mentor breaking down complex cloud backend systems into intuitive, hands-on lessons.',
    },
    {
      name: 'Esther Howard',
      subject: 'Amharic Literature & Grammar',
      role: 'University Lecturer',
      rate: '500 ETB/hr',
      rating: 4.95,
      reviews: '52k',
      img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      desc: 'Passionate about heritage languages, literature analysis, and bilingual communication mastery.',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/courses');
    }
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <PageTemplate fullWidth={true}>
      
      {/* ══════════════════════════════════════════════════════════════════
          1. HERO BANNER — Figma KnowledgePulse Curved Card
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
        <div className="container">
          <div className="hero-card-banner">
            
            {/* Decorative Sage Half-Circle (Figma Accent) */}
            <div style={{
              position: 'absolute', top: 30, right: '42%',
              width: 90, height: 45,
              borderRadius: '90px 90px 0 0',
              background: '#edf7f4', opacity: 0.18,
              transform: 'rotate(-45deg)',
              pointerEvents: 'none',
            }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              alignItems: 'center',
              gap: '3rem',
              position: 'relative',
              zIndex: 2,
            }}>
              
              {/* Left Content */}
              <div>
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '1.25rem',
                }}>
                  A X U M I A &nbsp; L E A R N I N G S
                </div>

                <h1 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  marginBottom: '1.25rem',
                }}>
                  Knowledge Meets<br />Innovation
                </h1>

                <p style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.65,
                  color: 'rgba(255, 255, 255, 0.8)',
                  maxWidth: 500,
                  marginBottom: '2.25rem',
                }}>
                  This platform&apos;s simplicity belies its powerful capabilities, offering a seamless and enjoyable educational experience for Ethiopian learners.
                </p>

                {/* Figma Search Capsule */}
                <form onSubmit={handleSearchSubmit} className="search-capsule" style={{ maxWidth: 480 }}>
                  <Search size={18} color="#0c3b2e" style={{ marginRight: 8, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search Courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#0f172a',
                      fontSize: '0.92rem',
                      width: '100%',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => router.push('/courses')}
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.85rem',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      borderLeft: '1px solid #e2e8f0',
                      marginLeft: 6,
                    }}
                  >
                    Courses ▾
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '0.55rem 1.4rem',
                      fontSize: '0.85rem',
                      background: '#0c3b2e',
                      borderRadius: 999,
                      marginLeft: 6,
                    }}
                  >
                    Search
                  </button>
                </form>

                {/* Quick Trust Chips */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={15} color="#86efac" /> 5,000+ Courses
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} color="#fde047" /> Telebirr & CBE Birr
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} color="#86efac" /> Verified Certificates
                  </span>
                </div>

              </div>

              {/* Right Visual — Figma Warm Sunshine Yellow Circle & Student */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                
                {/* Yellow Circle Backdrop from Figma */}
                <div style={{
                  width: 'clamp(280px, 32vw, 420px)',
                  height: 'clamp(280px, 32vw, 420px)',
                  borderRadius: '50%',
                  background: '#fde047',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                }}>
                  <img
                    src="/assets/hero-student.jpg"
                    onError={(e) => { e.currentTarget.src = '/assets/hero-course-cover1.jpg'; }}
                    alt="Student holding books"
                    style={{
                      width: '94%',
                      height: '94%',
                      objectFit: 'cover',
                      objectPosition: 'top',
                      borderRadius: '50% 50% 0 0',
                    }}
                  />
                </div>

                {/* Floating Decorative Mint Element */}
                <div style={{
                  position: 'absolute', bottom: 10, right: 10,
                  width: 70, height: 35,
                  borderRadius: '0 0 70px 70px',
                  background: '#edf7f4', opacity: 0.25,
                }} />

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. LOGO TRUST STRIP — Monochromatic Partners
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '2rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <p style={{
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            marginBottom: '1.75rem',
          }}>
            Join the 2000+ companies & top institutions we&apos;re already learning with
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(2rem, 5vw, 4.5rem)',
            flexWrap: 'wrap',
            opacity: 0.8,
          }}>
            {['Addis Ababa University', 'Ethiopian Airlines', 'Telebirr', 'Commercial Bank of Ethiopia', 'Ethio Telecom'].map(org => (
              <span key={org} style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}>
                {org}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. CAREER TRACKS & COURSES — 4-Column Grid (Figma Frame 2902:3373)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
              color: 'var(--text-primary)',
              marginBottom: '1.5rem',
            }}>
              Launch a new career in as<br />little as 6 months
            </h2>

            {/* Category Filter Pills (Figma horizontal tabs) */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      background: isActive ? 'var(--pine-deep)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 999,
                      padding: '0.55rem 1.35rem',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Column Course Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.75rem',
          }}>
            {filteredCourses.map((c) => (
              <article
                key={c.id}
                className="card card-hover"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 18,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  {/* Thumbnail (16:9) */}
                  <div style={{ height: 175, position: 'relative', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                    <img
                      src={c.img}
                      onError={(e) => {
                        e.currentTarget.src = c.id === '2' ? '/assets/hero-course-cover2.jpg' : '/assets/hero-course-cover1.jpg';
                      }}
                      alt={c.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(12, 59, 46, 0.88)', color: '#ffffff',
                      fontSize: '0.72rem', fontWeight: 700,
                      padding: '0.25rem 0.65rem', borderRadius: 999,
                      backdropFilter: 'blur(8px)',
                    }}>
                      {c.price}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '1.35rem' }}>
                    {/* Instructor Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                      <img
                        src={c.avatar}
                        alt={c.instructor}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.instructor}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.role}</div>
                      </div>
                    </div>

                    <h3 style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      lineHeight: 1.35,
                      color: 'var(--text-primary)',
                      marginBottom: '0.5rem',
                    }}>
                      {c.title}
                    </h3>

                    <p style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {c.desc}
                    </p>
                  </div>
                </div>

                {/* Rating & CTA Footer */}
                <div style={{
                  padding: '0 1.35rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.rating}</span>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.reviews} reviews)</span>
                  </div>

                  <Link
                    href={`/courses/${c.id}`}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                    }}
                  >
                    View →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Navigation Controls (< >) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '2.5rem' }}>
            <Link
              href="/courses"
              style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', textDecoration: 'none',
              }}
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              href="/courses"
              style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', textDecoration: 'none',
              }}
            >
              <ChevronRight size={18} />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. HOW AXUMIA WORKS — 3 Step Process (Figma Frame 2902:3373)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              color: 'var(--text-primary)',
            }}>
              How AXumia{' '}
              <span style={{
                border: '2px solid var(--accent)',
                borderRadius: '50% 60% 50% 60%',
                padding: '0.15rem 0.85rem',
                display: 'inline-block',
                transform: 'rotate(-2deg)',
              }}>
                works
              </span>
            </h2>
          </div>

          {/* 3 Figma Process Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            
            {/* Step 1 */}
            <div className="card" style={{
              background: 'var(--card-bg)',
              borderRadius: 22,
              padding: '2.25rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--card-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}>
              <div style={{ width: '100%', height: 140, background: '#edf7f4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem' }}>
                <div style={{ background: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: 999, border: '1px solid rgba(12,59,46,0.1)', fontSize: '0.82rem', fontWeight: 600, color: '#0c3b2e' }}>
                  ✓ Continue with Telebirr / Google
                </div>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Create your profile
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                  Sign up in seconds. Choose your native language preference, learning goals, and explore student discounts.
                </p>
              </div>
              <Link href="/register" className="btn-primary" style={{ padding: '0.65rem 1.8rem', background: '#0c3b2e' }}>
                Get Started
              </Link>
            </div>

            {/* Step 2 */}
            <div className="card" style={{
              background: 'var(--card-bg)',
              borderRadius: 22,
              padding: '2.25rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--card-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}>
              <div style={{ width: '100%', height: 140, background: '#edf7f4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem' }}>
                <div style={{ background: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: 999, border: '1px solid rgba(12,59,46,0.1)', fontSize: '0.82rem', fontWeight: 600, color: '#0c3b2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={14} /> Search 5,000+ Courses
                </div>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Search Courses
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                  Browse accredited video curriculums or book 1-on-1 private tutoring with certified mentors fluent in your dialect.
                </p>
              </div>
              <Link href="/courses" className="btn-primary" style={{ padding: '0.65rem 1.8rem', background: '#0c3b2e' }}>
                Explore Courses
              </Link>
            </div>

            {/* Step 3 */}
            <div className="card" style={{
              background: 'var(--card-bg)',
              borderRadius: 22,
              padding: '2.25rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--card-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            }}>
              <div style={{ width: '100%', height: 140, background: '#edf7f4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem' }}>
                <div style={{ background: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: 999, border: '1px solid rgba(12,59,46,0.1)', fontSize: '0.82rem', fontWeight: 600, color: '#0c3b2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color="#15805a" /> Escrow Protected
                </div>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Make a Connection
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                  Learn live, complete interactive assignments, and rest easy knowing escrow protection holds your payment safely.
                </p>
              </div>
              <Link href="/help-requests" className="btn-primary" style={{ padding: '0.65rem 1.8rem', background: '#0c3b2e' }}>
                Learn More
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          5. MEET OUR MENTORS — 4-Column Grid (Figma Frame 2902:3373)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              color: 'var(--text-primary)',
            }}>
              Meet our professional{' '}
              <span style={{
                border: '2px solid var(--accent)',
                borderRadius: '50% 60% 50% 60%',
                padding: '0.15rem 0.85rem',
                display: 'inline-block',
                transform: 'rotate(-2deg)',
              }}>
                mentors.
              </span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: '1.75rem',
          }}>
            {topInstructors.map((inst) => (
              <div
                key={inst.name}
                className="card card-hover"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ height: 260, overflow: 'hidden', background: 'var(--bg-surface)' }}>
                    <img
                      src={inst.img}
                      alt={inst.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {inst.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.65rem' }}>
                      {inst.subject}
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {inst.desc}
                    </p>
                  </div>
                </div>

                <div style={{
                  padding: '0 1.25rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{inst.rating}</span>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({inst.reviews} reviews)</span>
                  </div>

                  <Link href="/book-session" className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', background: '#0c3b2e' }}>
                    Book
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls (< >) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '2.5rem' }}>
            <Link
              href="/instructors"
              style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', textDecoration: 'none',
              }}
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              href="/instructors"
              style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', textDecoration: 'none',
              }}
            >
              <ChevronRight size={18} />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. TESTIMONIAL — Editorial Quote Card (Figma Frame 2902:3373)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-surface)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          
          {/* Giant Quote Graphic */}
          <div style={{
            fontFamily: 'serif',
            fontSize: '6rem',
            lineHeight: 0.8,
            color: '#0c3b2e',
            opacity: 0.35,
            marginBottom: '1rem',
          }}>
            “
          </div>

          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: '2rem',
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
          }}>
            Testimonial
          </h2>

          <blockquote style={{
            fontSize: 'clamp(1.15rem, 2vw, 1.45rem)',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            fontWeight: 500,
            marginBottom: '2rem',
          }}>
            &ldquo;Since implementing AXumia, our organization has witnessed a remarkable transformation in how we approach continuous learning. The platform&apos;s simplicity belies its powerful capabilities, offering live 1-on-1 tutoring in Amharic and seamless Telebirr payments that make quality education truly accessible.&rdquo;
          </blockquote>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Theresa Webb, <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>UX/UI Designer — Addis Ababa</span>
              </div>
            </div>

            {/* Avatar Stack */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {[
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="Student"
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    border: '2px solid var(--card-bg)',
                    marginLeft: i === 0 ? 0 : -10,
                    objectFit: 'cover',
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. NEWSLETTER CTA — Figma Pill Capture Banner
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
        
        {/* Semicircle Decorative Accents (Figma Style) */}
        <div style={{
          position: 'absolute', top: 30, right: 40,
          width: 90, height: 45,
          borderRadius: '90px 90px 0 0',
          background: '#0c3b2e', opacity: 0.15,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 30, left: 40,
          width: 90, height: 45,
          borderRadius: '0 0 90px 90px',
          background: '#0c3b2e', opacity: 0.15,
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ maxWidth: 720, textAlign: 'center', position: 'relative', zIndex: 2 }}>
          
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}>
            <span style={{
              border: '2px solid #fde047',
              borderRadius: '50% 60% 50% 60%',
              padding: '0.15rem 0.85rem',
              display: 'inline-block',
              transform: 'rotate(-2deg)',
            }}>
              Subscribe
            </span>{' '}
            Our Newsletter
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            maxWidth: 480,
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
          }}>
            Join now to receive personalized course recommendations, tech updates, and Ethiopian scholarship alerts.
          </p>

          {subscribed ? (
            <div style={{
              background: '#edf7f4',
              color: '#0c3b2e',
              padding: '1rem 2rem',
              borderRadius: 999,
              fontWeight: 700,
              display: 'inline-block',
            }}>
              ✓ Thank you! You are now subscribed to AXumia updates.
            </div>
          ) : (
            <form
              onSubmit={handleNewsletter}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 999,
                padding: '6px 8px 6px 20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                maxWidth: 520,
                margin: '0 auto',
              }}
            >
              <input
                type="email"
                placeholder="Enter your email..."
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  width: '100%',
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.8rem',
                  fontSize: '0.88rem',
                  background: '#0c3b2e',
                  borderRadius: 999,
                }}
              >
                Subscribe
              </button>
            </form>
          )}

        </div>
      </section>

    </PageTemplate>
  );
}
