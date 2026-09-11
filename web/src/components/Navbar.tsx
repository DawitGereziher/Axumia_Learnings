'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { Settings, LogOut, ShieldCheck, Wallet, Search } from 'lucide-react';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { href: '/courses',       label: t.nav.courses },
    { href: '/instructors',   label: t.nav.instructors },
    { href: '/book-session',  label: t.nav.bookSession },
    { href: '/help-requests', label: 'Help Requests' },
  ];

  const settingsPath = user?.role === 'instructor' || user?.role === 'admin'
    ? '/settings/instructor'
    : '/settings/student';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close drawer on route change or Escape key
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.email[0]}`.toUpperCase()
    : '';

  const userAvatar = getFullUrl(user?.image);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 1.5rem',
        background: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid var(--nav-border)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: '64px', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/axumia_logo_icon.svg"
              onError={(e) => { e.currentTarget.src = '/axumia_logo_concept_v4.svg'; }}
              alt="AXumia Learnings Logo"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
            <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              AXumia<span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: '3px' }}>Learnings</span>
            </span>
          </Link>

          {/* Center Search Capsule (from Figma KnowledgePulse) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchVal.trim()) router.push(`/courses?search=${encodeURIComponent(searchVal.trim())}`);
            }}
            style={{ display: 'flex', alignItems: 'center', flex: '0 1 360px', margin: '0 1.25rem' }}
            className="desktop-search"
          >
            <div style={{
              display: 'flex', alignItems: 'center', width: '100%',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 999, padding: '7px 16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
            }}>
              <Search size={16} style={{ color: 'var(--accent)', marginRight: 10, flexShrink: 0 }} />
              <input
                type="search"
                placeholder="Search courses, mentors..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '0.86rem', width: '100%',
                  fontWeight: 500,
                }}
              />
            </div>
          </form>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }} className="desktop-nav">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none', fontSize: '0.88rem', fontWeight: isActive ? 700 : 500,
                  transition: 'color 0.15s ease',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  paddingBottom: '4px',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)')}>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Desktop auth area, ThemeToggle & Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }} className="desktop-nav">
            <ThemeToggle />
            <LanguageSwitcher />

            {user ? (
              <>
                <Link href="/my-courses" className="btn-ghost" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 999 }}>
                  My Learning
                </Link>
                <Link href="/dashboard" className="btn-ghost" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: 999 }}>
                  {t.nav.dashboard}
                </Link>
                {/* Avatar dropdown */}
                <div style={{ position: 'relative' }} className="avatar-menu-root">
                  <button
                    id="user-avatar-btn"
                    title={user.email}
                    style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: userAvatar ? 'transparent' : 'var(--pine-deep)',
                      border: '2px solid var(--card-border)', color: '#ffffff', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      padding: 0,
                      boxShadow: '0 2px 8px rgba(12, 59, 46, 0.15)',
                    }}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt={user.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials
                    )}
                  </button>
                  {/* Dropdown menu */}
                  <div className="avatar-dropdown" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)',
                    borderRadius: 16, padding: '0.5rem', minWidth: 200,
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
                    display: 'none', flexDirection: 'column', gap: '0.2rem', zIndex: 200,
                  }}>
                    <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--card-border)', marginBottom: '0.2rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signed in as</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <Link id="nav-settings-link" href={settingsPath} style={dropdownItemStyle}>
                      <Settings size={15} /> Settings
                    </Link>
                    {(user.role === 'instructor') && (
                      <Link id="nav-payouts-link" href="/instructor/payouts" style={{ ...dropdownItemStyle, color: 'var(--accent)' }}>
                        <Wallet size={15} /> Earnings & Payouts
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link id="nav-admin-link" href="/admin" style={{ ...dropdownItemStyle, color: 'var(--accent)' }}>
                        <ShieldCheck size={15} /> Admin Console
                      </Link>
                    )}
                    <button id="nav-logout-btn" onClick={logout} style={{ ...dropdownItemStyle, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#ef4444' }}>
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  id="nav-signin-btn"
                  style={{
                    background: 'var(--pine-deep)',
                    color: '#ffffff',
                    padding: '0.5rem 1.4rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: 999,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(12, 59, 46, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(12, 59, 46, 0.2)';
                  }}
                >
                  {t.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  id="nav-register-btn"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--card-border)',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderRadius: 999,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                  }}
                >
                  {t.nav.getStarted}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'none', background: 'none', border: 'none',
              cursor: 'pointer', padding: '0.5rem',
              flexDirection: 'column', gap: '5px',
            }}
            className="mobile-menu-btn"
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', width: 22, height: 2,
                background: 'var(--text-primary)', borderRadius: 2,
                transition: 'all 0.3s',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
                  : i === 2 ? 'rotate(-45deg) translate(5px, -5px)'
                  : 'scaleX(0)'
                  : 'none',
              }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          }}
        />
      )}

      {/* Mobile drawer */}
      <div style={{
        position: 'fixed', top: 64, right: 0, width: 'min(320px, 85vw)',
        height: 'calc(100vh - 64px)', zIndex: 99,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--card-border)',
        backdropFilter: 'blur(20px)',
        padding: '2rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Appearance</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href} style={{
            color: pathname === href ? '#ffffff' : 'var(--text-secondary)', textDecoration: 'none',
            padding: '0.75rem 1rem', borderRadius: 10,
            fontSize: '0.95rem', fontWeight: pathname === href ? 700 : 500,
            background: pathname === href ? 'var(--accent-soft)' : 'transparent',
            transition: 'all 0.15s',
          }}>
            {label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {user ? (
            <>
              <div style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
              </div>
              <Link href="/my-courses" className="btn-primary" style={{ textAlign: 'center', padding: '0.65rem' }}>
                My Learning
              </Link>
              <Link href="/dashboard" className="btn-ghost" style={{ textAlign: 'center', padding: '0.65rem' }}>
                {t.nav.dashboard}
              </Link>
              <Link id="mobile-settings-link" href={settingsPath} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '0.65rem 1rem', color: 'var(--text-secondary)', textDecoration: 'none', textAlign: 'center', fontSize: '0.88rem' }}>
                <Settings size={15} /> Settings
              </Link>
              <button onClick={logout} className="btn-ghost" style={{ padding: '0.65rem', cursor: 'pointer', color: '#f87171' }}>
                {t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost" style={{ textAlign: 'center', padding: '0.75rem' }}>
                {t.nav.signIn}
              </Link>
              <Link href="/register" className="btn-primary" style={{ textAlign: 'center', padding: '0.75rem' }}>
                {t.nav.getStarted}
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        .avatar-menu-root:focus-within .avatar-dropdown,
        .avatar-menu-root:hover .avatar-dropdown {
          display: flex !important;
        }
      `}</style>
    </>
  );
}

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.55rem 0.75rem', borderRadius: 8,
  fontSize: '0.85rem', fontWeight: 600,
  color: '#94a3b8', textDecoration: 'none',
  transition: 'background 0.15s',
};
