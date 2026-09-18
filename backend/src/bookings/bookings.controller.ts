import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  // ── Public ───────────────────────────────────────────────────────────────────

  @Get('slots/instructor/:profileId')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get available slots for an instructor (auth required)' })
  getInstructorSlots(@Param('profileId') profileId: string) {
    return this.bookings.getInstructorSlots(profileId);
  }

  // ── Student ──────────────────────────────────────────────────────────────────

  /**
   * Creates booking (awaiting_payment) and returns Chapa checkoutUrl.
   * Student MUST complete payment — instructor is NOT notified until webhook fires.
   */
  @Post('request/:slotId')
  @UseGuards(DAuthGuard)
  @ApiOperation({
    summary: '[Student] Request a booking — immediately initiates payment (returns checkoutUrl)',
  })
  requestBooking(
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { notes?: string; session_type?: string },
  ) {
    return this.bookings.requestBooking(
      user.id,
      slotId,
      body?.session_type || '1-on-1',
      body?.notes,
      user.email,
      user.name,
    );
  }

  @Get('mine')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Student] List my bookings' })
  myBookings(@CurrentUser() user: AuthUser) {
    return this.bookings.getStudentBookings(user.id);
  }

  @Delete(':id/cancel')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Student] Cancel a booking (only allowed before confirmation)',
  })
  cancelBooking(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookings.cancelBooking(id, user.id);
  }

  // ── Instructor ───────────────────────────────────────────────────────────────

  @Post('slots')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Create an availability slot' })
  createSlot(
    @CurrentUser() user: AuthUser,
    @Body() dto: { starts_at: string; ends_at: string },
  ) {
    return this.bookings.createSlot(user.id, dto);
  }

  @Patch(':id/confirm')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({
    summary: '[Instructor] Confirm a paid booking and add meeting link',
  })
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { meetingLink: string },
  ) {
    return this.bookings.confirmBooking(id, user.id, body.meetingLink);
  }

  @Patch(':id/reject')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Instructor] Reject a pending booking (triggers student refund)',
  })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { reason?: string },
  ) {
    return this.bookings.rejectBooking(id, user.id, body?.reason);
  }

  @Get('instructor/mine')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] List my bookings' })
  instructorBookings(@CurrentUser() user: AuthUser) {
    return this.bookings.getInstructorBookings(user.id);
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  @Patch(':id/complete')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Mark booking as completed — gates payout via session monitoring',
  })
  completeBooking(@Param('id') id: string) {
    return this.bookings.completeBooking(id, true);
  }

  @Patch(':id/no-show')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Mark booking as no-show' })
  noShow(@Param('id') id: string) {
    return this.bookings.markNoShow(id);
  }
}
