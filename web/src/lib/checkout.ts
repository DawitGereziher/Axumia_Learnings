import { authFetch, getAccessToken } from './auth';
import { paymentsApi } from './api';

export type PayableEntityType = 'course' | 'booking' | 'help_session';

export interface InitiateCheckoutOptions {
  entityType: PayableEntityType;
  entityId: string;
  isFree?: boolean;
  /** Redirect automatically to Chapa gateway URL when received (defaults to true) */
  autoRedirect?: boolean;
  onSuccess?: (result: { enrolledDirectly?: boolean; checkoutUrl?: string; txRef?: string }) => void;
  onError?: (error: Error) => void;
}

export interface CheckoutResult {
  checkoutUrl?: string;
  txRef?: string;
  enrolledDirectly?: boolean;
}

/**
 * Standardized Unified Checkout Client
 *
 * Implements bank-grade payment initiation across all payable entities in AXumia:
 * 1. Courses (free direct enrollment or Chapa checkout)
 * 2. 1-on-1 Tutoring Bookings (Chapa checkout holding slot)
 * 3. Help Requests / Sessions (Chapa escrow checkout holding funds until completion)
 */
export async function initiateUnifiedCheckout(options: InitiateCheckoutOptions): Promise<CheckoutResult> {
  const { entityType, entityId, isFree = false, autoRedirect = true, onSuccess, onError } = options;

  const token = getAccessToken();
  if (!token) {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
    const err = new Error('Authentication required to proceed with checkout.');
    onError?.(err);
    throw err;
  }

  try {
    // ── Free Course Bypass ─────────────────────────────────────────────────────
    if (entityType === 'course' && isFree) {
      const res = await authFetch(`/api/courses/${entityId}/enroll-free`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Free enrollment failed. Please try again.');
      }

      const result: CheckoutResult = { enrolledDirectly: true };
      onSuccess?.(result);
      return result;
    }

    // ── Paid Entity Checkout via Chapa Gateway ─────────────────────────────────
    let checkoutUrl = '';
    let txRef = '';

    if (entityType === 'course') {
      const res = await paymentsApi.initiateCourse(entityId);
      checkoutUrl = res.checkoutUrl;
      txRef = res.txRef;
    } else if (entityType === 'booking') {
      const res = await paymentsApi.initiateBooking(entityId);
      checkoutUrl = res.checkoutUrl;
      txRef = res.txRef;
    } else if (entityType === 'help_session') {
      const res = await paymentsApi.initiateHelpSession(entityId);
      checkoutUrl = res.checkoutUrl;
      txRef = res.txRef;
    } else {
      throw new Error(`Unsupported payment entity type: ${entityType}`);
    }

    if (!checkoutUrl) {
      throw new Error('Payment gateway did not provide a valid checkout URL.');
    }

    const result: CheckoutResult = { checkoutUrl, txRef };
    onSuccess?.(result);

    if (autoRedirect && typeof window !== 'undefined') {
      window.location.href = checkoutUrl;
    }

    return result;
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(err?.message || 'Payment processing failed');
    onError?.(error);
    throw error;
  }
}
