import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TranscodingProcessor } from './transcoding.processor';
import { QUEUE_TRANSCODING } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_TRANSCODING })],
  providers: [TranscodingProcessor],
  exports: [TranscodingProcessor],
})
export class TranscodingModule {}
