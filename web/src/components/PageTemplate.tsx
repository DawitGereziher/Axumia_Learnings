'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export interface PageTemplateProps {
  children: React.ReactNode;
  /** If true, content area is edge-to-edge without a wrapping container box (ideal for full-bleed landing pages) */
  fullWidth?: boolean;
  /** If true, uses fluid container with edge-to-edge desktop width (ideal for rich grids) */
  fluid?: boolean;
  /** Whether to render the global navigation bar (default: true) */
  navbar?: boolean;
  /** Whether to render the global footer (default: true) */
  footer?: boolean;
  /** Optional page header title */
  title?: string;
  /** Optional page subtitle or description */
  subtitle?: string;
  /** Optional badge displayed above the title */
  badge?: string;
  /** Extra right-side actions in the page header (e.g. action buttons, filters) */
  headerAction?: React.ReactNode;
  /** Additional styling for the main container */
  style?: React.CSSProperties;
  /** Additional class names for the main content */
  className?: string;
}

/**
 * Centralized Page Template for AXumia Learnings.
 * 
 * Provides:
 * - Fixed Obsidian Glass Navbar
 * - Full Desktop Canvas utilization with fluid, responsive gutters
 * - Unified typography and optional header banner
 * - Sticky Footer pinned to the bottom of viewport
 */
export default function PageTemplate({
  children,
  fullWidth = false,
  fluid = false,
  navbar = true,
  footer = true,
  title,
  subtitle,
  badge,
  headerAction,
  style,
  className = '',
}: PageTemplateProps) {
  return (
    <div className="page-shell">
      {navbar && <Navbar />}

      <main
        className={`page-main ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
          ...style,
        }}
      >
        {/* Optional Centralized Page Header Banner */}
        {title && (
          <section
            style={{
              background: 'linear-gradient(180deg, rgba(12, 59, 46, 0.08) 0%, transparent 100%)',
              borderBottom: '1px solid var(--card-border)',
              paddingTop: '2.5rem',
              paddingBottom: '2.5rem',
            }}
          >
            <div className={fluid ? 'container-fluid' : 'container'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  {badge && (
                    <div
                      className="badge badge-accent"
                      style={{ marginBottom: '0.75rem' }}
                    >
                      {badge}
                    </div>
                  )}
                  <h1
                    className="section-heading"
                    style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', color: 'var(--text-primary)', marginBottom: '0.35rem' }}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 720 }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {headerAction && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {headerAction}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Page Content Body */}
        {fullWidth ? (
          <div style={{ flex: 1, width: '100%' }}>
            {children}
          </div>
        ) : (
          <div
            className={fluid ? 'container-fluid' : 'container'}
            style={{
              flex: 1,
              width: '100%',
              paddingTop: title ? '2rem' : '1.5rem',
              paddingBottom: '4.5rem',
            }}
          >
            {children}
          </div>
        )}
      </main>

      {footer && <Footer />}
    </div>
  );
}
