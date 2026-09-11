import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/** Session health flag thresholds (percentage of booked duration that was fulfilled) */
const THRESHOLD_HEALTHY = 0.9; // >= 90%  → no flag, auto-payout after 24h
const THRESHOLD_SHORT = 0.7; // 70–90%  → short_session, auto-payout after 48h
// < 70%   → early_end, hold for admin review

export type SessionFlag =
  'short_session' | 'early_end' | 'no_start' | 'unmonitored' | null;

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Zoom event handlers (called from ZoomWebhookController)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Called when Zoom fires `meeting.started` */
  async onZoomSessionStarted(
    meetingId: string,
    startedAt: Date,
  ): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { platform: 'zoom', platform_meeting_id: meetingId },
    });

    if (!booking) {
      this.logger.warn(
        `Zoom meeting.started — no booking found for meeting ID ${meetingId}`,
      );
      return;
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { session_started_at: startedAt, session_flag: null },
    });

    await this.prisma.sessionEvent.create({
      data: {
        booking_id: booking.id,
        platform: 'zoom',
        event_type: 'session.started',
        platform_event_id: meetingId,
        payload: { meetingId, startedAt },
        occurred_at: startedAt,
      },
    });

    this.logger.log(`Session started: booking=${booking.id} zoom=${meetingId}`);
  }

  /** Called when Zoom fires `meeting.ended` */
  async onZoomSessionEnded(meetingId: string, endedAt: Date): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { platform: 'zoom', platform_meeting_id: meetingId },
      include: { slot: true },
    });

    if (!booking) {
      this.logger.warn(
        `Zoom meeting.ended — no booking found for meeting ID ${meetingId}`,
      );
      return;
    }

    await this.prisma.sessionEvent.create({
      data: {
        booking_id: booking.id,
        platform: 'zoom',
        event_type: 'session.ended',
        platform_event_id: meetingId,
        payload: { meetingId, endedAt },
        occurred_at: endedAt,
      },
    });

    await this.finaliseSession(
      booking.id,
      booking.session_started_at,
      endedAt,
      booking.slot,
    );
  }

  /** Called when Zoom fires `meeting.participant_joined` or `meeting.participant_left` */
  async onParticipantEvent(
    meetingId: string,
    eventKind: 'joined' | 'left',
    participantCount: number,
    rawPayload: any,
  ): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { platform: 'zoom', platform_meeting_id: meetingId },
    });

    if (!booking) return; // silently ignore

    await this.prisma.sessionEvent.create({
      data: {
        booking_id: booking.id,
        platform: 'zoom',
        event_type: `participant.${eventKind}`,
        platform_event_id: meetingId,
        payload: rawPayload,
        participant_count: participantCount,
        occurred_at: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Google event handlers (called from GoogleWebhookController)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Called when Google Calendar fires a push notification for a watched event */
  async onGoogleCalendarUpdate(
    bookingId: string,
    meetCode: string,
    _rawPayload: any,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return;

    // If we haven't recorded a start yet, treat this calendar update as session start signal
    if (!booking.session_started_at) {
      const now = new Date();
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { session_started_at: now, platform_meeting_id: meetCode },
      });

      await this.prisma.sessionEvent.create({
        data: {
          booking_id: bookingId,
          platform: 'google',
          event_type: 'session.started',
          platform_event_id: meetCode,
          payload: { meetCode },
          occurred_at: now,
        },
      });

      this.logger.log(
        `Google Meet session started: booking=${bookingId} meetCode=${meetCode}`,
      );
    }
  }

  /**
   * Called by BullMQ polling job ~15 minutes after session end time.
   * Fetches Meet activity report to determine actual session duration.
   */
  async onGoogleSessionPolled(
    bookingId: string,
    actualStartedAt: Date | null,
    actualEndedAt: Date | null,
    participantCount: number,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) return;

    if (actualEndedAt) {
      await this.prisma.sessionEvent.create({
        data: {
          booking_id: bookingId,
          platform: 'google',
          event_type: 'session.ended',
          platform_event_id: booking.platform_meeting_id ?? undefined,
          payload: { actualStartedAt, actualEndedAt, participantCount },
          participant_count: participantCount,
          occurred_at: actualEndedAt,
        },
      });

      const startedAt = actualStartedAt ?? booking.session_started_at;
      await this.finaliseSession(
        bookingId,
        startedAt,
        actualEndedAt,
        booking.slot,
      );
    } else {
      // Session never confirmed by Google — check if started manually
      if (!booking.session_started_at) {
        await this.flagBooking(bookingId, 'no_start');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core session health logic
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Computes session health and applies the appropriate flag.
   * Called after both Zoom ended event and Google poll result.
   */
  private async finaliseSession(
    bookingId: string,
    startedAt: Date | null,
    endedAt: Date,
    slot: { starts_at: Date; ends_at: Date } | null,
  ): Promise<void> {
    const actualDurationMs = startedAt
      ? endedAt.getTime() - startedAt.getTime()
      : 0;
    const actualDurationM = Math.round(actualDurationMs / 60000);

    let bookedDurationM = 0;
    if (slot) {
      bookedDurationM = Math.round(
        (slot.ends_at.getTime() - slot.starts_at.getTime()) / 60000,
      );
    }

    // Compute health ratio
    const ratio = bookedDurationM > 0 ? actualDurationM / bookedDurationM : 1;
    const flag = this.computeFlag(ratio, startedAt !== null);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        session_ended_at: endedAt,
        session_started_at: startedAt ?? undefined,
        session_duration_m: actualDurationM,
        session_flag: flag,
      },
    });

    if (flag && flag !== 'short_session') {
      // Notify admin for flags that need review
      await this.notifyAdminFlag(
        bookingId,
        flag,
        actualDurationM,
        bookedDurationM,
      );
    }

    this.logger.log(
      `Session finalised: booking=${bookingId} actual=${actualDurationM}m booked=${bookedDurationM}m flag=${flag ?? 'none'}`,
    );
  }

  private computeFlag(ratio: number, sessionStarted: boolean): SessionFlag {
    if (!sessionStarted) return 'no_start';
    if (ratio >= THRESHOLD_HEALTHY) return null;
    if (ratio >= THRESHOLD_SHORT) return 'short_session';
    return 'early_end';
  }

  /** Directly apply a flag to a booking (used for no_start, unmonitored) */
  async flagBooking(bookingId: string, flag: SessionFlag): Promise<void> {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { session_flag: flag },
    });
    if (flag && flag !== 'short_session') {
      await this.notifyAdminFlag(bookingId, flag, 0, 0);
    }
  }

  /**
   * Gate payout release — called by BookingsService before releasing instructor payout.
   * Returns true if payout should be blocked (flag requires admin review).
   */
  async gatePayoutRelease(
    bookingId: string,
  ): Promise<{ blocked: boolean; reason: string | null }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { session_flag: true, platform: true },
    });

    if (!booking) return { blocked: false, reason: null };

    const flag = booking.session_flag as SessionFlag;

    // Unmonitored fallback to existing student-confirmation flow — don't block
    if (!flag || flag === 'unmonitored' || flag === 'short_session') {
      return { blocked: false, reason: null };
    }

    // early_end and no_start require admin review before payout
    return { blocked: true, reason: flag };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin helpers
  // ─────────────────────────────────────────────────────────────────────────────

  async getAllMonitoredSessions(filters: {
    flag?: string;
    platform?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { flag, platform, fromDate, toDate, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (flag) where.session_flag = flag;
    if (platform) where.platform = platform;
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }

    const [total, sessions] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          status: true,
          platform: true,
          platform_meeting_id: true,
          session_started_at: true,
          session_ended_at: true,
          session_duration_m: true,
          session_flag: true,
          slot: { select: { starts_at: true, ends_at: true } },
          student: {
            select: { first_name: true, last_name: true, email: true },
          },
          instructor: {
            select: {
              user: {
                select: { first_name: true, last_name: true, email: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, sessions };
  }

  async getSessionDetail(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        sessionEvents: { orderBy: { occurred_at: 'asc' } },
        slot: true,
        student: { select: { first_name: true, last_name: true, email: true } },
        instructor: {
          select: {
            user: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getInstructorStats(instructorProfileId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { instructor_id: instructorProfileId, platform: { not: null } },
      select: {
        session_flag: true,
        session_duration_m: true,
        status: true,
        slot: true,
      },
    });

    const total = bookings.length;
    const healthy = bookings.filter((b) => !b.session_flag).length;
    const flagged = bookings.filter(
      (b) => b.session_flag && b.session_flag !== 'unmonitored',
    ).length;
    const avgDuration =
      total > 0
        ? bookings.reduce((sum, b) => sum + (b.session_duration_m ?? 0), 0) /
          total
        : 0;

    return {
      total,
      healthy,
      flagged,
      reliabilityRate: total > 0 ? Math.round((healthy / total) * 100) : 100,
      avgDurationMinutes: Math.round(avgDuration),
    };
  }

  async clearFlag(bookingId: string): Promise<void> {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { session_flag: null },
    });
    this.logger.log(`Admin cleared session flag for booking ${bookingId}`);
  }

  async getPlatformStats() {
    const [total, byFlag, byPlatform] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: { platform: { not: null } } }),
      this.prisma.booking.groupBy({
        by: ['session_flag'],
        _count: { _all: true },
        orderBy: { session_flag: 'asc' },
      }),
      this.prisma.booking.groupBy({
        by: ['platform'],
        _count: { _all: true },
        where: { platform: { not: null } },
        orderBy: { platform: 'asc' },
      }),
    ]);

    return { total, byFlag, byPlatform };
  }

  private async notifyAdminFlag(
    bookingId: string,
    flag: string,
    actualMin: number,
    bookedMin: number,
  ) {
    // Reuse the notifications service — add a new method or repurpose an existing one
    // For now, we log. When NotificationsService grows, wire in an admin email alert.
    this.logger.warn(
      `[ADMIN ALERT] Booking ${bookingId} flagged as "${flag}". Actual: ${actualMin}m / Booked: ${bookedMin}m`,
    );
  }
}
