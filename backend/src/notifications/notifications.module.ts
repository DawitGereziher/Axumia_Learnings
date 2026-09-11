import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { QUEUE_NOTIFICATIONS } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NOTIFICATIONS })],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
