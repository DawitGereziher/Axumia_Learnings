import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('courses/:courseId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Initiate Chapa checkout for a course' })
  initiateCoursePayment(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateCoursePayment(
      user.id,
      courseId,
      user.email,
      user.name,
    );
  }

  @Post('bookings/:bookingId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Initiate Chapa checkout for a session booking' })
  initiateBookingPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateBookingPayment(
      user.id,
      bookingId,
      user.email,
      user.name,
    );
  }

  @Post('help-sessions/:sessionId/checkout')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({
    summary: 'Initiate Chapa checkout for a help session (upfront escrow)',
  })
  initiateHelpSessionPayment(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.initiateHelpSessionPayment(
      user.id,
      sessionId,
      user.email,
      user.name,
    );
  }

  /** Chapa posts here after payment — MUST be public (no auth) */
  @Get('verify/:tx_ref')
  @ApiOperation({ summary: '[Public] Verify payment status by tx_ref' })
  async verifyPaymentStatus(@Param('tx_ref') txRef: string) {
    return this.payments.verifyPaymentStatus(txRef);
  }

  @Post('webhook/chapa')
  @ApiOperation({ summary: '[Webhook] Chapa payment confirmation' })
  async chapaWebhook(
    @Req() req: Request,
    @Headers('x-chapa-signature') signature: string,
  ) {
    const rawBody = JSON.stringify(req.body);
    return this.payments.handleChapaWebhook(rawBody, signature);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get my transaction history' })
  myTransactions(@CurrentUser() user: AuthUser) {
    return this.payments.getMyTransactions(user.id);
  }

  @Get('instructor/earnings')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Instructor] Get earnings summary and payout history' })
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

  @Post('payouts/request/:transactionId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({
    summary: '[Instructor] Request payout for a completed transaction',
  })
  requestPayout(
    @Param('transactionId') txId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.getInstructorEarnings(user.id);
  }

  @Post('cleanup/abandoned')
  @ApiOperation({ summary: '[System] Cleanup abandoned pending transactions' })
  cleanupAbandoned() {
    return this.payments.cleanupAbandonedTransactions();
  }
}
