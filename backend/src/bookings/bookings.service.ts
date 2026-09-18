import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MonitorService } from '../session-monitoring/monitor/monitor.service';
import { PaymentsService } from '../payments/payments.service';
import {
  detectPlatform,
  extractZoomMeetingId,
  extractGoogleMeetCode,
} from '../session-monitoring/oauth/oauth.service';
import {
  QUEUE_NOTIFICATIONS,
  JOB_BOOKING_NEW,
  JOB_BOOKING_CONFIRMED,
  JOB_BOOKING_REMINDER_24H,
  JOB_BOOKING_REMINDER_1H,
} from '../queue/queue.constants';

const ZOOM_MEET_PATTERN = /^https:\/\/(zoom\.us\/j\/|meet\.google\.com\/)/;

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private monitorService: MonitorService,
    private payments: PaymentsService,
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  // ── Slot management ──────────────────────────────────────────────────────────

  async createSlot(instructorUserId: string, dto: { starts_at: string; ends_at: string }) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile || !profile.is_active) throw new ForbiddenException('Instructor not active');

    const starts = new Date(dto.starts_at);
    const ends = new Date(dto.ends_at);
    if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
      throw new BadRequestException('Invalid date format for starts_at or ends_at');
    }
    if (ends <= starts) {
      throw new BadRequestException('ends_at must be after starts_at');
    }
    if (starts <= new Date()) {
      throw new BadRequestException('Slot must be in the future');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        instructor_id: profile.id,
        starts_at: starts,
        ends_at: ends,
      },
    });
  }

  async getInstructorSlots(instructorProfileId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        instructor_id: instructorProfileId,
        is_booked: false,
        starts_at: { gt: new Date() },
      },
      orderBy: { starts_at: 'asc' },
    });
  }

  // ── Student: Request a booking + immediately initiate payment ─────────────────

  /**
   * requestBooking — creates booking in status 'awaiting_payment' and
   * atomically initiates Chapa checkout. The booking only becomes 'pending'
   * (notifying the instructor) when the Chapa webhook fires.
   * This prevents ghost bookings from students who never pay.
   */
  async requestBooking(
    studentId: string,
    slotId: string,
    sessionType: string = '1-on-1',
    notes?: string,
    userEmail?: string,
    userName?: string,
  ): Promise<{ booking: any; checkoutUrl: string; txRef: string }> {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: { instructor: { include: { user: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    // Prevent self-booking
    if (slot.instructor.user_id === studentId) {
      throw new ForbiddenException('You cannot book your own slot');
    }

    const type = ['1-on-1', '1-on-many', 'group-class'].includes(sessionType)
      ? sessionType
      : '1-on-1';

    let multiplier = 1.0;
    let maxParticipants = 1;
    if (type === '1-on-many') { multiplier = 0.6; maxParticipants = 5; }
    else if (type === 'group-class') { multiplier = 0.4; maxParticipants = 20; }

    const currentCap = (slot as any).current_participants || 0;
    const maxCap = Math.max((slot as any).max_participants || 1, maxParticipants);
    if (slot.is_booked || currentCap >= maxCap) {
      throw new BadRequestException('Slot is fully booked');
    }

    const baseRate = Number(slot.instructor?.hourly_rate || 500);
    const pricePaid = +(baseRate * multiplier).toFixed(2);
    const isNowFull = currentCap + 1 >= maxCap;

    // Create booking as 'awaiting_payment' — instructor is NOT notified yet
    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          student_id: studentId,
          instructor_id: slot.instructor_id,
          slot_id: slotId,
          session_type: type,
          price_paid: pricePaid,
          status: 'awaiting_payment', // ← only becomes 'pending' after webhook
          notes: notes || null,
        },
      }),
      this.prisma.availabilitySlot.update({
        where: { id: slotId },
        data: {
          current_participants: { increment: 1 },
          max_participants: maxCap,
          is_booked: isNowFull,
        },
      }),
    ]);

    // Immediately initiate payment — student must pay to confirm reservation
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    const email = userEmail || student?.email || '';
    const name = userName ||
      `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
      'Student';

    const { checkoutUrl, txRef } = await this.payments.initiateBookingPayment(
      studentId,
      booking.id,
      email,
      name,
    );

    return { booking, checkoutUrl, txRef };
  }

  // ── Booking lifecycle ─────────────────────────────────────────────────────────

  /**
   * Called internally by the Chapa webhook (via PaymentsService) when
   * booking payment is confirmed — transitions to 'pending' and notifies instructor.
   */
  async onBookingPaymentConfirmed(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: { include: { user: true } }, student: true },
    });
    if (!booking) return;
    if (booking.status !== 'awaiting_payment') return; // idempotent

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'pending' },
    });

    // Now notify instructor — they know student has paid
    try {
      const student = booking.student;
      await this.notificationsQueue.add(JOB_BOOKING_NEW, {
        instructorEmail: booking.instructor.user.email,
        bookingId: booking.id,
        studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student',
      });
    } catch {
      await this.notifications.notifyInstructorNewBooking(
        booking.instructor.user.email,
        booking.id,
      );
    }
  }

  /** Instructor: confirm booking and add meeting link */
  async confirmBooking(bookingId: string, instructorUserId: string, meetingLink: string) {
    if (!ZOOM_MEET_PATTERN.test(meetingLink)) {
      throw new BadRequestException('Meeting link must be a valid Zoom or Google Meet URL');
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true, student: true, slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.instructor.user_id !== instructorUserId) throw new ForbiddenException();
    if (booking.status !== 'pending') {
      throw new BadRequestException(`Cannot confirm a booking in status '${booking.status}'`);
    }

    const platform = detectPlatform(meetingLink);
    const platformMeetingId =
      platform === 'zoom'
        ? extractZoomMeetingId(meetingLink)
        : extractGoogleMeetCode(meetingLink);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        meeting_link: meetingLink,
        status: 'confirmed',
        platform: platform ?? undefined,
        platform_meeting_id: platformMeetingId ?? undefined,
      },
    });

    const slotTime = booking.slot?.starts_at
      ? new Date(booking.slot.starts_at).toLocaleString()
      : undefined;

    try {
      await this.notificationsQueue.add(JOB_BOOKING_CONFIRMED, {
        studentEmail: booking.student.email,
        meetingLink,
        slotTime,
        studentPhone: (booking.student as any).phone || undefined,
      });

      if (booking.slot?.starts_at) {
        const sessionTime = new Date(booking.slot.starts_at).getTime();
        const now = Date.now();
        const delay24h = sessionTime - 24 * 60 * 60 * 1000 - now;
        if (delay24h > 0) {
          await this.notificationsQueue.add(
            JOB_BOOKING_REMINDER_24H,
            { email: booking.student.email, meetingLink, phone: (booking.student as any).phone },
            { delay: delay24h },
          );
        }
        const delay1h = sessionTime - 60 * 60 * 1000 - now;
        if (delay1h > 0) {
          await this.notificationsQueue.add(
            JOB_BOOKING_REMINDER_1H,
            { email: booking.student.email, meetingLink, phone: (booking.student as any).phone },
            { delay: delay1h },
          );
        }
      }
    } catch {
      await this.notifications.notifyStudentBookingConfirmed(
        booking.student.email,
        meetingLink,
        slotTime,
      );
    }

    return updated;
  }

  /** Instructor: reject a booking request (refund triggered) */
  async rejectBooking(bookingId: string, instructorUserId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true, slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.instructor.user_id !== instructorUserId) throw new ForbiddenException();
    if (!['pending'].includes(booking.status)) {
      throw new BadRequestException(`Cannot reject a booking in status '${booking.status}'`);
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled', notes: reason ? `Rejected: ${reason}` : booking.notes },
      }),
      // Free up the slot
      this.prisma.availabilitySlot.update({
        where: { id: booking.slot_id },
        data: {
          current_participants: { decrement: 1 },
          is_booked: false,
        },
      }),
    ]);

    return { message: 'Booking rejected. Refund will be processed.' };
  }

  /** Student: cancel a booking (pre-confirmation only) */
  async cancelBooking(bookingId: string, studentId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.student_id !== studentId) throw new ForbiddenException('Not your booking');
    if (!['awaiting_payment', 'pending'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking in status '${booking.status}'. Contact support for confirmed bookings.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled' },
      }),
      this.prisma.availabilitySlot.update({
        where: { id: booking.slot_id },
        data: {
          current_participants: { decrement: 1 },
          is_booked: false,
        },
      }),
    ]);

    return { message: 'Booking cancelled. If payment was made, a refund will be processed.' };
  }

  /** Admin/cron: complete booking after session time passes, gates payout */
  async completeBooking(bookingId: string, adminOrSystemCall = false) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Booking must be 'confirmed' to complete. Current: '${booking.status}'`);
    }

    const { blocked } = await this.monitorService.gatePayoutRelease(bookingId);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
    });

    return { ...updated, payoutBlocked: blocked };
  }

  /** Admin: mark booking as no-show */
  async markNoShow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'no_show' },
    });
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async getStudentBookings(studentId: string) {
    return this.prisma.booking.findMany({
      where: { student_id: studentId },
      include: { instructor: { include: { user: true } }, slot: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getInstructorBookings(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    return this.prisma.booking.findMany({
      where: { instructor_id: profile.id },
      include: { student: true, slot: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
