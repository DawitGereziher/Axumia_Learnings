import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { AdminGuard } from '../../common/guards/admin.guard';

/**
 * Admin-only endpoints for the Session Health monitoring dashboard.
 * All routes require admin role via AdminGuard.
 */
@ApiTags('Admin — Session Monitoring')
@UseGuards(AdminGuard)
@Controller('admin/session-monitoring')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  /**
   * GET /admin/session-monitoring/stats
   * Platform-wide session health overview.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide session health stats' })
  getPlatformStats() {
    return this.monitorService.getPlatformStats();
  }

  /**
   * GET /admin/session-monitoring/sessions
   * Paginated list of all monitored sessions with filters.
   */
  @Get('sessions')
  @ApiOperation({ summary: 'List all monitored sessions' })
  @ApiQuery({
    name: 'flag',
    required: false,
    description: 'Filter by flag: early_end | no_start | short_session',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Filter by platform: zoom | google',
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllSessions(
    @Query('flag') flag?: string,
    @Query('platform') platform?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.monitorService.getAllMonitoredSessions({
      flag,
      platform,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /admin/session-monitoring/sessions/:id
   * Full session detail including all events from the audit log.
   */
  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session detail with full event log' })
  getSessionDetail(@Param('id') id: string) {
    return this.monitorService.getSessionDetail(id);
  }

  /**
   * POST /admin/session-monitoring/sessions/:id/clear-flag
   * Admin manually clears a session flag to unblock payout.
   */
  @Post('sessions/:id/clear-flag')
  @ApiOperation({ summary: 'Clear session flag (unblocks payout)' })
  async clearFlag(@Param('id') id: string) {
    await this.monitorService.clearFlag(id);
    return { success: true, bookingId: id };
  }

  /**
   * GET /admin/session-monitoring/instructors/:id
   * Instructor reliability stats across all their sessions.
   */
  @Get('instructors/:id')
  @ApiOperation({ summary: 'Get instructor session reliability stats' })
  getInstructorStats(@Param('id') id: string) {
    return this.monitorService.getInstructorStats(id);
  }
}
