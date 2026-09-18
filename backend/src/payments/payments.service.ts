import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS, QUEUE_PAYOUTS, JOB_PAYMENT_RECEIVED } from '../queue/queue.constants';
import { TransactionStatus, BookingStatus, PayoutStatus } from '../common/enums';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionPct: number;

  constructor(
    private prisma: PrismaService,
    private chapa: ChapaService,
    private config: ConfigService,
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QUEUE_PAYOUTS) private payoutsQueue: Queue,
  ) {
    this.commissionPct = parseInt(
      config.get('PLATFORM_COMMISSION_PERCENT') || '15',
      10,
    );
  }

  /**
   * Register a repeating BullMQ job to clean up abandoned pending transactions.
   * Runs every 30 minutes — no @nestjs/schedule dependency needed.
   * Uses BullMQ's built-in repeat/cron feature (idempotent: jobId prevents duplicates).
   */
  async onModuleInit() {
    try {
      await this.payoutsQueue.add(
        'cleanup_abandoned_transactions',
        {},
        {
          repeat: { every: 30 * 60 * 1000 }, // every 30 minutes
          jobId: 'cleanup_abandoned_singleton', // prevents duplicate registrations
          removeOnComplete: { count: 1 },
          removeOnFail: { count: 5 },
        },
      );
      this.logger.log('Registered abandoned transaction cleanup job (every 30 min)');
    } catch (err) {
      this.logger.warn('Could not register cleanup job — Redis may not be available yet');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Check if entity already has a paid transaction */
  private async checkExistingPaidTransaction(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.transaction.findFirst({
      where: {
        user_id: userId,
        status: TransactionStatus.PAID,
        metadata: { path: ['entity_type'], equals: entityType },
        AND: { metadata: { path: ['entity_id'], equals: entityId } },
      },
    });
    return !!existing;
  }

  /** Generate a unique transaction reference */
  private generateTxRef(entityType: string): string {
    const prefix = entityType.charAt(0); // 'c', 'b', 'h'
    return `${prefix}${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;
  }

  /** Parse user name into first and last */
  private parseUserName(userName: string): { firstName: string; lastName: string } {
    const [fn, ...ln] = userName.split(' ');
    return { firstName: fn || 'Student', lastName: ln.join(' ') || '' };
  }

  /** Detect mock/dev mode (Chapa key not configured) */
  private isMockMode(): boolean {
    const chapaKey = this.config.get('CHAPA_SECRET_KEY');
    return !chapaKey || chapaKey.includes('mock') || chapaKey.includes('change-me') || chapaKey === '';
  }

  /** Resolve callback and return URLs — uses API_PUBLIC_URL in production */
  private getApiUrls(): { frontendUrl: string; apiUrl: string } {
    return {
      frontendUrl: this.config.get('FRONTEND_URL') || 'http://localhost:3002',
      apiUrl:
        this.config.get('API_PUBLIC_URL') ||
        `http://localhost:${this.config.get('PORT') || 3000}`,
    };
  }

  // ── Common payment initiation ─────────────────────────────────────────────────

  private async initiatePaymentCommon(
    entityType: 'course' | 'booking' | 'help_session',
    entityId: string,
    userId: string,
    userEmail: string,
    userName: string,
    options: {
      amount: number;
      description: string;
      extraMetadata?: Record<string, string>;
      validateOwnership?: (userId: string, entityId: string) => Promise<void>;
      mockPaymentHandler?: (txRef: string) => Promise<void>;
    },
  ) {
    if (options.validateOwnership) {
      await options.validateOwnership(userId, entityId);
    }

    const alreadyPaid = await this.checkExistingPaidTransaction(userId, entityType, entityId);
    if (alreadyPaid) {
      throw new ForbiddenException(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} already paid`,
      );
    }

    // Delete any stale pending transaction for this entity to allow a clean retry
    const existingPending = await this.prisma.transaction.findFirst({
      where: {
        user_id: userId,
        status: TransactionStatus.PENDING,
        metadata: { path: ['entity_type'], equals: entityType },
        AND: { metadata: { path: ['entity_id'], equals: entityId } },
      },
    });
    if (existingPending) {
      // Mark as abandoned rather than hard-delete — preserves audit trail
      await this.prisma.transaction.update({
        where: { id: existingPending.id },
        data: { status: 'abandoned' },
      });
      this.logger.log(`Marked stale pending transaction as abandoned: ${existingPending.provider_tx_ref}`);
    }

    const txRef = this.generateTxRef(entityType);
    const fee = +((options.amount * this.commissionPct) / 100).toFixed(2);
    const { firstName, lastName } = this.parseUserName(userName);
    const { frontendUrl, apiUrl } = this.getApiUrls();

    await this.prisma.transaction.create({
      data: {
        user_id: userId,
        amount: options.amount,
        platform_fee: fee,
        provider_tx_ref: txRef,
        status: TransactionStatus.PENDING,
        metadata: {
          entity_type: entityType,
          entity_id: entityId,
          ...(options.extraMetadata || {}),
        },
      },
    });

    // Mock mode — immediately fulfill without hitting Chapa
    if (this.isMockMode()) {
      this.logger.log(`[Mock] Chapa ${entityType} checkout for txRef: ${txRef}`);
      if (options.mockPaymentHandler) {
        await options.mockPaymentHandler(txRef);
      }
      return { checkoutUrl: `${frontendUrl}/payment-success?ref=${txRef}`, txRef };
    }

    const chapaRes = await this.chapa.initiatePayment({
      amount: options.amount,
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      callback_url: `${apiUrl}/payments/webhook/chapa`,
      return_url: `${frontendUrl}/payment-success?ref=${txRef}`,
      description: options.description,
    });

    return { checkoutUrl: chapaRes.data.checkout_url, txRef };
  }

  // ── Initiate payments ─────────────────────────────────────────────────────────

  async initiateCoursePayment(userId: string, courseId: string, userEmail: string, userName: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    return this.initiatePaymentCommon('course', courseId, userId, userEmail, userName, {
      amount: Number(course.price),
      description: `Course: ${course.title}`,
      extraMetadata: { course_slug: course.slug },
      mockPaymentHandler: async (txRef) => {
        const purchase = await this.prisma.coursePurchase.upsert({
          where: { user_id_course_id: { user_id: userId, course_id: courseId } },
          create: { user_id: userId, course_id: courseId, amount_paid: Number(course.price) },
          update: {},
        });
        // Use updateMany — idempotent even if called twice
        await this.prisma.transaction.updateMany({
          where: { provider_tx_ref: txRef, status: TransactionStatus.PENDING },
          data: { status: TransactionStatus.PAID, purchase_id: purchase.id },
        });
      },
    });
  }

  async initiateBookingPayment(userId: string, bookingId: string, userEmail: string, userName: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.initiatePaymentCommon('booking', bookingId, userId, userEmail, userName, {
      amount: Number(booking.price_paid || booking.instructor.hourly_rate),
      description: `Live tutoring session (${booking.session_type || '1-on-1'})`,
      validateOwnership: async (uid, bid) => {
        const b = await this.prisma.booking.findUnique({ where: { id: bid } });
        if (b?.student_id !== uid) throw new ForbiddenException('This booking does not belong to you');
      },
      mockPaymentHandler: async (txRef) => {
        await this.prisma.transaction.updateMany({
          where: { provider_tx_ref: txRef, status: TransactionStatus.PENDING },
          data: { status: TransactionStatus.PAID, booking_id: bookingId },
        });
      },
    });
  }

  async initiateHelpSessionPayment(userId: string, sessionId: string, userEmail: string, userName: string) {
    const session = await (this.prisma as any).helpSession.findUnique({
      where: { id: sessionId },
      include: { bid: true, request: true },
    });
    if (!session) throw new NotFoundException('Help session not found');

    return this.initiatePaymentCommon('help_session', sessionId, userId, userEmail, userName, {
      amount: Number(session.bid.quoted_rate) * Number(session.bid.estimated_hours),
      description: `Help session: ${session.request.title}`,
      validateOwnership: async (uid, sid) => {
        const s = await (this.prisma as any).helpSession.findUnique({ where: { id: sid } });
        if (s?.student_id !== uid) throw new ForbiddenException('This session does not belong to you');
      },
      mockPaymentHandler: async (txRef) => {
        await this.prisma.transaction.updateMany({
          where: { provider_tx_ref: txRef, status: TransactionStatus.PENDING },
          data: { status: TransactionStatus.PAID, help_session_id: sessionId },
        });
      },
    });
  }

  // ── Webhook ───────────────────────────────────────────────────────────────────

  /**
   * handleChapaWebhook — always returns HTTP 200 to Chapa.
   * Any internal error is logged but never surfaced as a non-200 response,
   * which would cause Chapa to retry and potentially double-process payments.
   */
  async handleChapaWebhook(rawBody: string, signature: string): Promise<{ received: boolean; status?: string }> {
    // ── Signature check ──────────────────────────────────────────────────────
    const isValid = this.chapa.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid Chapa webhook signature — ignoring');
      // Still return 200 so Chapa doesn't retry a known-bad signature
      return { received: true, status: 'invalid_signature' };
    }

    try {
      const payload = JSON.parse(rawBody);
      const txRef = payload.tx_ref;

      const transaction = await this.prisma.transaction.findFirst({
        where: { provider_tx_ref: txRef },
      });

      if (!transaction) {
        this.logger.warn(`Webhook: transaction not found for tx_ref: ${txRef}`);
        return { received: true, status: 'not_found' };
      }

      // Short-circuit: already paid — idempotent no-op
      if (transaction.status === TransactionStatus.PAID) {
        this.logger.log(`Webhook: tx_ref ${txRef} already paid — skipping`);
        return { received: true, status: 'already_paid' };
      }

      const status = await this.updateTransactionStatus(transaction, txRef);
      this.logger.log(`Webhook: tx_ref ${txRef} → ${status}`);
      return { received: true, status };
    } catch (err) {
      // Log the error but return 200 — Chapa must not retry due to our internal failure
      this.logger.error('Webhook processing error (will not retry):', err);
      return { received: true, status: 'processing_error' };
    }
  }

  // ── Verify (client-side polling) ──────────────────────────────────────────────

  /**
   * Verify payment status for the current user.
   * Short-circuits the Chapa API call if already paid — prevents rate-limit exhaustion.
   * Auth required: users can only poll their own transactions.
   */
  async verifyPaymentStatus(txRef: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        provider_tx_ref: txRef,
        user_id: userId, // ownership check — users can only verify their own tx
      },
      include: { purchase: true },
    });

    if (!transaction) {
      return { status: 'not_found', txRef };
    }

    // Short-circuit: if already paid/failed, skip Chapa API call
    if (
      transaction.status === TransactionStatus.PAID ||
      transaction.status === TransactionStatus.FAILED
    ) {
      const meta = transaction.metadata as Record<string, string> | null;
      return {
        status: transaction.status,
        txRef,
        verified: true,
        entityType: meta?.entity_type ?? null,
        courseSlug: meta?.course_slug ?? null,
      };
    }

    // Only call Chapa if status is still pending
    const status = await this.updateTransactionStatus(transaction, txRef);
    const meta = transaction.metadata as Record<string, string> | null;

    return {
      status,
      txRef,
      verified: status !== transaction.status,
      entityType: meta?.entity_type ?? null,
      courseSlug: meta?.course_slug ?? null,
    };
  }

  // ── Link transaction to entity + trigger status hooks ────────────────────────

  private async linkTransactionToEntity(
    transaction: any,
    entityType: string,
    entityId: string,
    txRef: string,
  ) {
    // ── Course purchase ────────────────────────────────────────────────────────
    if (entityType === 'course') {
      const purchase = await this.prisma.coursePurchase.upsert({
        where: { user_id_course_id: { user_id: transaction.user_id, course_id: entityId } },
        create: { user_id: transaction.user_id, course_id: entityId, amount_paid: transaction.amount },
        update: {},
      });
      if (transaction.purchase_id !== purchase.id) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { purchase_id: purchase.id },
        });
        this.logger.log(`Linked tx ${txRef} → course purchase ${purchase.id}`);
      }
    }

    // ── Booking: link + transition awaiting_payment → pending ─────────────────
    if (entityType === 'booking') {
      if (transaction.booking_id !== entityId) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { booking_id: entityId },
        });
      }
      // Transition booking from 'awaiting_payment' → 'pending' so instructor is notified
      const updated = await this.prisma.booking.updateMany({
        where: { id: entityId, status: 'awaiting_payment' },
        data: { status: 'pending' },
      });
      if (updated.count > 0) {
        this.logger.log(`Booking ${entityId}: awaiting_payment → pending (tx ${txRef})`);
        // Queue instructor notification now that payment is confirmed
        try {
          const booking = await this.prisma.booking.findUnique({
            where: { id: entityId },
            include: {
              instructor: { include: { user: true } },
              student: { select: { first_name: true, last_name: true } },
            },
          });
          if (booking?.instructor.user.email) {
            await this.notificationsQueue.add('booking_new', {
              instructorEmail: booking.instructor.user.email,
              bookingId: entityId,
              studentName: `${booking.student.first_name || ''} ${booking.student.last_name || ''}`.trim() || 'Student',
            });
          }
        } catch (notifErr) {
          this.logger.error(`Failed to notify instructor for booking ${entityId}:`, notifErr);
        }
      }
    }

    // ── Help session: link + transition awaiting_payment → scheduled ──────────
    if (entityType === 'help_session') {
      if (transaction.help_session_id !== entityId) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { help_session_id: entityId },
        });
      }
      // Transition session from 'awaiting_payment' → 'scheduled' so helper is notified
      const updated = await this.prisma.helpSession.updateMany({
        where: { id: entityId, status: 'awaiting_payment' },
        data: { status: 'scheduled' },
      });
      if (updated.count > 0) {
        this.logger.log(`HelpSession ${entityId}: awaiting_payment → scheduled (tx ${txRef})`);
        // Notify helper that their bid was accepted and payment confirmed
        try {
          const session = await this.prisma.helpSession.findUnique({
            where: { id: entityId },
            include: {
              helper: { include: { user: true } },
              request: { select: { title: true } },
            },
          });
          if (session?.helper.user.email) {
            await this.notificationsQueue.add(JOB_PAYMENT_RECEIVED, {
              email: session.helper.user.email,
              amount: transaction.amount,
              currency: 'ETB',
              itemTitle: `Help Session: ${session.request.title}`,
            });
          }
        } catch (notifErr) {
          this.logger.error(`Failed to notify helper for session ${entityId}:`, notifErr);
        }
      }
    }
  }

  // ── Update transaction status via Chapa verify ────────────────────────────────

  private async updateTransactionStatus(transaction: any, txRef: string): Promise<string> {
    try {
      const verified = await this.chapa.verifyTransaction(txRef);
      const chapaStatus = verified.data?.status;

      if (chapaStatus === 'success') {
        const metadata = transaction.metadata;
        if (metadata?.entity_type && metadata?.entity_id) {
          await this.linkTransactionToEntity(transaction, metadata.entity_type, metadata.entity_id, txRef);
        }

        if (transaction.status !== TransactionStatus.PAID) {
          // Use updateMany with status filter — idempotent, safe against race condition
          await this.prisma.transaction.updateMany({
            where: { id: transaction.id, status: { not: TransactionStatus.PAID } },
            data: { status: TransactionStatus.PAID },
          });

          // Async notification — failure here must never affect the payment outcome
          try {
            const user = await this.prisma.user.findUnique({ where: { id: transaction.user_id } });
            if (user?.email) {
              await this.notificationsQueue.add(JOB_PAYMENT_RECEIVED, {
                email: user.email,
                amount: transaction.amount,
                currency: transaction.currency || 'ETB',
                itemTitle: metadata?.entity_type || 'Axumia Purchase',
                phone: (user as any).phone ?? undefined,
              });
            }
          } catch (qErr) {
            this.logger.error('Failed to queue payment notification:', qErr);
          }
        }
        return TransactionStatus.PAID;
      }

      if (chapaStatus === 'failed' && transaction.status !== TransactionStatus.FAILED) {
        await this.prisma.transaction.updateMany({
          where: { id: transaction.id, status: { not: TransactionStatus.FAILED } },
          data: { status: TransactionStatus.FAILED },
        });
        return TransactionStatus.FAILED;
      }
    } catch (err) {
      this.logger.error(`Failed to verify tx ${txRef} with Chapa:`, err);
    }
    return transaction.status;
  }

  // ── Cleanup abandoned transactions ────────────────────────────────────────────

  /**
   * Marks stale pending transactions as 'abandoned' (soft, not hard delete).
   * Preserves audit trail. Should be called by a scheduled job or admin only.
   */
  async cleanupAbandonedTransactions() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const result = await this.prisma.transaction.updateMany({
      where: {
        status: TransactionStatus.PENDING,
        created_at: { lt: threshold },
      },
      data: { status: 'abandoned' },
    });

    // Also release any slots blocked by abandoned booking transactions
    const abandonedBookingTxs = await this.prisma.transaction.findMany({
      where: { status: 'abandoned', booking_id: { not: null } },
      select: { booking_id: true },
    });
    for (const { booking_id } of abandonedBookingTxs) {
      if (!booking_id) continue;
      const booking = await this.prisma.booking.findUnique({ where: { id: booking_id } });
      if (booking?.status === 'awaiting_payment') {
        await this.prisma.$transaction([
          this.prisma.booking.update({ where: { id: booking_id }, data: { status: 'cancelled' } }),
          this.prisma.availabilitySlot.update({
            where: { id: booking.slot_id },
            data: { current_participants: { decrement: 1 }, is_booked: false },
          }),
        ]);
        this.logger.log(`Cancelled abandoned booking ${booking_id} and freed slot ${booking.slot_id}`);
      }
    }

    this.logger.log(`Cleanup: marked ${result.count} transactions as abandoned`);
    return { abandoned: result.count };
  }

  // ── Refund ────────────────────────────────────────────────────────────────────

  /**
   * Issue a full or partial refund via Chapa's refund API.
   * Only paid transactions can be refunded.
   * Admin-only: caller must verify role before invoking.
   */
  async refundTransaction(
    txRef: string,
    requestedByUserId: string,
    amount?: number,
    reason = 'Customer requested refund',
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { provider_tx_ref: txRef },
    });
    if (!transaction) throw new NotFoundException(`Transaction not found: ${txRef}`);
    if (transaction.status !== TransactionStatus.PAID) {
      throw new BadRequestException(`Only paid transactions can be refunded. Current status: ${transaction.status}`);
    }

    const refundAmount = amount ?? Number(transaction.amount);
    if (refundAmount <= 0 || refundAmount > Number(transaction.amount)) {
      throw new BadRequestException(`Refund amount must be between 1 and ${transaction.amount} ETB`);
    }

    // In mock mode — just mark as refunded locally
    if (this.isMockMode()) {
      this.logger.log(`[Mock] Refund ${refundAmount} ETB for tx ${txRef}`);
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'refunded' },
      });
      return { status: 'success', message: '[Mock] Refund processed', txRef, amount: refundAmount };
    }

    // Call Chapa refund API
    const chapaResult = await this.chapa.refundTransaction(txRef, refundAmount, reason);

    // Mark transaction as refunded locally
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'refunded' },
    });

    // If booking refund — cancel booking and free slot
    if (transaction.booking_id) {
      const booking = await this.prisma.booking.findUnique({ where: { id: transaction.booking_id } });
      if (booking && !['completed', 'cancelled'].includes(booking.status)) {
        await this.prisma.$transaction([
          this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'cancelled' } }),
          this.prisma.availabilitySlot.update({
            where: { id: booking.slot_id },
            data: { current_participants: { decrement: 1 }, is_booked: false },
          }),
        ]);
        this.logger.log(`Booking ${booking.id} cancelled after refund`);
      }
    }

    // If help session refund — mark session as cancelled
    if (transaction.help_session_id) {
      await this.prisma.helpSession.updateMany({
        where: { id: transaction.help_session_id, status: { not: 'completed' } },
        data: { status: 'cancelled' } as any,
      });
      this.logger.log(`HelpSession ${transaction.help_session_id} cancelled after refund`);
    }

    this.logger.log(`Refund issued: ${refundAmount} ETB for tx ${txRef} (Chapa: ${chapaResult.status})`);
    return { status: chapaResult.status, message: chapaResult.message, txRef, amount: refundAmount };
  }

  // ── Transaction history ───────────────────────────────────────────────────────

  async getMyTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { user_id: userId },
        // Redact metadata — contains internal entity references
        select: {
          id: true,
          amount: true,
          platform_fee: true,
          status: true,
          provider_tx_ref: true,
          created_at: true,
          currency: true,
          purchase_id: true,
          booking_id: true,
          help_session_id: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { data, total, page, limit };
  }

  // ── Instructor earnings ───────────────────────────────────────────────────────

  async getInstructorEarnings(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new ForbiddenException('Instructor profile not found');

    const payouts = await this.prisma.payout.findMany({
      where: { instructor_id: profile.id },
      orderBy: { created_at: 'desc' },
    });

    const totalPaidOut = payouts
      .filter((p) => p.status === PayoutStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPendingPayouts = payouts
      .filter((p) => p.status === PayoutStatus.PENDING || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const coursePurchases = await this.prisma.coursePurchase.findMany({
      where: { course: { instructor_id: profile.id } },
      include: {
        course: true,
        user: { select: { email: true, first_name: true, last_name: true } },
      },
    });

    const grossFromCourses = coursePurchases.reduce((sum, cp) => sum + Number(cp.amount_paid), 0);

    // ── FIX: Only count bookings with a linked PAID transaction ──────────────
    const paidBookingIds = (
      await this.prisma.transaction.findMany({
        where: {
          status: TransactionStatus.PAID,
          booking_id: { not: null },
        },
        select: { booking_id: true },
      })
    )
      .map((t) => t.booking_id!)
      .filter(Boolean);

    const bookings = await this.prisma.booking.findMany({
      where: {
        instructor_id: profile.id,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        id: { in: paidBookingIds }, // only paid bookings
      },
      include: {
        student: { select: { email: true, first_name: true, last_name: true } },
      },
    });

    const grossFromBookings = bookings.reduce((sum, b) => sum + Number(b.price_paid), 0);
    const grossEarned = grossFromCourses + grossFromBookings;
    const platformFees = +((grossEarned * this.commissionPct) / 100).toFixed(2);
    const netEarned = +(grossEarned - platformFees).toFixed(2);
    const availableBalance = Math.max(0, +(netEarned - totalPaidOut - totalPendingPayouts).toFixed(2));

    return {
      grossEarned,
      platformFees,
      netEarned,
      totalPaidOut,
      totalPendingPayouts,
      availableBalance,
      payouts,
      earningsLedger: [
        ...coursePurchases.map((cp) => ({
          id: cp.id,
          type: 'course_purchase',
          title: cp.course.title,
          student: cp.user.email,
          amount: Number(cp.amount_paid),
          net: +(Number(cp.amount_paid) * (1 - this.commissionPct / 100)).toFixed(2),
          date: cp.created_at,
        })),
        ...bookings.map((b) => ({
          id: b.id,
          type: 'booking',
          title: `Tutoring Session (${b.session_type})`,
          student: b.student.email,
          amount: Number(b.price_paid),
          net: +(Number(b.price_paid) * (1 - this.commissionPct / 100)).toFixed(2),
          date: b.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }

  // ── Payout request ────────────────────────────────────────────────────────────

  async requestInstructorPayout(
    instructorUserId: string,
    dto: { amount: number; method: string; account_details: string },
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
      include: { user: true },
    });
    if (!profile) throw new ForbiddenException('Instructor profile not found');

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero');
    }

    const earnings = await this.getInstructorEarnings(instructorUserId);
    if (dto.amount > earnings.availableBalance) {
      throw new BadRequestException(
        `Requested amount (${dto.amount} ETB) exceeds available balance (${earnings.availableBalance} ETB)`,
      );
    }

    const payout = await this.prisma.payout.create({
      data: {
        instructor_id: profile.id,
        amount: dto.amount,
        currency: 'ETB',
        status: PayoutStatus.PENDING,
        method: dto.method || 'telebirr',
        account_details: dto.account_details,
      },
    });

    try {
      if (profile.user?.email) {
        await this.notificationsQueue.add(JOB_PAYMENT_RECEIVED, {
          email: profile.user.email,
          amount: dto.amount,
          currency: 'ETB',
          itemTitle: `Payout Request (${dto.method})`,
        });
      }
    } catch {
      // Non-fatal — payout record was created successfully
    }

    return payout;
  }
}
