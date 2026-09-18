import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionMonitoringModule } from '../session-monitoring/session-monitoring.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => SessionMonitoringModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
