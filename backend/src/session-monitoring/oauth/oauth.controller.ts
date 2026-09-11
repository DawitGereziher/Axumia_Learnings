import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// Minimal Auth guard — reads userId from JWT attached by existing middleware
// Reuses whatever guard pattern the rest of your NestJS app uses
import { DAuthGuard } from '../../common/guards/d-auth.guard';

@ApiTags('Session Monitoring — OAuth')
@Controller('session-monitoring')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
  ) {}

  /** GET /session-monitoring/zoom/connect → redirects instructor to Zoom OAuth page */
  @UseGuards(DAuthGuard)
  @Get('zoom/connect')
  @ApiOperation({ summary: 'Initiate Zoom OAuth flow for instructor' })
  connectZoom(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const url = this.oauthService.getZoomAuthUrl(userId);
    return res.redirect(url);
  }

  /** GET /session-monitoring/zoom/callback — Zoom redirects here after grant */
  @Get('zoom/callback')
  @ApiOperation({ summary: 'Zoom OAuth callback' })
  async zoomCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.oauthService.handleZoomCallback(code, state);
    const frontendUrl =
      this.config.get('FRONTEND_URL') ?? 'http://localhost:3001';
    return res.redirect(
      `${frontendUrl}/settings/instructor?tab=video&connected=zoom`,
    );
  }

  /** GET /session-monitoring/google/connect → redirects instructor to Google OAuth page */
  @UseGuards(DAuthGuard)
  @Get('google/connect')
  @ApiOperation({ summary: 'Initiate Google OAuth flow for instructor' })
  connectGoogle(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const url = this.oauthService.getGoogleAuthUrl(userId);
    return res.redirect(url);
  }

  /** GET /session-monitoring/google/callback — Google redirects here after grant */
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.oauthService.handleGoogleCallback(code, state);
    const frontendUrl =
      this.config.get('FRONTEND_URL') ?? 'http://localhost:3001';
    return res.redirect(
      `${frontendUrl}/settings/instructor?tab=video&connected=google`,
    );
  }

  /** GET /session-monitoring/oauth/:platform/auth-url — get authorization URL for frontend */
  @UseGuards(DAuthGuard)
  @Get('oauth/:platform/auth-url')
  @ApiOperation({ summary: 'Get OAuth authorization URL for a platform' })
  getAuthUrl(
    @Param('platform') platform: 'zoom' | 'google',
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const url =
      platform === 'zoom'
        ? this.oauthService.getZoomAuthUrl(userId)
        : this.oauthService.getGoogleAuthUrl(userId);
    return { authUrl: url };
  }

  /** GET /session-monitoring/video-accounts — get all video accounts for instructor */
  @UseGuards(DAuthGuard)
  @Get('video-accounts')
  @ApiOperation({ summary: 'Get all video accounts for logged-in instructor' })
  async getVideoAccounts(@Req() req: Request) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const accounts = await this.oauthService.getVideoAccounts(userId);
    return { accounts };
  }

  /** DELETE /session-monitoring/video-accounts/:id — disconnect a video account */
  @UseGuards(DAuthGuard)
  @Delete('video-accounts/:id')
  @ApiOperation({ summary: 'Disconnect a video account' })
  async deleteVideoAccount(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    await this.oauthService.deleteVideoAccount(id, userId);
    return { success: true };
  }

  /** GET /session-monitoring/status — returns which platforms instructor has linked */
  @UseGuards(DAuthGuard)
  @Get('status')
  @ApiOperation({
    summary: 'Get linked platform status for logged-in instructor',
  })
  getStatus(@Req() req: Request) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    return this.oauthService.getConnectionStatus(userId);
  }

  /** DELETE /session-monitoring/:platform/disconnect */
  @UseGuards(DAuthGuard)
  @Delete(':platform/disconnect')
  @ApiOperation({ summary: 'Disconnect a linked Zoom or Google account' })
  disconnect(
    @Param('platform') platform: 'zoom' | 'google',
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    return this.oauthService.disconnectPlatform(userId, platform);
  }

  /** POST /session-monitoring/meetings/zoom - Create Zoom meeting */
  @UseGuards(DAuthGuard)
  @Post('meetings/zoom')
  @ApiOperation({ summary: 'Create a Zoom meeting using connected account' })
  async createZoomMeeting(
    @Req() req: Request,
    @Body() body: { topic: string; startTime: string; durationMinutes: number },
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const startTime = new Date(body.startTime);

    const result = await this.oauthService.createZoomMeeting(
      userId,
      body.topic,
      startTime,
      body.durationMinutes,
    );

    return {
      meetingUrl: result.meetingUrl,
      meetingId: result.meetingId,
      platformMeetingId: result.platformMeetingId,
    };
  }

  /** POST /session-monitoring/meetings/google - Create Google Meet event */
  @UseGuards(DAuthGuard)
  @Post('meetings/google')
  @ApiOperation({
    summary: 'Create a Google Meet event using connected account',
  })
  async createGoogleMeetEvent(
    @Req() req: Request,
    @Body() body: { title: string; startTime: string; durationMinutes: number },
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const startTime = new Date(body.startTime);

    const result = await this.oauthService.createGoogleMeetEvent(
      userId,
      body.title,
      startTime,
      body.durationMinutes,
    );

    return {
      meetingUrl: result.meetingUrl,
      meetingId: result.meetingId,
      platformMeetingId: result.platformMeetingId,
    };
  }

  /** GET /session-monitoring/accounts/:platform/check - Check if platform is connected */
  @UseGuards(DAuthGuard)
  @Get('accounts/:platform/check')
  @ApiOperation({
    summary: 'Check if instructor has connected account for platform',
  })
  async checkAccountConnection(
    @Param('platform') platform: 'zoom' | 'google',
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const isConnected = await this.oauthService.hasConnectedAccount(
      userId,
      platform,
    );
    return { connected: isConnected };
  }
}
