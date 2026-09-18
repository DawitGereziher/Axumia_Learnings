import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { HelpRequestsService } from './help-requests.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { CreateBidDto } from './dto/create-bid.dto';

@ApiTags('Help Requests')
@ApiBearerAuth()
@Controller('help-requests')
export class HelpRequestsController {
  constructor(private readonly helpRequests: HelpRequestsService) {}

  // ── Public browse ───────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Browse open help requests (public)' })
  @ApiQuery({ name: 'subject', required: false })
  listOpen(@Query('subject') subject?: string) {
    return this.helpRequests.listOpenRequests(subject);
  }

  @Get('admin/all')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all help requests' })
  adminListAll() {
    return this.helpRequests.adminListAll();
  }

  // ── Student ─────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Student] Post a new help request' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHelpRequestDto) {
    return this.helpRequests.createRequest(user.id, dto);
  }

  @Get('mine')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Student] My posted help requests' })
  myRequests(@CurrentUser() user: AuthUser) {
    return this.helpRequests.getMyRequests(user.id);
  }

  @Patch('bids/:bidId/accept')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({
    summary: '[Student] Accept a bid — creates session & triggers payment',
  })
  acceptBid(@Param('bidId') bidId: string, @CurrentUser() user: AuthUser) {
    return this.helpRequests.acceptBid(user.id, bidId);
  }

  @Delete(':id')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Student] Cancel an open request' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.helpRequests.cancelRequest(user.id, id);
  }

  // ── Instructor / Helper ─────────────────────────────────────────────────────

  @Get('bids/mine')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] My submitted bids' })
  myBids(@CurrentUser() user: AuthUser) {
    return this.helpRequests.getMyBids(user.id);
  }

  @Post(':id/bids')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Submit a bid on a help request' })
  submitBid(
    @Param('id') requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBidDto,
  ) {
    return this.helpRequests.submitBid(user.id, requestId, dto);
  }

  @Delete('bids/:bidId/withdraw')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Withdraw a pending bid' })
  withdrawBid(
    @Param('bidId') bidId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.helpRequests.withdrawBid(user.id, bidId);
  }

  @Patch('sessions/:id/link')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Helper] Set meeting link for a help session' })
  setLink(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { meetingLink: string },
  ) {
    return this.helpRequests.setMeetingLink(
      user.id,
      sessionId,
      body.meetingLink,
    );
  }

  @Patch('sessions/:id')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Helper] Update help session details' })
  updateSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { meeting_link?: string },
  ) {
    return this.helpRequests.updateSession(user.id, sessionId, body);
  }

  @Patch('sessions/:id/complete')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Helper] Step 1 — Report session complete with actual hours (moves to helper_completed)' })
  markComplete(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { actualHours: number },
  ) {
    return this.helpRequests.markHelperCompleted(user.id, sessionId, body.actualHours);
  }

  @Patch('sessions/:id/confirm')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: '[Student] Step 2 — Confirm or dispute session completion' })
  confirmCompletion(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { confirmed: boolean },
  ) {
    return this.helpRequests.confirmCompletion(user.id, sessionId, body.confirmed);
  }

  // ── Detail (must be last to avoid route collisions) ─────────────────────────

  @Get(':id')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get a single help request with bids' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.helpRequests.getRequest(id, user.id);
  }
}
