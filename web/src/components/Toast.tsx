'use client';
import React, { createContext, useContext, useState, useCallback, useId } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: '#10b981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  icon: '#ef4444' },
  info:    { bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.35)', icon: '#d4af37' },
  warning: { bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.4)',  icon: '#f5e6b3' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const success = useCallback((m: string) => toast(m, 'success'), [toast]);
  const error   = useCallback((m: string) => toast(m, 'error'),   [toast]);
  const info    = useCallback((m: string) => toast(m, 'info'),    [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.6rem',
        maxWidth: '360px', width: 'calc(100vw - 3rem)',
      }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              animation: 'fade-up 0.25s ease',
              cursor: 'pointer',
            }} onClick={() => remove(t.id)}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c.border, color: c.icon,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              }}>{icons[t.type]}</span>
              <span style={{ color: '#f1f5f9', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {t.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
