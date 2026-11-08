import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUE_PAYOUTS } from './queue.constants';

/**
 * PayoutsProcessor — BullMQ worker that consumes the `payouts` queue.
 *
 * Handles:
 *  - cleanup_abandoned_transactions  (every 30 min via repeat job in PaymentsService.onModuleInit)
 *  - release_payout                  (dispatched after session completes and monitoring clears it)
 */
@Processor(QUEUE_PAYOUTS)
export class PayoutsProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing payouts job [${job.name}] id=${job.id}`);

    try {
      switch (job.name) {
        // ── Abandon stale pending transactions ─────────────────────────────
        case 'cleanup_abandoned_transactions': {
          await this.cleanupAbandoned();
          break;
        }

        // ── Release a held payout to instructor ────────────────────────────
        case 'release_payout': {
          const { payoutId } = job.data;
          await this.releasePayout(payoutId);
          break;
        }

        default:
          this.logger.warn(`Unknown payouts job: ${job.name}`);
      }
    } catch (err: any) {
      this.logger.error(`Payouts job [${job.name}] failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ── Abandon stale PENDING transactions (older than 30 min) ─────────────────

  private async cleanupAbandoned() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000);

    const result = await this.prisma.transaction.updateMany({
      where: { status: 'pending', created_at: { lt: threshold } },
      data: { status: 'abandoned' },
    });

    if (result.count > 0) {
      // Also cancel any bookings still in 'awaiting_payment'
      const stuckBookings = await this.prisma.booking.findMany({
        where: { status: 'awaiting_payment', created_at: { lt: threshold } },
        include: { slot: true },
      });

      for (const booking of stuckBookings) {
        try {
          await this.prisma.$transaction([
            this.prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'cancelled' },
            }),
            this.prisma.availabilitySlot.update({
              where: { id: booking.slot_id },
              data: { current_participants: { decrement: 1 }, is_booked: false },
            }),
          ]);
          this.logger.log(`Freed slot for abandoned booking ${booking.id}`);
        } catch (e) {
          this.logger.error(`Could not cancel booking ${booking.id}:`, e);
        }
      }

      // Cancel help sessions still in 'awaiting_payment'
      const stuckSessions = await this.prisma.helpSession.findMany({
        where: { status: 'awaiting_payment', created_at: { lt: threshold } },
      });

      for (const session of stuckSessions) {
        try {
          await this.prisma.helpSession.update({
            where: { id: session.id },
            data: { status: 'cancelled' } as any,
          });
          this.logger.log(`Cancelled abandoned help session ${session.id}`);
        } catch (e) {
          this.logger.error(`Could not cancel session ${session.id}:`, e);
        }
      }
    }

    this.logger.log(`Abandoned cleanup: ${result.count} transactions marked abandoned`);
  }

  // ── Release an instructor payout ──────────────────────────────────────────

  private async releasePayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      this.logger.warn(`Payout ${payoutId} not found — skipping`);
      return;
    }
    if (payout.status !== 'pending') {
      this.logger.log(`Payout ${payoutId} already in status '${payout.status}' — skipping`);
      return;
    }

    // Mark as 'released' — actual bank transfer is manual or via Chapa mass-pay
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'released', paid_at: new Date() },
    });

    // Notify instructor — look up via instructor_id → user
    try {
      const profile = await this.prisma.instructorProfile.findUnique({
        where: { id: payout.instructor_id },
      });
      if (profile?.user_id) {
        const user = await this.prisma.user.findUnique({
          where: { id: profile.user_id },
        });
        if (user?.email) {
          await this.notifications.notifyInstructorPayout(
            user.email,
            Number(payout.amount),
            payout.currency || 'ETB',
            (user as any).phone,
          );
        }
      }
    } catch (notifErr) {
      this.logger.error(`Failed to notify instructor for payout ${payoutId}:`, notifErr);
    }


    this.logger.log(`Payout ${payoutId} released: ${payout.amount} ${payout.currency}`);
  }
}
