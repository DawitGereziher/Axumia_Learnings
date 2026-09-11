import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface RateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
  userId?: string;
  ip?: string;
  resourceType?: 'video' | 'material' | 'content';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly useDatabase: boolean;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.maxAttempts = parseInt(this.config.get('RATE_LIMIT_MAX_ATTEMPTS') || '100', 10);
    this.windowMs = parseInt(this.config.get('RATE_LIMIT_WINDOW_MS') || '3600000', 10); // 1 hour
    this.useDatabase = this.config.get('USE_DATABASE_RATE_LIMIT') === 'true';
  }

  /**
   * Check if access is allowed based on rate limits
   */
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const {
      maxAttempts = this.maxAttempts,
      windowMs = this.windowMs,
      userId,
      ip,
      resourceType = 'content',
    } = options;

    const identifier = userId || ip;
    if (!identifier) {
      return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowMs };
    }

    if (this.useDatabase) {
      return this.checkDatabaseRateLimit(identifier, resourceType, maxAttempts, windowMs);
    } else {
      return this.checkMemoryRateLimit(identifier, resourceType, maxAttempts, windowMs);
    }
  }

  /**
   * In-memory rate limiting (simple, not distributed)
   */
  private memoryStore = new Map<string, { count: number; resetAt: number }>();

  private checkMemoryRateLimit(
    identifier: string,
    resourceType: string,
    maxAttempts: number,
    windowMs: number,
  ): RateLimitResult {
    const key = `${identifier}:${resourceType}`;
    const now = Date.now();
    const record = this.memoryStore.get(key);

    if (!record || now > record.resetAt) {
      const resetAt = now + windowMs;
      this.memoryStore.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1, resetAt };
    }

    if (record.count >= maxAttempts) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      throw new HttpException(
        `Rate limit exceeded. Try again at ${new Date(record.resetAt).toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Database-based rate limiting (distributed, persistent)
   */
  private async checkDatabaseRateLimit(
    identifier: string,
    resourceType: string,
    maxAttempts: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old records
    await this.prisma.$executeRaw`
      DELETE FROM rate_limit_records 
      WHERE created_at < ${new Date(windowStart)}
    `;

    // Count recent attempts
    const count = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM rate_limit_records 
      WHERE identifier = ${identifier} 
      AND resource_type = ${resourceType}
      AND created_at >= ${new Date(windowStart)}
    ` as any[];

    const currentCount = parseInt(count[0]?.count || '0', 10);

    if (currentCount >= maxAttempts) {
      // Get reset time from oldest record
      const oldest = await this.prisma.$queryRaw`
        SELECT created_at 
        FROM rate_limit_records 
        WHERE identifier = ${identifier} 
        AND resource_type = ${resourceType}
        ORDER BY created_at ASC 
        LIMIT 1
      ` as any[];

      const resetAt = oldest[0]?.created_at 
        ? new Date(oldest[0].created_at).getTime() + windowMs 
        : now + windowMs;

      this.logger.warn(`Rate limit exceeded for ${identifier}:${resourceType}`);
      throw new HttpException(
        `Rate limit exceeded. Try again at ${new Date(resetAt).toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record this attempt
    await this.prisma.$executeRaw`
      INSERT INTO rate_limit_records (identifier, resource_type, ip_address, created_at)
      VALUES (${identifier}, ${resourceType}, ${identifier}, ${new Date(now)})
    `;

    return {
      allowed: true,
      remaining: maxAttempts - currentCount - 1,
      resetAt: now + windowMs,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string, resourceType?: string): Promise<void> {
    if (this.useDatabase) {
      if (resourceType) {
        await this.prisma.$executeRaw`
          DELETE FROM rate_limit_records 
          WHERE identifier = ${identifier} 
          AND resource_type = ${resourceType}
        `;
      } else {
        await this.prisma.$executeRaw`
          DELETE FROM rate_limit_records 
          WHERE identifier = ${identifier}
        `;
      }
    } else {
      const key = resourceType ? `${identifier}:${resourceType}` : identifier;
      this.memoryStore.delete(key);
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    identifier: string,
    resourceType: string,
  ): Promise<{ current: number; max: number; resetAt: number }> {
    if (this.useDatabase) {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      const count = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM rate_limit_records 
        WHERE identifier = ${identifier} 
        AND resource_type = ${resourceType}
        AND created_at >= ${new Date(windowStart)}
      ` as any[];

      const current = parseInt(count[0]?.count || '0', 10);
      return {
        current,
        max: this.maxAttempts,
        resetAt: now + this.windowMs,
      };
    } else {
      const key = `${identifier}:${resourceType}`;
      const record = this.memoryStore.get(key);
      return {
        current: record?.count || 0,
        max: this.maxAttempts,
        resetAt: record?.resetAt || Date.now() + this.windowMs,
      };
    }
  }
}