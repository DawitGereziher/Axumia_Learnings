import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  QUEUE_NOTIFICATIONS,
  QUEUE_TRANSCODING,
  QUEUE_PAYOUTS,
} from './queue.constants';

/**
 * QueueModule — globally available BullMQ queues.
 * @Global() means any module can inject queues without importing QueueModule explicitly.
 *
 * Queues defined:
 *   - notifications  → email + SMS jobs
 *   - transcoding    → video HLS transcoding jobs (ffmpeg / MediaConvert)
 *   - payouts        → scheduled payout release jobs
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
  ],
  exports: [BullModule],
})
export class QueueModule {}
