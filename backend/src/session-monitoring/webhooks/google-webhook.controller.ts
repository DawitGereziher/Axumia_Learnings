import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WebhookGuard } from './webhook.guard';
import { MonitorService } from '../monitor/monitor.service';

/**
 * Google Calendar sends push notifications to this endpoint when a watched calendar
 * is updated (e.g., when an instructor's Meet event starts or is modified).
 *
 * Google Meet does NOT send meeting-ended events via webhook. Instead, the system
 * uses a BullMQ delayed job (scheduled at booking time) that polls the Google Meet
 * Activity Reports API ~15 minutes after session end time.
 *
 * Headers sent by Google Calendar:
 *   x-goog-channel-id        — channel ID we registered
 *   x-goog-resource-id       — the resource being watched
 *   x-goog-resource-state    — "sync" | "exists" | "not_exists"
 *   x-goog-channel-token     — our secret token (verified by WebhookGuard)
 *   x-goog-message-number    — monotonically increasing message count
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class GoogleWebhookController {
  private readonly logger = new Logger(GoogleWebhookController.name);

  constructor(private readonly monitorService: MonitorService) {}

  @Post('google')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiExcludeEndpoint()
  async handleGoogleWebhook(
    @Body() body: any,
    @Headers('x-goog-resource-state') resourceState: string,
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-resource-id') resourceId: string,
    @Headers('x-goog-message-number') messageNumber: string,
  ): Promise<any> {
    this.logger.debug(
      `Google Calendar webhook: state=${resourceState} channel=${channelId} msg=${messageNumber}`,
    );

    // "sync" is Google's initial confirmation ping — acknowledge and return
    if (resourceState === 'sync') {
      this.logger.log(`Google Calendar channel ${channelId} sync confirmed`);
      return { received: true };
    }

    // "exists" means the calendar resource was updated (event created/modified)
    if (resourceState === 'exists') {
      // Extract Meet room code from channelId (we embed it when registering the watch)
      // channelId format: "axumia-meet-{bookingId}-{meetCode}"
      const match = channelId.match(/axumia-meet-([a-f0-9-]+)-(.+)/);
      if (!match) {
        this.logger.warn(`Unrecognised Google channel ID format: ${channelId}`);
        return { received: true };
      }

      const [, bookingId, meetCode] = match;
      await this.monitorService.onGoogleCalendarUpdate(
        bookingId,
        meetCode,
        body,
      );
    }

    return { received: true };
  }
}
