// BullMQ queue name constants — import these wherever you dispatch jobs

export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_TRANSCODING = 'transcoding';
export const QUEUE_PAYOUTS = 'payouts';

// Job type names within the notifications queue
export const JOB_EMAIL = 'send_email';
export const JOB_SMS = 'send_sms';
export const JOB_BOOKING_NEW = 'booking_new';
export const JOB_BOOKING_CONFIRMED = 'booking_confirmed';
export const JOB_BOOKING_REMINDER_24H = 'booking_reminder_24h';
export const JOB_BOOKING_REMINDER_1H = 'booking_reminder_1h';
export const JOB_PAYMENT_RECEIVED = 'payment_received';
export const JOB_PAYOUT_PROCESSED = 'payout_processed';
