import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import {
  QUEUE_NOTIFICATIONS,
  JOB_EMAIL,
  JOB_SMS,
  JOB_BOOKING_NEW,
  JOB_BOOKING_CONFIRMED,
  JOB_BOOKING_REMINDER_24H,
  JOB_BOOKING_REMINDER_1H,
  JOB_PAYMENT_RECEIVED,
  JOB_PAYOUT_PROCESSED,
} from './queue.constants';

/**
 * NotificationsProcessor — BullMQ worker that consumes the `notifications` queue.
 *
 * All jobs dispatched via the notifications queue land here.
 * Each job name maps to a specific NotificationsService method.
 * Failures are automatically retried 3× with exponential backoff (configured in QueueModule).
 */
@Processor(QUEUE_NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job [${job.name}] id=${job.id}`);

    try {
      switch (job.name) {
        // ── Raw email/SMS ────────────────────────────────────────────────────
        case JOB_EMAIL: {
          const { to, subject, html } = job.data;
          await this.notifications.sendEmail(to, subject, html);
          break;
        }

        case JOB_SMS: {
          const { phone, message } = job.data;
          await this.notifications.sendSms(phone, message);
          break;
        }

        // ── Booking lifecycle ────────────────────────────────────────────────
        case JOB_BOOKING_NEW: {
          const { instructorEmail, bookingId, studentName } = job.data;
          await this.notifications.notifyInstructorNewBooking(
            instructorEmail,
            bookingId,
            studentName,
          );
          break;
        }

        case JOB_BOOKING_CONFIRMED: {
          const { studentEmail, meetingLink, slotTime, studentPhone } = job.data;
          await this.notifications.notifyStudentBookingConfirmed(
            studentEmail,
            meetingLink,
            slotTime,
            studentPhone,
          );
          break;
        }

        case JOB_BOOKING_REMINDER_24H: {
          const { email, meetingLink, phone } = job.data;
          await this.notifications.notifySessionReminder(
            email,
            meetingLink,
            'in 24 hours',
            phone,
          );
          break;
        }

        case JOB_BOOKING_REMINDER_1H: {
          const { email, meetingLink, phone } = job.data;
          await this.notifications.notifySessionReminder(
            email,
            meetingLink,
            'in 1 hour',
            phone,
          );
          break;
        }

        // ── Payments ────────────────────────────────────────────────────────
        case JOB_PAYMENT_RECEIVED: {
          const { email, amount, currency, itemTitle, phone } = job.data;
          await this.notifications.notifyPaymentReceived(
            email,
            amount,
            currency,
            itemTitle,
            phone,
          );
          break;
        }

        case JOB_PAYOUT_PROCESSED: {
          const { email, amount, currency, phone } = job.data;
          await this.notifications.notifyInstructorPayout(email, amount, currency, phone);
          break;
        }

        default:
          this.logger.warn(`Unknown notification job type: ${job.name} — skipping`);
      }

      this.logger.log(`Job [${job.name}] id=${job.id} completed`);
    } catch (err: any) {
      this.logger.error(`Job [${job.name}] id=${job.id} failed: ${err.message}`, err.stack);
      throw err; // Re-throw so BullMQ retries (up to 3 attempts with exponential backoff)
    }
  }
}
