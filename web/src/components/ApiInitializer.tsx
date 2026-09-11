'use client';
/**
 * ApiInitializer.tsx
 *
 * Wires the global toast system and session-expiry handler
 * into the centralized API client (api.ts).
 *
 * Must be rendered inside both <ToastProvider> and <AuthProvider>.
 * Place it as a child of <ToastProvider> in layout.tsx.
 */

import { useEffect } from 'react';
import { initApiClient } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function ApiInitializer() {
  const { error: toastError } = useToast();

  useEffect(() => {
    initApiClient({
      onError: (message) => {
        toastError(message);
      },
      onSessionExpired: () => {
        toastError('Your session has expired. Please sign in again.');
      },
    });
  }, [toastError]);

  return null;
}
