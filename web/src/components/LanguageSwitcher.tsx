'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Language } from '@/lib/translations';

export default function LanguageSwitcher() {
  const { language, setLanguage, languageOptions, currentLanguageOption } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '20px',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{currentLanguageOption.flag}</span>
        <span>{currentLanguageOption.nativeName}</span>
        <span style={{ fontSize: '0.65rem', color: '#d4af37' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          minWidth: '170px',
          background: 'rgba(10, 10, 14, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '14px',
          padding: '6px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {languageOptions.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLanguage(opt.code as Language);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: language === opt.code ? 'rgba(212,175,55,0.18)' : 'transparent',
                color: language === opt.code ? '#d4af37' : '#a1a1aa',
                fontSize: '0.8rem',
                fontWeight: language === opt.code ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (language !== opt.code) e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
              }}
              onMouseLeave={(e) => {
                if (language !== opt.code) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{opt.flag}</span>
                <span>{opt.nativeName}</span>
              </span>
              {language === opt.code && <span style={{ fontSize: '0.75rem', color: '#d4af37' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
