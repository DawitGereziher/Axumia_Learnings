import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * CacheService — thin, typed Redis wrapper for application-level caching.
 *
 * Uses the same Redis instance as BullMQ (via ioredis) — no extra connection.
 * All keys are namespaced with 'axumia:' to avoid collisions with queue keys.
 *
 * Usage:
 *   const result = await this.cache.get<CourseList>('courses:list:...');
 *   await this.cache.set('courses:list:...', result, 300);
 *   await this.cache.delPattern('courses:list:*');
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;
  private readonly NS = 'axumia:';

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      // Log but don't crash — cache is best-effort, not critical path
      this.logger.warn(`Redis cache error: ${err.message}`);
    });

    this.client.connect().catch(() => {
      this.logger.warn('Redis not available — cache will be bypassed');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /** Retrieve a cached value. Returns null on miss or Redis unavailability. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.NS + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null; // never let cache errors block the request
    }
  }

  /** Store a value. TTL defaults to 300s (5 minutes). */
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(
        this.NS + key,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch {
      // best-effort — silently skip on failure
    }
  }

  /** Delete one or more exact keys. */
  async del(...keys: string[]): Promise<void> {
    try {
      await this.client.del(keys.map((k) => this.NS + k));
    } catch {}
  }

  /**
   * Delete all keys matching a glob pattern.
   * Uses SCAN to avoid blocking Redis (safe for production).
   * Example: delPattern('courses:list:*')
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const stream = this.client.scanStream({
        match: this.NS + pattern,
        count: 100,
      });
      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          this.client.del(keys);
        }
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    } catch {}
  }
}
