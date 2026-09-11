import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS, JOB_PAYMENT_RECEIVED } from '../queue/queue.constants';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionPct: number;

  constructor(
    private prisma: PrismaService,
    private chapa: ChapaService,
    private config: ConfigService,
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
  ) {
    this.commissionPct = parseInt(
      config.get('PLATFORM_COMMISSION_PERCENT') || '15',
      10,
    );
  }

  /** Helper: Check if entity already has a paid transaction */
  private async checkExistingPaidTransaction(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.transaction.findFirst({
      where: {
        user_id: userId,
        status: 'paid',
        metadata: {
          path: ['entity_type'],
          equals: entityType,
        },
        AND: {
          metadata: {
            path: ['entity_id'],
            equals: entityId,
          },
        },
      },
    });
    return !!existing;
  }

  /** Helper: Generate transaction reference */
  private generateTxRef(entityType: string): string {
    const prefix = entityType.charAt(0); // 'c', 'b', 'h'
    return `${prefix}${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;
  }

  /** Helper: Parse user name into first and last name */
  private parseUserName(userName: string): {
    firstName: string;
    lastName: string;
  } {
    const [fn, ...ln] = userName.split(' ');
    return { firstName: fn || 'Student', lastName: ln.join(' ') || '' };
  }

  /** Helper: Check if Chapa is in mock mode */
  private isMockMode(): boolean {
    const chapaKey = this.config.get('CHAPA_SECRET_KEY');
    return (
      !chapaKey ||
      chapaKey.includes('mock') ||
      chapaKey.includes('change-me') ||
      chapaKey === ''
    );
  }

  /** Helper: Get API URLs */
  private getApiUrls(): { frontendUrl: string; apiUrl: string } {
    return {
      frontendUrl: this.config.get('FRONTEND_URL') || 'http://localhost:3002',
      apiUrl: `http://localhost:${this.config.get('PORT') || 3000}`,
    };
  }

  /** Common payment initiation logic */
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
    // Validate ownership if provided
    if (options.validateOwnership) {
      await options.validateOwnership(userId, entityId);
    }

    // Check for existing paid transaction using helper
    const alreadyPaid = await this.checkExistingPaidTransaction(
      userId,
      entityType,
      entityId,
    );
    if (alreadyPaid) {
      throw new ForbiddenException(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} already paid`,
      );
    }

    // Check for existing pending transaction for this specific entity (allow retry)
    const existingPendingTransaction = await this.prisma.transaction.findFirst({
      where: {
        user_id: userId,
        status: 'pending',
        metadata: {
          path: ['entity_type'],
          equals: entityType,
        },
        AND: {
          metadata: {
            path: ['entity_id'],
            equals: entityId,
          },
        },
      },
    });

    if (existingPendingTransaction) {
      await this.prisma.transaction.delete({
        where: { id: existingPendingTransaction.id },
      });
      this.logger.log(`Deleted existing pending transaction for retry`);
    }

    const txRef = this.generateTxRef(entityType);
    const fee = +((options.amount * this.commissionPct) / 100).toFixed(2);
    const { firstName, lastName } = this.parseUserName(userName);
    const { frontendUrl, apiUrl } = this.getApiUrls();

    // Create pending transaction record with metadata
    await this.prisma.transaction.create({
      data: {
        user_id: userId,
        amount: options.amount,
        platform_fee: fee,
        provider_tx_ref: txRef,
        status: 'pending',
        metadata: {
          entity_type: entityType,
          entity_id: entityId,
          ...(options.extraMetadata || {}),
        },
      },
    });

    // Handle mock mode
    if (this.isMockMode()) {
      this.logger.log(
        `[PaymentsService] Mocking Chapa ${entityType} checkout for txRef: ${txRef}`,
      );
      if (options.mockPaymentHandler) {
        await options.mockPaymentHandler(txRef);
      }
      return {
        checkoutUrl: `${frontendUrl}/payment-success?ref=${txRef}`,
        txRef,
      };
    }

    // Real Chapa payment
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

  /** Initiate payment for a course purchase */
  async initiateCoursePayment(
    userId: string,
    courseId: string,
    userEmail: string,
    userName: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.initiatePaymentCommon(
      'course',
      courseId,
      userId,
      userEmail,
      userName,
      {
        amount: Number(course.price),
        description: `Course: ${course.title}`,
        // Store slug so payment-success can link directly back to the course
        extraMetadata: { course_slug: course.slug },
        mockPaymentHandler: async (txRef) => {
          const purchase = await this.prisma.coursePurchase.create({
            data: {
              user_id: userId,
              course_id: courseId,
              amount_paid: Number(course.price),
            },
          });
          await this.prisma.transaction.updateMany({
            where: { provider_tx_ref: txRef },
            data: { status: 'paid', purchase_id: purchase.id },
          });
        },
      },
    );
  }

  /** Initiate payment for a session booking */
  async initiateBookingPayment(
    userId: string,
    bookingId: string,
    userEmail: string,
    userName: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.initiatePaymentCommon(
      'booking',
      bookingId,
      userId,
      userEmail,
      userName,
      {
        amount: Number((booking as any).price_paid || booking.instructor.hourly_rate),
        description: `Live tutoring session (${(booking as any).session_type || '1-on-1'})`,
        validateOwnership: async (userId, bookingId) => {
          const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
          });
          if (booking?.student_id !== userId) throw new ForbiddenException();
        },
        mockPaymentHandler: async (txRef) => {
          await this.prisma.transaction.updateMany({
            where: { provider_tx_ref: txRef },
            data: { status: 'paid', booking_id: bookingId },
          });
        },
      },
    );
  }

  /** Initiate upfront payment for a help session (escrow) */
  async initiateHelpSessionPayment(
    userId: string,
    sessionId: string,
    userEmail: string,
    userName: string,
  ) {
    const session = await (this.prisma as any).helpSession.findUnique({
      where: { id: sessionId },
      include: { bid: true, request: true },
    });
    if (!session) throw new NotFoundException('Help session not found');

    return this.initiatePaymentCommon(
      'help_session',
      sessionId,
      userId,
      userEmail,
      userName,
      {
        amount:
          Number(session.bid.quoted_rate) * Number(session.bid.estimated_hours),
        description: `Help session: ${session.request.title}`,
        validateOwnership: async (userId, sessionId) => {
          const session = await (this.prisma as any).helpSession.findUnique({
            where: { id: sessionId },
          });
          if (session?.student_id !== userId) throw new ForbiddenException();
        },
        mockPaymentHandler: async (txRef) => {
          await this.prisma.transaction.updateMany({
            where: { provider_tx_ref: txRef },
            data: { status: 'paid', help_session_id: sessionId },
          });
        },
      },
    );
  }

  /** Helper: Link transaction to entity */
  private async linkTransactionToEntity(
    transaction: any,
    entityType: string,
    entityId: string,
    txRef: string,
  ) {
    try {
      // Handle course payments
      if (entityType === 'course') {
        let purchase = await this.prisma.coursePurchase.findUnique({
          where: {
            user_id_course_id: {
              user_id: transaction.user_id,
              course_id: entityId,
            },
          },
        });

        if (!purchase) {
          purchase = await this.prisma.coursePurchase.create({
            data: {
              user_id: transaction.user_id,
              course_id: entityId,
              amount_paid: transaction.amount,
            },
          });
          this.logger.log(
            `Created purchase record for course ${entityId} and transaction ${txRef}`,
          );
        }

        if (transaction.purchase_id !== purchase.id) {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { purchase_id: purchase.id },
          });
          this.logger.log(
            `Linked transaction ${txRef} to purchase ${purchase.id}`,
          );
        }
      }

      // Handle booking payments
      if (entityType === 'booking') {
        if (transaction.booking_id !== entityId) {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { booking_id: entityId },
          });
          this.logger.log(
            `Linked transaction to booking ${entityId} for ${txRef}`,
          );
        }
      }

      // Handle help session payments
      if (entityType === 'help_session') {
        if (transaction.help_session_id !== entityId) {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { help_session_id: entityId },
          });
          this.logger.log(
            `Linked transaction to help session ${entityId} for ${txRef}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to link transaction to entity for ${txRef}:`,
        error,
      );
    }
  }

  /** Helper: Update transaction status with verification */
  private async updateTransactionStatus(
    transaction: any,
    txRef: string,
  ): Promise<string> {
    try {
      const verified = await this.chapa.verifyTransaction(txRef);
      const chapaStatus = verified.data?.status;

      if (chapaStatus === 'success') {
        const metadata = transaction.metadata;
        if (metadata?.entity_type && metadata?.entity_id) {
          await this.linkTransactionToEntity(
            transaction,
            metadata.entity_type,
            metadata.entity_id,
            txRef,
          );
        }

        if (transaction.status !== 'paid') {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'paid' },
          });

          // Dispatch background notification job
          try {
            const user = await this.prisma.user.findUnique({
              where: { id: transaction.user_id },
            });
            if (user?.email) {
              await this.notificationsQueue.add(JOB_PAYMENT_RECEIVED, {
                email: user.email,
                amount: transaction.amount,
                currency: transaction.currency || 'ETB',
                itemTitle: metadata?.entity_type || 'EthioLearn Purchase',
                phone: (user as any).phone || undefined,
              });
            }
          } catch (qErr) {
            this.logger.error('Failed to queue payment notification job', qErr);
          }
        }
        return 'paid';
      } else if (chapaStatus === 'failed' && transaction.status !== 'failed') {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'failed' },
        });
        return 'failed';
      }
    } catch (error) {
      this.logger.error(
        `Failed to verify transaction status for ${txRef}:`,
        error,
      );
    }
    return transaction.status;
  }

  /** Chapa webhook — verify signature then mark transaction as paid */
  async handleChapaWebhook(rawBody: string, signature: string) {
    const isValid = this.chapa.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid Chapa webhook signature received');
      return { received: false };
    }

    const payload = JSON.parse(rawBody);
    const txRef = payload.tx_ref;

    const transaction = await this.prisma.transaction.findFirst({
      where: { provider_tx_ref: txRef },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for tx_ref: ${txRef}`);
      return { received: true, status: 'not_found' };
    }

    // Update transaction status using helper
    const status = await this.updateTransactionStatus(transaction, txRef);

    this.logger.log(
      `Payment webhook processed for tx_ref: ${txRef} with status: ${status}`,
    );
    return { received: true, status };
  }

  /** Verify payment status for client-side polling */
  async verifyPaymentStatus(txRef: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { provider_tx_ref: txRef },
      include: { purchase: true },
    });

    if (!transaction) {
      return { status: 'not_found', txRef };
    }

    // Update transaction status using helper
    const status = await this.updateTransactionStatus(transaction, txRef);
    const verified = status !== transaction.status;
    const meta = transaction.metadata as Record<string, string> | null;

    return {
      status,
      txRef,
      verified,
      entityType: meta?.entity_type ?? null,
      courseSlug: meta?.course_slug ?? null,
    };
  }

  /** Cleanup abandoned pending transactions (called periodically) */
  async cleanupAbandonedTransactions() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const abandonedTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'pending',
        created_at: { lt: threshold },
      },
    });

    for (const transaction of abandonedTransactions) {
      this.logger.log(
        `Cleaning up abandoned transaction: ${transaction.provider_tx_ref}`,
      );
      await this.prisma.transaction.delete({ where: { id: transaction.id } });
    }

    return { cleaned: abandonedTransactions.length };
  }

  async getMyTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getInstructorEarnings(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new ForbiddenException('Not an instructor profile');

    const payouts = await this.prisma.payout.findMany({
      where: { instructor_id: profile.id },
      orderBy: { created_at: 'desc' },
    });

    const totalPaidOut = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPendingPayouts = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const coursePurchases = await this.prisma.coursePurchase.findMany({
      where: { course: { instructor_id: profile.id } },
      include: {
        course: true,
        user: { select: { email: true, first_name: true, last_name: true } },
      },
    });

    const grossFromCourses = coursePurchases.reduce(
      (sum, cp) => sum + Number(cp.amount_paid),
      0,
    );

    const bookings = await this.prisma.booking.findMany({
      where: {
        instructor_id: profile.id,
        status: { in: ['confirmed', 'completed'] },
      },
      include: {
        student: { select: { email: true, first_name: true, last_name: true } },
      },
    });

    const grossFromBookings = bookings.reduce(
      (sum, b) => sum + Number(b.price_paid),
      0,
    );

    const grossEarned = grossFromCourses + grossFromBookings;
    const platformFees = +(grossEarned * (this.commissionPct / 100)).toFixed(
      2,
    );
    const netEarned = +(grossEarned - platformFees).toFixed(2);
    const availableBalance = Math.max(
      0,
      +(netEarned - totalPaidOut - totalPendingPayouts).toFixed(2),
    );

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
          net: +(
            Number(cp.amount_paid) *
            (1 - this.commissionPct / 100)
          ).toFixed(2),
          date: cp.created_at,
        })),
        ...bookings.map((b) => ({
          id: b.id,
          type: 'booking',
          title: `Tutoring Session (${b.session_type})`,
          student: b.student.email,
          amount: Number(b.price_paid),
          net: +(
            Number(b.price_paid) *
            (1 - this.commissionPct / 100)
          ).toFixed(2),
          date: b.created_at,
        })),
      ].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }

  async requestInstructorPayout(
    instructorUserId: string,
    dto: { amount: number; method: string; account_details: string },
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
      include: { user: true },
    });
    if (!profile) throw new ForbiddenException('Instructor profile not found');

    const earnings = await this.getInstructorEarnings(instructorUserId);

    if (dto.amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero');
    }
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
        status: 'pending',
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
    } catch {}

    return payout;
  }
}
