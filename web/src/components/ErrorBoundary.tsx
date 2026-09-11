'use client';
import React from 'react';

interface State { hasError: boolean; error?: Error; }

/**
 * ErrorBoundary — catches React render errors and shows a recovery UI
 * instead of a full white screen crash.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry:
    // Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', flexDirection: 'column', textAlign: 'center', gap: '1.5rem',
        }}>
          <div style={{ fontSize: '3rem' }}>😵</div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#f1f5f9' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: 400 }}>
            An unexpected error occurred. Our team has been notified.
            {this.state.error && (
              <code style={{
                display: 'block', marginTop: '0.75rem', fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem',
                borderRadius: 8, color: '#ef4444',
              }}>
                {this.state.error.message}
              </code>
            )}
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '0.75rem 2rem' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
