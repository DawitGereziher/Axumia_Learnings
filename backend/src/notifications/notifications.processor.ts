import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import {
  QUEUE_NOTIFICATIONS,
  JOB_BOOKING_NEW,
  JOB_BOOKING_CONFIRMED,
  JOB_BOOKING_REMINDER_24H,
  JOB_BOOKING_REMINDER_1H,
  JOB_PAYMENT_RECEIVED,
  JOB_PAYOUT_PROCESSED,
  JOB_EMAIL,
  JOB_SMS,
} from '../queue/queue.constants';

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing notification job: ${job.name} [id=${job.id}]`);

    switch (job.name) {
      case JOB_BOOKING_NEW: {
        const { instructorEmail, bookingId, studentName } = job.data;
        await this.notificationsService.notifyInstructorNewBooking(
          instructorEmail,
          bookingId,
          studentName,
        );
        break;
      }

      case JOB_BOOKING_CONFIRMED: {
        const { studentEmail, meetingLink, slotTime, studentPhone } = job.data;
        await this.notificationsService.notifyStudentBookingConfirmed(
          studentEmail,
          meetingLink,
          slotTime,
          studentPhone,
        );
        break;
      }

      case JOB_BOOKING_REMINDER_24H: {
        const { email, meetingLink, phone } = job.data;
        await this.notificationsService.notifySessionReminder(
          email,
          meetingLink,
          'in 24 hours',
          phone,
        );
        break;
      }

      case JOB_BOOKING_REMINDER_1H: {
        const { email, meetingLink, phone } = job.data;
        await this.notificationsService.notifySessionReminder(
          email,
          meetingLink,
          'in 1 hour',
          phone,
        );
        break;
      }

      case JOB_PAYMENT_RECEIVED: {
        const { email, amount, currency, itemTitle, phone } = job.data;
        await this.notificationsService.notifyPaymentReceived(
          email,
          amount,
          currency || 'ETB',
          itemTitle,
          phone,
        );
        break;
      }

      case JOB_PAYOUT_PROCESSED: {
        const { email, amount, currency, phone } = job.data;
        await this.notificationsService.notifyInstructorPayout(
          email,
          amount,
          currency || 'ETB',
          phone,
        );
        break;
      }

      case JOB_EMAIL: {
        const { to, subject, html } = job.data;
        await this.notificationsService.sendEmail(to, subject, html);
        break;
      }

      case JOB_SMS: {
        const { phone, message } = job.data;
        await this.notificationsService.sendSms(phone, message);
        break;
      }

      default:
        this.logger.warn(`Unknown job type in notifications queue: ${job.name}`);
    }
  }
}
