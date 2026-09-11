import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
export declare class HealthController {
    private readonly prisma;
    private readonly notificationsQueue;
    constructor(prisma: PrismaService, notificationsQueue: Queue);
    check(): Promise<{
        status: string;
        timestamp: string;
        uptime_s: number;
        latency_ms: number;
        services: {
            database: string;
            redis: string;
        };
        version: string;
    }>;
}
