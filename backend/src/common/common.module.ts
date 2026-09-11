import { Module } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { AccessLogService } from './services/access-log.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RateLimitService, AccessLogService],
  exports: [RateLimitService, AccessLogService],
})
export class CommonModule {}