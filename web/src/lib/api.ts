/**
 * api.ts — Typed, centralized API client for AXumia Learnings.
 *
 * Features:
 *  - Auto-injects Authorization: Bearer token from localStorage
 *  - On 401 → silent token refresh → retry once → redirect to /login
 *  - Typed response interfaces matching Prisma schema
 *  - Global error handler integration via optional toast callback
 *  - All API namespaces: courses, users, bookings, payments, admin, content
 */

import { getAccessToken, refreshAccessToken, clearTokens } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Error Types ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// ── Response Types ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Types (matching Prisma schema exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name?: string;
  role: 'student' | 'instructor' | 'admin';
  image: string | null;
  is_email_verified: boolean;
  created_at: string;
}

export interface InstructorProfile {
  id: string;
  user_id: string;
  user?: User;
  bio: string | null;
  headline: string | null;
  kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected';
  hourly_rate: string;   // Decimal as string from Prisma
  is_active: boolean;
  cover_image: string | null;
  profile_image: string | null;
  skills: string[];
  languages: string[];
  experience_years: number | null;
  location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  total_students: number;
  total_sessions: number;
  avg_rating: string;    // Decimal as string
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  material_type: 'pdf' | 'document' | 'link' | 'zip' | 'image' | 'other';
  file_url: string | null;
  file_size: number | null;
  file_name: string | null;
  is_downloadable: boolean;
  is_free_preview: boolean;
  position: number;
  created_at: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  lessons?: CourseLesson[];
  created_at: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  position: number;
  content_type: 'video' | 'youtube' | 'pdf' | 'audio' | 'text' | 'quiz';
  storage_type: 's3' | 'youtube' | 'external' | 'embedded';
  duration_s: number | null;
  is_free_preview: boolean;
  is_published: boolean;
  access_level: 'free' | 'paid' | 'premium';
  hls_key: string | null;
  video_key: string | null;
  youtube_video_id: string | null;
  external_url: string | null;
  materials?: LessonMaterial[];
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: string;     // Decimal as string
  currency: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'archived';
  level: 'beginner' | 'intermediate' | 'advanced';
  language: 'am' | 'en';
  tags: string[];
  estimated_hours: number | null;
  prerequisites: string[];
  learning_objectives: string[];
  total_lessons: number;
  total_materials: number;
  promo_video_id: string | null;
  instructor?: InstructorProfile;
  category?: Category;
  sections?: CourseSection[];
  lessons?: CourseLesson[];
  reviews?: Review[];
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  pct: number;        // 0-100
  watchedS: number;
}

export interface CourseProgress {
  purchaseId: string;
  completionPct: number;
  completedLessons: number;
  totalLessons: number;
  courseCompleted: boolean;
  sections: CourseSection[];
  lessons: CourseLesson[];
  progressMap: Record<string, LessonProgress>;
}

export interface Booking {
  id: string;
  student_id: string;
  instructor_id: string;
  slot_id: string;
  session_type: string;
  price_paid: string | null;
  meeting_link: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  amount: string;
  platform_fee: string;
  currency: string;
  provider: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
}

export interface Payout {
  id: string;
  instructor_id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  method: string;
  paid_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  user?: Pick<User, 'first_name' | 'last_name' | 'image'>;
  course_id: string | null;
  booking_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  instructor_id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
  max_participants: number;
  current_participants: number;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  user_id: string;
  course_id: string;
  pdf_key: string | null;
  downloadUrl?: string;
  issued_at: string;
}

// ── Core Fetch Engine ─────────────────────────────────────────────────────────

// Optional toast callback — set by initApiClient()
let _onError: ((msg: string) => void) | null = null;
let _onSessionExpired: (() => void) | null = null;

/**
 * Call this once at app startup (e.g. in a context or layout)
 * to wire toast notifications into the API client.
 */
export function initApiClient(opts: {
  onError?: (message: string) => void;
  onSessionExpired?: () => void;
}) {
  _onError = opts.onError ?? null;
  _onSessionExpired = opts.onSessionExpired ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers((options.headers as HeadersInit) || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (
    !headers.has('Content-Type') &&
    options.body &&
    typeof options.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr: any) {
    const msg = 'Network error — please check your connection.';
    _onError?.(msg);
    throw new ApiError(msg, 0);
  }

  // ── Silent refresh on 401 ───────────────────────────────────────────────────
  if (res.status === 401 && _retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, false);
    clearTokens();
    _onSessionExpired?.();
    if (typeof window !== 'undefined') {
      const dest = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${dest}`;
    }
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // ── 204 No Content ──────────────────────────────────────────────────────────
  if (res.status === 204) return undefined as T;

  // ── Error responses ─────────────────────────────────────────────────────────
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (Array.isArray(body.message) ? body.message[0] : body.message) ||
      body.error ||
      `HTTP ${res.status}`;
    // Don't toast 401 or auth errors — those are handled above / by redirect
    if (res.status !== 401 && res.status !== 403) {
      _onError?.(message);
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

// ── Courses API ───────────────────────────────────────────────────────────────

export const coursesApi = {
  list: (params?: {
    search?: string;
    category?: string;
    level?: string;
    language?: string;
    page?: number;
    limit?: number;
    sort?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
  }) => {
    const qs = new URLSearchParams();
    if (params?.search)   qs.set('search',   params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.level)    qs.set('level',    params.level);
    if (params?.language) qs.set('language', params.language);
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.sort)     qs.set('sort',     params.sort);
    return apiFetch<PaginatedResponse<Course>>(`/api/courses?${qs}`);
  },

  get: (slug: string) => apiFetch<Course>(`/api/courses/${slug}`),

  create: (data: {
    title: string;
    description?: string;
    price: number;
    category_id?: string;
    level?: string;
    language?: string;
    tags?: string[];
    thumbnail?: string;
  }) => apiFetch<Course>('/api/courses', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Course>) =>
    apiFetch<Course>(`/api/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/courses/${id}`, { method: 'DELETE' }),

  listMine: () => apiFetch<Course[]>('/api/courses/my-courses'),

  checkPurchase: (courseId: string) =>
    apiFetch<{ purchased: boolean; purchaseId?: string }>(
      `/api/courses/${courseId}/check-purchase`
    ),

  getProgress: (courseId: string) =>
    apiFetch<CourseProgress>(`/api/courses/${courseId}/progress`),

  updateProgress: (
    lessonId: string,
    payload: { watchedSeconds: number; totalSeconds: number; purchaseId: string }
  ) =>
    apiFetch<{ completed: boolean; pct: number }>(
      `/api/courses/lessons/${lessonId}/progress`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  getLessonVideoUrl: (lessonId: string) =>
    apiFetch<{ url: string; content_type: string }>(
      `/api/courses/lessons/${lessonId}/video-url`
    ),

  getMaterialDownloadUrl: (materialId: string) =>
    apiFetch<{ url: string; fileName: string }>(
      `/api/courses/materials/${materialId}/download-url`
    ),

  getUploadUrl: (lessonId: string, fileName: string) =>
    apiFetch<{ uploadUrl: string; key: string }>(
      `/api/courses/lessons/${lessonId}/upload-url?filename=${encodeURIComponent(fileName)}`
    ),

  enrollFree: (courseId: string) =>
    apiFetch<{ purchase: object; alreadyEnrolled: boolean }>(
      `/api/courses/${courseId}/enroll-free`,
      { method: 'POST' }
    ),

  categories: () => apiFetch<Category[]>('/api/courses/categories'),

  // Section management
  addSection: (courseId: string, data: { title: string; description?: string; position?: number }) =>
    apiFetch<CourseSection>(`/api/courses/${courseId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSection: (courseId: string, sectionId: string) =>
    apiFetch<void>(`/api/courses/${courseId}/sections/${sectionId}`, {
      method: 'DELETE',
    }),

  // Lesson management
  addLesson: (courseId: string, data: Partial<CourseLesson> & { title: string }) =>
    apiFetch<CourseLesson>(`/api/courses/${courseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLesson: (lessonId: string, data: Partial<CourseLesson>) =>
    apiFetch<CourseLesson>(`/api/courses/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteLesson: (lessonId: string) =>
    apiFetch<void>(`/api/courses/lessons/${lessonId}`, { method: 'DELETE' }),
};

// ── Users / Instructors API ───────────────────────────────────────────────────

export const usersApi = {
  getMe: () =>
    apiFetch<any>('/auth/me').then((r: any) => r?.user ?? r),

  getInstructorProfile: (userId: string) =>
    apiFetch<InstructorProfile>(`/api/users/${userId}/instructor-profile`),

  updateInstructorProfile: (data: Partial<InstructorProfile>) =>
    apiFetch<InstructorProfile>('/api/users/instructor-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listInstructors: (params?: { search?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page)   qs.set('page',   String(params.page));
    return apiFetch<PaginatedResponse<InstructorProfile>>(`/api/users/instructors?${qs}`);
  },

  updateSettings: (data: {
    first_name?: string;
    last_name?: string;
    image?: string;
    language?: string;
    theme?: string;
  }) =>
    apiFetch<User>('/api/users/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Bookings API ──────────────────────────────────────────────────────────────

export const bookingsApi = {
  create: (data: { instructor_id: string; slot_id: string; notes?: string }) =>
    apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMine: () => apiFetch<Booking[]>('/api/bookings/my-bookings'),

  listInstructorBookings: () =>
    apiFetch<Booking[]>('/api/bookings/instructor-bookings'),

  confirm: (bookingId: string, meetingLink: string) =>
    apiFetch<Booking>(`/api/bookings/${bookingId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({ meeting_link: meetingLink }),
    }),

  cancel: (bookingId: string) =>
    apiFetch<Booking>(`/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
    }),

  getSlots: (instructorId: string) =>
    apiFetch<AvailabilitySlot[]>(`/api/bookings/slots/${instructorId}`),

  addSlot: (data: { starts_at: string; ends_at: string }) =>
    apiFetch<AvailabilitySlot>('/api/bookings/slots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSlot: (slotId: string) =>
    apiFetch<void>(`/api/bookings/slots/${slotId}`, { method: 'DELETE' }),
};

// ── Payments API ──────────────────────────────────────────────────────────────

export const paymentsApi = {
  initiateBooking: (bookingId: string) =>
    apiFetch<{ checkoutUrl: string }>('/api/payments/initiate-booking', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),

  initiateCourse: (courseId: string) =>
    apiFetch<{ checkoutUrl: string }>('/api/payments/initiate-course', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    }),

  verify: (txRef: string) => apiFetch<Transaction>(`/api/payments/verify/${txRef}`),

  listTransactions: () => apiFetch<Transaction[]>('/api/payments/my-transactions'),

  requestPayout: (data?: { method?: string; account_details?: string }) =>
    apiFetch<Payout>('/api/payments/request-payout', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  listPayouts: () => apiFetch<Payout[]>('/api/payments/my-payouts'),

  getEarnings: () =>
    apiFetch<{
      available: string;
      pending: string;
      totalEarned: string;
      platformFeeTotal: string;
    }>('/api/payments/earnings'),
};

// ── Certificates API ──────────────────────────────────────────────────────────

export const certificatesApi = {
  claim: (courseId: string) =>
    apiFetch<Certificate>(`/api/certificates/courses/${courseId}`, {
      method: 'POST',
    }),

  getMine: () => apiFetch<Certificate[]>('/api/certificates'),

  verify: (certificateNumber: string) =>
    apiFetch<Certificate>(`/api/certificates/verify/${certificateNumber}`),
};

// ── Admin API ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () =>
    apiFetch<{ users: object; content: object; finance: object }>(
      '/api/admin/stats'
    ),

  listUsers: (params?: { page?: number; role?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)   qs.set('page',   String(params.page));
    if (params?.role)   qs.set('role',   params.role);
    if (params?.search) qs.set('search', params.search);
    return apiFetch<PaginatedResponse<User>>(`/api/admin/users?${qs}`);
  },

  updateUserRole: (userId: string, role: string) =>
    apiFetch<User>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  suspendUser: (userId: string) =>
    apiFetch<User>(`/api/admin/users/${userId}/suspend`, { method: 'PATCH' }),

  pendingKyc: () =>
    apiFetch<InstructorProfile[]>('/api/admin/kyc/pending'),

  updateKyc: (
    profileId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) =>
    apiFetch<InstructorProfile>(`/api/admin/kyc/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  listCourses: (params?: { page?: number; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)   qs.set('page',   String(params.page));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    return apiFetch<PaginatedResponse<Course>>(`/api/admin/courses?${qs}`);
  },

  pendingPayouts: () => apiFetch<Payout[]>('/api/admin/payouts/pending'),

  updatePayout: (
    payoutId: string,
    status: 'paid' | 'failed',
    notes?: string
  ) =>
    apiFetch<Payout>(`/api/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  getTransactions: (params?: { page?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)   qs.set('page',   String(params.page));
    if (params?.status) qs.set('status', params.status);
    return apiFetch<PaginatedResponse<Transaction>>(`/api/admin/transactions?${qs}`);
  },
};

// ── Convenience re-export ─────────────────────────────────────────────────────

export { apiFetch };
