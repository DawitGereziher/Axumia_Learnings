import { PrismaService } from '../../prisma/prisma.service';
export interface AccessLogEntry {
    userId: string;
    lessonId: string;
    courseId: string;
    accessType: 'video' | 'material' | 'content';
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    success: boolean;
    duration?: number;
}
export declare class AccessLogService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    logAccess(entry: AccessLogEntry): Promise<void>;
    getCourseAccessStats(courseId: string): Promise<{
        totalAccesses: number;
        uniqueUsers: number;
        averageDuration: number;
        accessByType: Record<string, number>;
    }>;
    getUserAccessHistory(userId: string, limit?: number): Promise<any[]>;
    detectSuspiciousActivity(userId: string): Promise<{
        isSuspicious: boolean;
        reasons: string[];
    }>;
    cleanupOldLogs(daysToKeep?: number): Promise<number>;
}
