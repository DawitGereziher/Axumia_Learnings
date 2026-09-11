'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  const links = {
    [t.footer.platform]: [
      { label: t.nav.courses, href: '/courses' },
      { label: t.nav.instructors, href: '/instructors' },
      { label: t.nav.bookSession, href: '/book-session' },
      { label: t.hero.bookTutor, href: '/instructors' },
    ],
    [t.footer.company]: [
      { label: t.footer.about, href: '#' },
      { label: t.footer.careers, href: '#' },
      { label: t.footer.contact, href: '#' },
    ],
    Legal: [
      { label: t.footer.privacy, href: '#' },
      { label: t.footer.terms, href: '#' },
    ],
  };

  const paymentMethods = ['Telebirr', 'CBE Birr', 'HelloCash', 'Visa / MC'];

  return (
    <footer style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'var(--pine-dark)',
      color: '#f8fafc',
      marginTop: 'auto',
      transition: 'background 0.3s ease',
    }}>
      <div className="container" style={{ padding: '4.5rem 1.5rem 2.5rem' }}>

        {/* Top grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem',
        }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 240 }}>
              {t.footer.description}
            </p>
            {/* Payment badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1.2rem' }}>
              {paymentMethods.map(m => (
                <span key={m} style={{
                  fontSize: '0.7rem', padding: '0.2rem 0.6rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 6, color: 'var(--text-secondary)', fontWeight: 500,
                }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {section}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} AXumia Learnings. {t.footer.copyright}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Made with ❤️ in Ethiopia 🇪🇹
          </p>
        </div>
      </div>
    </footer>
  );
}
