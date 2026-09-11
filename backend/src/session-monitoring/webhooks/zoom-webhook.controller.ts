import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WebhookGuard } from './webhook.guard';
import { MonitorService } from '../monitor/monitor.service';

/**
 * Zoom sends POST requests to this endpoint for meeting lifecycle events.
 *
 * Handled event types:
 *  - `endpoint.url_validation` — Zoom's initial verification challenge (must respond immediately)
 *  - `meeting.started`         — instructor starts the meeting
 *  - `meeting.ended`           — meeting ends (compute duration, flag if needed)
 *  - `meeting.participant_joined` — a participant joined
 *  - `meeting.participant_left`   — a participant left
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class ZoomWebhookController {
  private readonly logger = new Logger(ZoomWebhookController.name);

  constructor(private readonly monitorService: MonitorService) {}

  @Post('zoom')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiExcludeEndpoint() // Hide from public Swagger docs
  @ApiOperation({ summary: 'Zoom webhook receiver' })
  async handleZoomWebhook(
    @Body() body: any,
    @Headers('x-zm-signature') _sig: string,
  ): Promise<any> {
    const eventType: string = body?.event;
    const payload = body?.payload;

    this.logger.debug(`Zoom event received: ${eventType}`);

    switch (eventType) {
      // ── Zoom URL validation challenge (sent once when you register the endpoint) ──
      case 'endpoint.url_validation': {
        const token = payload?.plainToken;
        if (!token) return { message: 'missing plainToken' };
        // Must return this exact shape for Zoom to activate the webhook
        const hash = require('crypto')
          .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET ?? '')
          .update(token)
          .digest('hex');
        return { plainToken: token, encryptedToken: hash };
      }

      case 'meeting.started': {
        const meetingId = String(payload?.object?.id);
        const startTime = payload?.object?.start_time
          ? new Date(payload.object.start_time)
          : new Date();
        await this.monitorService.onZoomSessionStarted(meetingId, startTime);
        break;
      }

      case 'meeting.ended': {
        const meetingId = String(payload?.object?.id);
        const endTime = payload?.object?.end_time
          ? new Date(payload.object.end_time)
          : new Date();
        await this.monitorService.onZoomSessionEnded(meetingId, endTime);
        break;
      }

      case 'meeting.participant_joined': {
        const meetingId = String(payload?.object?.id);
        const participantCount =
          payload?.object?.participant?.total_in_room ?? 1;
        await this.monitorService.onParticipantEvent(
          meetingId,
          'joined',
          participantCount,
          body,
        );
        break;
      }

      case 'meeting.participant_left': {
        const meetingId = String(payload?.object?.id);
        const participantCount =
          payload?.object?.participant?.total_in_room ?? 0;
        await this.monitorService.onParticipantEvent(
          meetingId,
          'left',
          participantCount,
          body,
        );
        break;
      }

      default:
        this.logger.verbose(`Unhandled Zoom event type: ${eventType}`);
    }

    return { received: true };
  }
}
