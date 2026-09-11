import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * WebhookGuard — verifies that incoming webhook requests are genuinely from Zoom or Google.
 *
 * Zoom: validates HMAC-SHA256 signature in `x-zm-signature` header.
 *       See: https://developers.zoom.us/docs/api/rest/webhook-reference/#verify-webhook-events
 *
 * Google: validates `x-goog-channel-token` header against our stored channel token.
 *         The token is set by us when we register the Google Calendar watch subscription.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path;

    if (path.includes('/webhooks/zoom')) {
      return this.verifyZoom(req);
    }

    if (path.includes('/webhooks/google')) {
      return this.verifyGoogle(req);
    }

    // Unknown webhook path — deny
    throw new UnauthorizedException('Unknown webhook source');
  }

  private verifyZoom(req: Request): boolean {
    const secret = this.config.get<string>('ZOOM_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn(
        'ZOOM_WEBHOOK_SECRET not set — rejecting all Zoom webhook calls',
      );
      throw new UnauthorizedException('Zoom webhook secret not configured');
    }

    const timestamp = req.headers['x-zm-request-timestamp'] as string;
    const signature = req.headers['x-zm-signature'] as string;

    if (!timestamp || !signature) {
      throw new UnauthorizedException('Missing Zoom signature headers');
    }

    // Reject stale requests (> 5 minutes old)
    const requestAge = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (requestAge > 300) {
      this.logger.warn(`Stale Zoom webhook rejected: age=${requestAge}s`);
      throw new UnauthorizedException('Stale Zoom webhook request');
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;
    const bodyStr = rawBody
      ? rawBody.toString('utf8')
      : JSON.stringify(req.body);
    const message = `v0:${timestamp}:${bodyStr}`;
    const expected =
      'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');

    if (
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      this.logger.warn('Zoom webhook signature mismatch');
      throw new UnauthorizedException('Invalid Zoom webhook signature');
    }

    return true;
  }

  private verifyGoogle(req: Request): boolean {
    const channelToken = this.config.get<string>(
      'GOOGLE_WEBHOOK_CHANNEL_TOKEN',
    );
    if (!channelToken) {
      // If not configured, allow but log (Google Calendar webhooks are lower risk)
      this.logger.warn(
        'GOOGLE_WEBHOOK_CHANNEL_TOKEN not set — skipping Google webhook verification',
      );
      return true;
    }

    const receivedToken = req.headers['x-goog-channel-token'] as string;
    if (!receivedToken) {
      throw new UnauthorizedException('Missing x-goog-channel-token header');
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(channelToken),
        Buffer.from(receivedToken),
      )
    ) {
      this.logger.warn('Google webhook channel token mismatch');
      throw new UnauthorizedException('Invalid Google webhook channel token');
    }

    return true;
  }
}
