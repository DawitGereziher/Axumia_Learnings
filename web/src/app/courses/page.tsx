'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import PageTemplate from '@/components/PageTemplate';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  Search, SlidersHorizontal, BookOpen, Star, Users, X, ArrowUpDown, ChevronDown, Check, Sparkles, Filter,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count?: { courses: number };
}

const LEVELS = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const LANGUAGES = [
  { id: 'all', label: 'All Languages' },
  { id: 'am', label: 'Amharic (አማርኛ)' },
  { id: 'en', label: 'English' },
];

const PRICE_RANGES = [
  { id: 'all', label: 'All Prices' },
  { id: 'free', label: 'Free Only' },
  { id: 'under500', label: 'Under 500 ETB' },
  { id: '500to2000', label: '500 - 2,000 ETB' },
  { id: 'over2000', label: 'Over 2,000 ETB' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest Arrivals' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
];

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // State from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || 'all');
  const [selectedPrice, setSelectedPrice] = useState(searchParams.get('priceRange') || 'all');
  const [selectedRating, setSelectedRating] = useState(searchParams.get('rating') || 'all');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Data state
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const limit = 12;

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync state to URL params
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedLevel !== 'all') params.set('level', selectedLevel);
    if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
    if (selectedPrice !== 'all') params.set('priceRange', selectedPrice);
    if (selectedRating !== 'all') params.set('rating', selectedRating);
    if (selectedSort !== 'newest') params.set('sort', selectedSort);
    if (page > 1) params.set('page', String(page));

    const queryString = params.toString();
    router.replace(queryString ? `/courses?${queryString}` : '/courses', { scroll: false });
  }, [debouncedSearch, selectedCategory, selectedLevel, selectedLanguage, selectedPrice, selectedRating, selectedSort, page, router]);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API}/api/courses/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch courses on filter/search change
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: selectedSort,
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedLevel !== 'all') params.set('level', selectedLevel);
      if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
      if (selectedPrice !== 'all') params.set('priceRange', selectedPrice);
      if (selectedRating !== 'all') params.set('rating', selectedRating);

      const res = await fetch(`${API}/api/courses?${params.toString()}`);
      const data = await res.json();
      setCourses(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedLevel, selectedLanguage, selectedPrice, selectedSort, page]);

  useEffect(() => {
    updateUrlParams();
    fetchCourses();
  }, [debouncedSearch, selectedCategory, selectedLevel, selectedLanguage, selectedPrice, selectedSort, page]);

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedLevel('all');
    setSelectedLanguage('all');
    setSelectedPrice('all');
    setSelectedSort('newest');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  const getFullUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
    return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  };

  const hasActiveFilters = !!(
    debouncedSearch ||
    selectedCategory ||
    selectedLevel !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedPrice !== 'all'
  );

  return (
    <PageTemplate fullWidth={true}>
      {/* ── Figma Hero Banner Container ────────────────────────── */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
        <div style={{
          background: 'var(--pine-deep)',
          borderRadius: 28,
          padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(12, 59, 46, 0.25)',
        }}>
          {/* Decorative background glows */}
          <div style={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.09)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, left: '20%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 860 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.75rem',
              fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#fde047', marginBottom: '1.25rem',
            }}>
              <Sparkles size={14} /> E X P L O R E  C A T A L O G
            </div>

            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.15,
              color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em',
            }}>
              Master new skills. Elevate{' '}
              <span style={{ position: 'relative', display: 'inline-block', color: '#fde047' }}>
                your career.
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q50 0 100 15" stroke="#fde047" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h1>

            <p style={{
              color: 'rgba(255, 255, 255, 0.85)', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
              lineHeight: 1.6, marginBottom: '2rem', maxWidth: 680,
            }}>
              Discover hand-crafted certification courses and career tracks created by industry experts across Ethiopia. Enroll seamlessly with Telebirr & CBE.
            </p>

            {/* Pill Search Capsule */}
            <div style={{
              display: 'flex', alignItems: 'center', background: '#ffffff',
              borderRadius: 999, padding: '0.4rem 0.5rem 0.4rem 1.4rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxWidth: 600,
            }}>
              <Search size={18} color="#0c3b2e" style={{ flexShrink: 0, marginRight: '0.75rem' }} />
              <input
                id="catalog-search-input"
                type="search"
                placeholder="What skill or course do you want to learn today?"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  color: '#0c3b2e', fontSize: '0.95rem', fontWeight: 600, outline: 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.4rem' }}
                >
                  <X size={16} />
                </button>
              )}
              <button
                className="btn-primary"
                style={{
                  padding: '0.7rem 1.6rem', borderRadius: 999, fontWeight: 800,
                  fontSize: '0.88rem', background: '#0c3b2e', color: '#ffffff',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills ──────────────────────────────── */}
      {categories.length > 0 && (
        <div className="container" style={{ paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
            <button
              id="cat-chip-all"
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              style={{
                padding: '0.55rem 1.35rem', borderRadius: 999, border: '1px solid',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                borderColor: !selectedCategory ? 'var(--pine-deep)' : 'var(--card-border)',
                background: !selectedCategory ? 'var(--pine-deep)' : 'var(--card-bg)',
                color: !selectedCategory ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: !selectedCategory ? '0 4px 15px rgba(12, 59, 46, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                id={`cat-chip-${c.slug}`}
                onClick={() => { setSelectedCategory(c.slug === selectedCategory ? '' : c.slug); setPage(1); }}
                style={{
                  padding: '0.55rem 1.35rem', borderRadius: 999, border: '1px solid',
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  borderColor: selectedCategory === c.slug ? 'var(--pine-deep)' : 'var(--card-border)',
                  background: selectedCategory === c.slug ? 'var(--pine-deep)' : 'var(--card-bg)',
                  color: selectedCategory === c.slug ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: selectedCategory === c.slug ? '0 4px 15px rgba(12, 59, 46, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Catalog Grid & Filters ────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '1rem', paddingBottom: '5rem', flex: 1 }}>

        {/* Section Header with Decorative Sage Shape (from Figma KnowledgePulse) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', position: 'relative' }}>
          <div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', color: 'var(--text-primary)',
              lineHeight: 1.2, letterSpacing: '-0.02em',
            }}>
              Launch a new career in as little as 6 months
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
              Hand-picked career tracks and verified certifications to take you from beginner to professional.
            </p>
          </div>
          {/* Decorative sage quadrant shape from Figma */}
          <div style={{
            width: 64, height: 64,
            borderBottomLeftRadius: '100%',
            background: 'rgba(181, 216, 205, 0.45)',
            pointerEvents: 'none',
            flexShrink: 0,
            marginLeft: '1rem',
          }} />
        </div>

        {/* Toolbar (Mobile Filter Button & Sort) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              id="toggle-mobile-filters"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.55rem 1.1rem', borderRadius: 999,
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <Filter size={15} /> Filters {hasActiveFilters && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
            </button>

            {hasActiveFilters && (
              <button
                id="clear-all-filters-btn"
                onClick={clearAllFilters}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sort by:</span>
            <select
              id="sort-select"
              value={selectedSort}
              onChange={(e) => { setSelectedSort(e.target.value); setPage(1); }}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: 999,
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* ── Sidebar Filters (Desktop) ─────────────────────────────────── */}
          <aside style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 20, padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          }}>
            {/* Level Filter */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Course Level
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {LEVELS.map((lvl) => (
                  <label key={lvl.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', color: selectedLevel === lvl.id ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selectedLevel === lvl.id ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="level"
                      checked={selectedLevel === lvl.id}
                      onChange={() => { setSelectedLevel(lvl.id); setPage(1); }}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    {lvl.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Language Filter */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Language
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {LANGUAGES.map((lang) => (
                  <label key={lang.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', color: selectedLanguage === lang.id ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selectedLanguage === lang.id ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="language"
                      checked={selectedLanguage === lang.id}
                      onChange={() => { setSelectedLanguage(lang.id); setPage(1); }}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    {lang.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Price Range
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {PRICE_RANGES.map((pr) => (
                  <label key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', color: selectedPrice === pr.id ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selectedPrice === pr.id ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === pr.id}
                      onChange={() => { setSelectedPrice(pr.id); setPage(1); }}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    {pr.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Minimum Rating
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {[
                  { id: 'all', label: 'All Ratings' },
                  { id: '4.5', label: '★ 4.5 & Up' },
                  { id: '4', label: '★ 4.0 & Up' },
                  { id: '3', label: '★ 3.0 & Up' },
                ].map((r) => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', color: selectedRating === r.id ? '#f59e0b' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selectedRating === r.id ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="rating"
                      checked={selectedRating === r.id}
                      onChange={() => { setSelectedRating(r.id); setPage(1); }}
                      style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Course Grid (Figma LMS 4-column card design) ────────────────── */}
          <div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ height: 320, borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '5rem 2rem',
                background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20,
              }}>
                <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No courses found
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Try adjusting your search criteria or clearing filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: '0.65rem 1.6rem', borderRadius: 999,
                    background: 'var(--pine-deep)', border: 'none',
                    color: '#ffffff', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                  {courses.map((c) => {
                    const imgUrl = getFullUrl(c.cover_image || c.thumbnail);
                    const instructorName = c.instructor?.user
                      ? `${c.instructor.user.first_name || ''} ${c.instructor.user.last_name || ''}`.trim()
                      : 'AXumia Instructor';
                    const instructorAvatar = getFullUrl(c.instructor?.profile_image || c.instructor?.user?.image);
                    const isFree = Number(c.price) === 0;

                    return (
                      <Link key={c.id} href={`/courses/${c.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="course-card-lms">
                          {/* Thumbnail with Zoom & Gleam on Hover */}
                          <div className="course-thumb-wrap">
                            {imgUrl ? (
                              <img className="course-thumb-img" src={imgUrl} alt={c.title} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(12,59,46,0.15), var(--card-bg))' }}>
                                <BookOpen size={38} color="var(--accent)" style={{ opacity: 0.7 }} />
                              </div>
                            )}

                            {c.category && (
                              <div style={{
                                position: 'absolute', top: 10, left: 10,
                                background: 'rgba(12, 59, 46, 0.92)', backdropFilter: 'blur(6px)',
                                color: '#ffffff',
                                fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                                zIndex: 2,
                              }}>
                                {c.category.name}
                              </div>
                            )}

                            <div style={{
                              position: 'absolute', bottom: 10, right: 10,
                              background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
                              color: '#f8fafc', fontSize: '0.7rem', fontWeight: 600,
                              padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize',
                              zIndex: 2,
                            }}>
                              {c.level || 'All Levels'}
                            </div>
                          </div>

                          {/* Content (Figma Author Row + Title + Description + Meta) */}
                          <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            
                            {/* Author Row (Avatar + Name + Role) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--pine-deep)', color: '#ffffff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                              }}>
                                {instructorAvatar ? (
                                  <img src={instructorAvatar} alt={instructorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  instructorName[0]
                                )}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {instructorName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.instructor?.headline || 'Verified Instructor'}
                                </div>
                              </div>
                            </div>

                            {/* Course Title */}
                            <h3 className="course-card-title" style={{
                              fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)',
                              lineHeight: 1.35, marginBottom: '0.4rem',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {c.title}
                            </h3>

                            {/* Course Snippet */}
                            <p style={{
                              fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                              marginBottom: '1rem',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {c.description || 'Master modern skills with hands-on practice, quizzes, and mentor support.'}
                            </p>

                            {/* Bottom Meta: Rating & Price */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                                <Star size={14} fill={c.avgRating && c.avgRating > 0 ? '#f59e0b' : 'none'} color="#f59e0b" />
                                <span>{c.avgRating && c.avgRating > 0 ? Number(c.avgRating).toFixed(1) : 'New'}</span>
                                {c._count?.reviews !== undefined && c._count.reviews > 0 ? (
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>({c._count.reviews})</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>(0)</span>
                                )}
                              </div>

                              <div className="course-card-price" style={{
                                fontWeight: 800, fontSize: '0.85rem',
                                color: isFree ? '#10b981' : 'var(--pine-deep)',
                                background: isFree ? 'rgba(16,185,129,0.1)' : 'var(--pine-light)',
                                padding: '4px 12px', borderRadius: 999,
                              }}>
                                {isFree ? 'FREE' : `${Number(c.price).toLocaleString()} ETB`}
                              </div>
                            </div>

                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Circular Pagination (from Figma KnowledgePulse) */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '3.5rem' }}>
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      title="Previous Page"
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.35 : 1,
                        fontSize: '1.3rem', fontWeight: 700, transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      title="Next Page"
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.35 : 1,
                        fontSize: '1.3rem', fontWeight: 700, transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      ›
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 600 }}>
                      Page {page} of {totalPages}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080a0f' }} />}>
      <CatalogContent />
    </Suspense>
  );
}
