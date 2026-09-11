import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NOTIFICATIONS } from '../queue/queue.constants';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUE_NOTIFICATIONS }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
