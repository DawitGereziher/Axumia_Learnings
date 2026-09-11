import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OAuthService } from './oauth/oauth.service';
import { OAuthController } from './oauth/oauth.controller';
import { ZoomWebhookController } from './webhooks/zoom-webhook.controller';
import { GoogleWebhookController } from './webhooks/google-webhook.controller';
import { WebhookGuard } from './webhooks/webhook.guard';
import { MonitorService } from './monitor/monitor.service';
import { MonitorController } from './monitor/monitor.controller';

@Module({
  imports: [
    HttpModule, // for Zoom token refresh HTTP calls
    PrismaModule,
    NotificationsModule,
  ],
  providers: [OAuthService, MonitorService, WebhookGuard],
  controllers: [
    OAuthController,
    ZoomWebhookController,
    GoogleWebhookController,
    MonitorController,
  ],
  exports: [MonitorService], // exported so BookingsModule can call gatePayoutRelease
})
export class SessionMonitoringModule {}
