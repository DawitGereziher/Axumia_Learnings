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
export declare class RateLimitService {
    private config;
    private prisma;
    private readonly logger;
    private readonly maxAttempts;
    private readonly windowMs;
    private readonly useDatabase;
    constructor(config: ConfigService, prisma: PrismaService);
    checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult>;
    private memoryStore;
    private checkMemoryRateLimit;
    private checkDatabaseRateLimit;
    resetRateLimit(identifier: string, resourceType?: string): Promise<void>;
    getRateLimitStatus(identifier: string, resourceType: string): Promise<{
        current: number;
        max: number;
        resetAt: number;
    }>;
}
