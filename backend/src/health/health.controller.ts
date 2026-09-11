import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '../queue/queue.constants';

/**
 * HealthController — GET /health
 * Required by:
 *   - Kubernetes liveness & readiness probes (k8s/backend.yaml)
 *   - Load balancer health checks
 *   - Docker Compose healthcheck (to-be-added)
 *
 * Returns degraded status (not an error) if a dependency is slow,
 * so the LB keeps the instance in rotation while the underlying issue is investigated.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  @Get()
  async check() {
    const start = Date.now();

    // Check DB
    let dbStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    // Check Redis via queue
    let redisStatus = 'connected';
    try {
      await this.notificationsQueue.getJobCounts();
    } catch {
      redisStatus = 'error';
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const status = dbStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime_s: uptimeSeconds,
      latency_ms: Date.now() - start,
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
