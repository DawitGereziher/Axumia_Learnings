import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ChapaService } from './chapa.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ChapaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
