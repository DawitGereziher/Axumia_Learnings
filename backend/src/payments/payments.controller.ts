import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  // ── Initiate checkout ─────────────────────────────────────────────────────────

  @Post('courses/:courseId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Initiate Chapa checkout for a course purchase' })
  initiateCoursePayment(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateCoursePayment(user.id, courseId, user.email, user.name);
  }

  @Post('bookings/:bookingId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Initiate Chapa checkout for a session booking' })
  initiateBookingPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateBookingPayment(user.id, bookingId, user.email, user.name);
  }

  @Post('help-sessions/:sessionId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Initiate Chapa checkout for a help session (upfront escrow)' })
  initiateHelpSessionPayment(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateHelpSessionPayment(user.id, sessionId, user.email, user.name);
  }

  // ── Verify (client-side polling) ──────────────────────────────────────────────

  /**
   * Auth required — prevents anonymous enumeration of tx_refs.
   * Short-circuits Chapa API call if transaction is already paid — rate-limit safe.
   */
  @Get('verify/:tx_ref')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Verify payment status by tx_ref (auth required, owned transactions only)' })
  verifyPaymentStatus(
    @Param('tx_ref') txRef: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.verifyPaymentStatus(txRef, user.id);
  }

  // ── Webhook — MUST be public (Chapa posts here, no auth token) ───────────────

  @Post('webhook/chapa')
  @HttpCode(HttpStatus.OK) // Always 200 — Chapa must never see non-200 or it retries
  @ApiOperation({ summary: '[Webhook] Chapa payment confirmation — always returns 200' })
  async chapaWebhook(
    @Req() req: Request,
    @Headers('x-chapa-signature') signature: string,
  ) {
    const rawBody = JSON.stringify(req.body);
    return this.payments.handleChapaWebhook(rawBody, signature);
  }

  // ── Transaction history ───────────────────────────────────────────────────────

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Get my transaction history (paginated, metadata redacted)' })
  myTransactions(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payments.getMyTransactions(user.id, page, limit);
  }

  // ── Instructor earnings & payouts ─────────────────────────────────────────────

  @Get('instructor/earnings')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Instructor] Get earnings summary and payout history (paid bookings only)' })
  getInstructorEarnings(@CurrentUser() user: AuthUser) {
    return this.payments.getInstructorEarnings(user.id);
  }

  @Post('instructor/payout-request')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Instructor] Submit payout request for available balance' })
  requestInstructorPayout(
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; method: string; account_details: string },
  ) {
    return this.payments.requestInstructorPayout(user.id, body);
  }

  // ── Admin-only: system cleanup ────────────────────────────────────────────────

  /**
   * Admin-only — soft-marks stale pending transactions as 'abandoned'.
   * Never hard-deletes — preserves audit trail.
   * Ideally triggered by a BullMQ scheduled cron rather than HTTP.
   */
  @Post('admin/cleanup-abandoned')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Soft-mark stale pending transactions as abandoned (audit-safe)' })
  cleanupAbandoned() {
    return this.payments.cleanupAbandonedTransactions();
  }

  @Post('admin/refund/:tx_ref')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Issue full or partial refund via Chapa — marks transaction as refunded, cancels booking/session' })
  refundTransaction(
    @Param('tx_ref') txRef: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { amount?: number; reason?: string },
  ) {
    return this.payments.refundTransaction(txRef, user.id, body?.amount, body?.reason);
  }
}
