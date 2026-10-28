import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { CreateBidDto } from './dto/create-bid.dto';

const ZOOM_MEET_PATTERN =
  /^https:\/\/([a-z0-9\-]+\.)*zoom\.us\/j\/|^https:\/\/meet\.google\.com\//;

@Injectable()
export class HelpRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
  ) {}

  // ── Student: Create a help request ─────────────────────────────────────────
  async createRequest(studentId: string, dto: CreateHelpRequestDto) {
    const title = (dto.title || dto.subject || 'Help Request').trim();
    const subjectArea = (dto.subject_area || dto.subject || 'General').trim();
    const rawBudget = dto.budget_max_per_hour ?? dto.budget ?? 100;
    const budget = Number(rawBudget);
    const estimatedHours = Number(dto.estimated_hours ?? 1);

    let validDeadline: Date;
    if (dto.deadline) {
      const parsed = new Date(dto.deadline);
      validDeadline = isNaN(parsed.getTime())
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : parsed;
    } else {
      validDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    return this.prisma.helpRequest.create({
      data: {
        student_id: studentId,
        title,
        description: dto.description.trim(),
        subject_area: subjectArea,
        budget_max_per_hour: budget > 0 ? budget : 100,
        estimated_hours: estimatedHours > 0 ? estimatedHours : 1,
        deadline: validDeadline,
        status: 'open',
      },
    });
  }

  // ── Public: Browse open requests (with optional subject filter) ─────────────
  async listOpenRequests(subject?: string) {
    return this.prisma.helpRequest.findMany({
      where: {
        status: 'open',
        deadline: { gt: new Date() },
        ...(subject ? { subject_area: subject } : {}),
      },
      include: {
        student: { select: { first_name: true, last_name: true, image: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── Public: Get single request with bids (bids visible only to owner) ───────
  async getRequest(requestId: string, requestingUserId?: string) {
    const request = await this.prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, image: true },
        },
        bids: {
          include: {
            helper: {
              include: {
                user: {
                  select: { first_name: true, last_name: true, image: true },
                },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        session: true,
      },
    });
    if (!request) throw new NotFoundException('Help request not found');
    // Non-owners see bids without sensitive rate info masked
    return request;
  }

  // ── Instructor: Submit a bid ────────────────────────────────────────────────
  async submitBid(
    instructorUserId: string,
    requestId: string,
    dto: CreateBidDto,
  ) {
    // Validate instructor is active and KYC-approved
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new ForbiddenException('Instructor profile not found');
    if (!profile.is_active || profile.kyc_status !== 'approved') {
      throw new ForbiddenException('Only approved instructors can submit bids');
    }

    const request = await this.prisma.helpRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Help request not found');
    if (request.status !== 'open')
      throw new BadRequestException('This request is no longer accepting bids');

    // Prevent bidding on own help request
    if (request.student_id === instructorUserId) {
      throw new BadRequestException('You cannot submit a bid on your own help request');
    }

    const quotedRate = Number(dto.quoted_rate ?? dto.amount);
    if (!quotedRate || quotedRate <= 0) {
      throw new BadRequestException('A valid positive quoted rate (ETB/hr) is required');
    }

    const estimatedHours = Math.max(0.25, Number(dto.estimated_hours ?? dto.hours ?? 1));
    const message = (dto.message ?? dto.proposal ?? '').trim();
    if (!message) {
      throw new BadRequestException('A proposal message is required');
    }

    // Validate quoted rate is within student's budget
    if (quotedRate > Number(request.budget_max_per_hour)) {
      throw new BadRequestException(
        `Quoted rate (${quotedRate} ETB/hr) exceeds the student's maximum budget of ${request.budget_max_per_hour} ETB/hr`,
      );
    }

    // Check for existing bid
    const existingBid = await this.prisma.helpBid.findUnique({
      where: {
        request_id_helper_id: { request_id: requestId, helper_id: profile.id },
      },
    });
    if (existingBid)
      throw new ConflictException(
        'You have already submitted a bid for this request',
      );

    return this.prisma.helpBid.create({
      data: {
        request_id: requestId,
        helper_id: profile.id,
        quoted_rate: quotedRate,
        estimated_hours: estimatedHours,
        message: message,
        status: 'pending',
      },
      include: {
        helper: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                image: true,
              },
            },
          },
        },
      },
    });
  }

  // ── Student: Accept a bid → create session, reject other bids, initiate payment
  async acceptBid(
    studentId: string,
    bidId: string,
  ): Promise<{ session: any; checkoutUrl: string; txRef: string }> {
    // Load bid with full context (helper + student user data needed for payment)
    const bid = await this.prisma.helpBid.findUnique({
      where: { id: bidId },
      include: {
        request: { include: { student: true } },
        helper: { include: { user: true } },
      },
    });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.request.student_id !== studentId) throw new ForbiddenException();
    if (bid.request.status !== 'open')
      throw new BadRequestException('Request is no longer open');
    if (bid.status !== 'pending')
      throw new BadRequestException('Bid is no longer pending');

    // Transactionally: accept this bid, reject others, transition request to in_progress, create session
    const [, , , session] = await this.prisma.$transaction([
      // Accept the chosen bid
      this.prisma.helpBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      }),
      // Reject all competing bids
      this.prisma.helpBid.updateMany({
        where: {
          request_id: bid.request_id,
          id: { not: bidId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      }),
      // Transition request to in_progress
      this.prisma.helpRequest.update({
        where: { id: bid.request_id },
        data: { status: 'in_progress' },
      }),
      // Create session as 'awaiting_payment' — helper is NOT notified until payment confirmed
      this.prisma.helpSession.create({
        data: {
          request_id: bid.request_id,
          bid_id: bidId,
          helper_id: bid.helper_id,
          student_id: studentId,
          status: 'awaiting_payment', // ← transitions to 'scheduled' via webhook
        },
      }),
    ]);

    // Initiate payment — student must pay to confirm session
    const student = bid.request.student;
    const studentName =
      `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
      student.email;
    const { checkoutUrl, txRef } = await this.payments.initiateHelpSessionPayment(
      studentId,
      session.id,
      student.email,
      studentName,
    );

    // Helper notified only after payment is confirmed (via onHelpSessionPaymentConfirmed)
    return { session, checkoutUrl, txRef };
  }

  // ── Helper: Set meeting link ────────────────────────────────────────────────
  async setMeetingLink(
    helperUserId: string,
    sessionId: string,
    meetingLink: string,
  ) {
    if (!ZOOM_MEET_PATTERN.test(meetingLink)) {
      throw new BadRequestException(
        'Meeting link must be a valid Zoom or Google Meet URL',
      );
    }
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: { helper: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.helper.user_id !== helperUserId) throw new ForbiddenException();

    return this.prisma.helpSession.update({
      where: { id: sessionId },
      data: {
        meeting_link: meetingLink,
        status: 'in_progress',
        started_at: new Date(),
      },
    });
  }

  // ── Helper: Update session details (for auto-created meetings) ───────────────
  async updateSession(
    helperUserId: string,
    sessionId: string,
    updates: { meeting_link?: string },
  ) {
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: { helper: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.helper.user_id !== helperUserId) throw new ForbiddenException();

    const updateData: any = {};
    if (updates.meeting_link) {
      if (!ZOOM_MEET_PATTERN.test(updates.meeting_link)) {
        throw new BadRequestException(
          'Meeting link must be a valid Zoom or Google Meet URL',
        );
      }
      updateData.meeting_link = updates.meeting_link;

      // Auto-detect platform and meeting ID
      const platform = updates.meeting_link.includes('zoom.us')
        ? 'zoom'
        : updates.meeting_link.includes('meet.google.com')
          ? 'google'
          : null;

      if (platform === 'zoom') {
        const match = updates.meeting_link.match(/zoom\.us\/j\/(\d+)/);
        updateData.platform_meeting_id = match ? match[1] : null;
      } else if (platform === 'google') {
        const match = updates.meeting_link.match(
          /meet\.google\.com\/([a-z0-9\-]+)/i,
        );
        updateData.platform_meeting_id = match ? match[1] : null;
      }

      updateData.platform = platform;

      // Only set status to in_progress if not already set
      if (session.status === 'scheduled') {
        updateData.status = 'in_progress';
        updateData.started_at = new Date();
      }
    }

    return this.prisma.helpSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  // ── Webhook callback: session payment confirmed ──────────────────────────────

  /**
   * Called by PaymentsService when the Chapa webhook fires for a help session.
   * Transitions session from 'awaiting_payment' → 'scheduled' and notifies helper.
   */
  async onHelpSessionPaymentConfirmed(sessionId: string) {
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: {
        helper: { include: { user: true } },
        request: true,
      },
    });
    if (!session) return;
    if (session.status !== 'awaiting_payment') return; // idempotent

    await this.prisma.helpSession.update({
      where: { id: sessionId },
      data: { status: 'scheduled' },
    });

    // Now notify helper — they know payment is confirmed
    try {
      await this.notifications.notifyBidAccepted(
        session.helper.user.email,
        session.request.title,
      );
    } catch {}
  }

  // ── Helper: Mark session done (step 1 of 2) ──────────────────────────────────

  /**
   * Helper reports session complete + actual hours.
   * Session moves to 'helper_completed' — student must confirm or it auto-confirms in 24h.
   * This prevents self-reported hours from immediately unlocking payouts.
   */
  async markHelperCompleted(
    helperUserId: string,
    sessionId: string,
    actualHours: number,
  ) {
    if (!actualHours || actualHours <= 0) {
      throw new BadRequestException('actualHours must be greater than zero');
    }
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: { helper: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.helper.user_id !== helperUserId) throw new ForbiddenException();
    if (!['scheduled', 'in_progress'].includes(session.status)) {
      throw new BadRequestException(`Cannot complete a session in status '${session.status}'`);
    }

    return this.prisma.helpSession.update({
      where: { id: sessionId },
      data: {
        status: 'helper_completed',
        actual_hours: actualHours,
      },
    });
  }

  // ── Student: Confirm completion (step 2 of 2) ─────────────────────────────────

  /**
   * Student confirms the session is complete → triggers payout eligibility.
   * If student disputes instead, status becomes 'disputed' for admin review.
   */
  async confirmCompletion(studentId: string, sessionId: string, confirmed: boolean) {
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: { request: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException();
    if (session.status !== 'helper_completed') {
      throw new BadRequestException(
        `Session must be in 'helper_completed' status. Current: '${session.status}'`,
      );
    }

    if (confirmed) {
      const [updatedSession] = await this.prisma.$transaction([
        this.prisma.helpSession.update({
          where: { id: sessionId },
          data: { status: 'completed', completed_at: new Date() },
        }),
        this.prisma.helpRequest.update({
          where: { id: session.request_id },
          data: { status: 'completed' },
        }),
      ]);
      return updatedSession;
    } else {
      // Student disputes — hold for admin review
      return this.prisma.helpSession.update({
        where: { id: sessionId },
        data: { status: 'disputed' },
      });
    }
  }

  // ── Admin: Force-complete a session (e.g. after 24h auto-confirm) ────────────

  async forceCompleteSession(sessionId: string) {
    const session = await this.prisma.helpSession.findUnique({
      where: { id: sessionId },
      include: { request: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!['helper_completed', 'disputed'].includes(session.status)) {
      throw new BadRequestException(`Cannot force-complete a session in status '${session.status}'`);
    }

    const [updatedSession] = await this.prisma.$transaction([
      this.prisma.helpSession.update({
        where: { id: sessionId },
        data: { status: 'completed', completed_at: new Date() },
      }),
      this.prisma.helpRequest.update({
        where: { id: session.request_id },
        data: { status: 'completed' },
      }),
    ]);
    return updatedSession;
  }

  // ── Student: Cancel open request ────────────────────────────────────────────
  async cancelRequest(studentId: string, requestId: string) {
    const request = await this.prisma.helpRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.student_id !== studentId) throw new ForbiddenException();
    if (request.status !== 'open') {
      throw new BadRequestException('Only open requests can be cancelled');
    }
    return this.prisma.helpRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled' },
    });
  }

  // ── Student: My posted requests ─────────────────────────────────────────────
  async getMyRequests(studentId: string) {
    return this.prisma.helpRequest.findMany({
      where: { student_id: studentId },
      include: {
        _count: { select: { bids: true } },
        session: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── Instructor: My bids + bid withdrawal ─────────────────────────────────────

  async getMyBids(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    return this.prisma.helpBid.findMany({
      where: { helper_id: profile.id },
      include: { request: true, session: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async withdrawBid(instructorUserId: string, bidId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new ForbiddenException('Instructor profile not found');

    const bid = await this.prisma.helpBid.findUnique({ where: { id: bidId } });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.helper_id !== profile.id) throw new ForbiddenException();
    if (bid.status !== 'pending') {
      throw new BadRequestException('Only pending bids can be withdrawn');
    }

    return this.prisma.helpBid.delete({ where: { id: bidId } });
  }

  // ── Admin: All requests with full details ───────────────────────────────────
  async adminListAll() {
    return this.prisma.helpRequest.findMany({
      include: {
        student: { select: { first_name: true, last_name: true, email: true } },
        _count: { select: { bids: true } },
        session: { include: { transaction: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
