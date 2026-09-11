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
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  /** Instructor: create available time slots */
  async createSlot(
    instructorUserId: string,
    dto: { starts_at: string; ends_at: string },
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile || !profile.is_active)
      throw new ForbiddenException('Instructor not active');
    return this.prisma.availabilitySlot.create({
      data: {
        instructor_id: profile.id,
        starts_at: new Date(dto.starts_at),
        ends_at: new Date(dto.ends_at),
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

  /** Student: Request a booking — payment must be linked separately via Chapa */
  async requestBooking(
    studentId: string,
    slotId: string,
    sessionType: string = '1-on-1',
    notes?: string,
  ) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: { instructor: { include: { user: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    const type = ['1-on-1', '1-on-many', 'group-class'].includes(sessionType)
      ? sessionType
      : '1-on-1';

    let multiplier = 1.0;
    let maxParticipants = 1;

    if (type === '1-on-many') {
      multiplier = 0.6;
      maxParticipants = 5;
    } else if (type === 'group-class') {
      multiplier = 0.4;
      maxParticipants = 20;
    }

    const currentCap = (slot as any).current_participants || 0;
    const maxCap = Math.max((slot as any).max_participants || 1, maxParticipants);

    if (slot.is_booked || currentCap >= maxCap) {
      throw new BadRequestException('Slot is fully booked');
    }

    const baseRate = Number(slot.instructor?.hourly_rate || 500);
    const pricePaid = +(baseRate * multiplier).toFixed(2);
    const isNowFull = currentCap + 1 >= maxCap;

    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          student_id: studentId,
          instructor_id: slot.instructor_id,
          slot_id: slotId,
          session_type: type,
          price_paid: pricePaid,
          status: 'pending',
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

    // Add job to BullMQ queue for async processing & retry capability
    try {
      const student = await this.prisma.user.findUnique({ where: { id: studentId } });
      await this.notificationsQueue.add(JOB_BOOKING_NEW, {
        instructorEmail: slot.instructor.user.email,
        bookingId: booking.id,
        studentName: student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'Student',
      });
    } catch {
      await this.notifications.notifyInstructorNewBooking(
        slot.instructor.user.email,
        booking.id,
      );
    }

    return booking;
  }

  /** Instructor: confirm and add meeting link */
  async confirmBooking(
    bookingId: string,
    instructorUserId: string,
    meetingLink: string,
  ) {
    if (!ZOOM_MEET_PATTERN.test(meetingLink)) {
      throw new BadRequestException(
        'Meeting link must be a valid Zoom or Google Meet URL',
      );
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true, student: true, slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.instructor.user_id !== instructorUserId)
      throw new ForbiddenException();

    // Detect platform and extract meeting ID for monitoring
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

    const slotTime = booking.slot?.starts_at ? new Date(booking.slot.starts_at).toLocaleString() : undefined;

    // Queue confirmation notification and reminder jobs
    try {
      await this.notificationsQueue.add(JOB_BOOKING_CONFIRMED, {
        studentEmail: booking.student.email,
        meetingLink,
        slotTime,
        studentPhone: (booking.student as any).phone || undefined,
      });

      // Schedule delayed reminders if slot time is in the future
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

  /** Called by a cron/manual trigger after session time — gates payout before completing */
  async completeBooking(bookingId: string) {
    const { blocked } = await this.monitorService.gatePayoutRelease(bookingId);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
    });
  }

  /** Mark as no-show — triggers refund flow */
  async markNoShow(bookingId: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'no_show' },
    });
  }

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
