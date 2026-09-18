// ─────────────────────────────────────────────────────────────────────────────
// Central enums — single source of truth for all status/type string literals
// ─────────────────────────────────────────────────────────────────────────────

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum KycStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum MaterialType {
  PDF = 'pdf',
  DOCUMENT = 'document',
  LINK = 'link',
  ZIP = 'zip',
  IMAGE = 'image',
  OTHER = 'other',
}

export enum PriceRange {
  FREE = 'free',
  UNDER_500 = 'under500',
  BETWEEN_500_2000 = '500to2000',
  OVER_2000 = 'over2000',
}

export enum SortOrder {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  POPULAR = 'popular',
}
