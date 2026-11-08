import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  QUEUE_NOTIFICATIONS,
  QUEUE_TRANSCODING,
  QUEUE_PAYOUTS,
} from './queue.constants';
import { NotificationsProcessor } from './notifications.processor';
import { PayoutsProcessor } from './payouts.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * QueueModule — globally available BullMQ queues + their worker processors.
 * @Global() means any module can inject queues without importing QueueModule explicitly.
 *
 * Queues:
 *   - notifications  → email + SMS jobs (NotificationsProcessor)
 *   - transcoding    → video HLS transcoding jobs (ffmpeg / MediaConvert)
 *   - payouts        → cleanup + payout release jobs (PayoutsProcessor)
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NOTIFICATIONS },
      { name: QUEUE_TRANSCODING },
      { name: QUEUE_PAYOUTS },
    ),
    NotificationsModule,
    PrismaModule,
  ],
  providers: [NotificationsProcessor, PayoutsProcessor],
  exports: [BullModule],
})
export class QueueModule {}
