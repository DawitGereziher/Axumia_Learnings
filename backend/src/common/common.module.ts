import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService } from './services/rate-limit.service';
import { AccessLogService } from './services/access-log.service';
import { CacheService } from './services/cache.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [RateLimitService, AccessLogService, CacheService],
  exports: [RateLimitService, AccessLogService, CacheService],
})
export class CommonModule {}