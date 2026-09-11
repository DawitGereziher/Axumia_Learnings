import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Get('slots/instructor/:profileId')
  @ApiOperation({ summary: 'Get available slots for an instructor' })
  getInstructorSlots(@Param('profileId') profileId: string) {
    return this.bookings.getInstructorSlots(profileId);
  }

  // ── Student ────────────────────────────────────────────────────────────────
  @Post('request/:slotId')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Student] Request a booking slot' })
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
    );
  }

  @Get('mine')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Student] List my bookings' })
  myBookings(@CurrentUser() user: AuthUser) {
    return this.bookings.getStudentBookings(user.id);
  }

  // ── Instructor ─────────────────────────────────────────────────────────────
  @Post('slots')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Create availability slot' })
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
    summary: '[Instructor] Confirm booking and add meeting link',
  })
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { meetingLink: string },
  ) {
    return this.bookings.confirmBooking(id, user.id, body.meetingLink);
  }

  @Get('instructor/mine')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] List my bookings' })
  instructorBookings(@CurrentUser() user: AuthUser) {
    return this.bookings.getInstructorBookings(user.id);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  @Patch(':id/no-show')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Mark booking as no-show' })
  noShow(@Param('id') id: string) {
    return this.bookings.markNoShow(id);
  }
}
