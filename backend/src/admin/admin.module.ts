import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import {
  QUEUE_NOTIFICATIONS,
  QUEUE_TRANSCODING,
  QUEUE_PAYOUTS,
} from '../queue/queue.constants';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    BullModule.registerQueue(
      { name: QUEUE_NOTIFICATIONS },
      { name: QUEUE_TRANSCODING },
      { name: QUEUE_PAYOUTS },
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
