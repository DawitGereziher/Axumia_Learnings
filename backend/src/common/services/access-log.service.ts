import { Injectable, Logger } from '@nestjs/common';
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
  duration?: number; // Time spent in milliseconds
}

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log content access
   */
  async logAccess(entry: AccessLogEntry): Promise<void> {
    try {
      await this.prisma.contentAccessLog.create({
        data: {
          user_id: entry.userId,
          lesson_id: entry.lessonId,
          course_id: entry.courseId,
          access_type: entry.accessType,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          referrer: entry.referrer,
          success: entry.success,
          duration: entry.duration,
        },
      });

      this.logger.debug(`Access logged: User ${entry.userId} -> Lesson ${entry.lessonId}`);
    } catch (error) {
      this.logger.error('Failed to log access:', error);
      // Don't throw error - logging shouldn't break the main flow
    }
  }

  /**
   * Get access statistics for a course
   */
  async getCourseAccessStats(courseId: string): Promise<{
    totalAccesses: number;
    uniqueUsers: number;
    averageDuration: number;
    accessByType: Record<string, number>;
  }> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_accesses,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(duration) as avg_duration,
          access_type
        FROM content_access_logs
        WHERE course_id = ${courseId}
        AND success = true
        GROUP BY access_type
      ` as any[];

      const totalAccesses = stats.reduce((sum, stat) => sum + parseInt(stat.total_accesses), 0);
      const uniqueUsers = stats.length > 0 ? parseInt(stats[0].unique_users) : 0;
      const averageDuration = stats.length > 0 ? parseFloat(stats[0].avg_duration) || 0 : 0;
      
      const accessByType: Record<string, number> = {};
      stats.forEach(stat => {
        accessByType[stat.access_type] = parseInt(stat.total_accesses);
      });

      return {
        totalAccesses,
        uniqueUsers,
        averageDuration,
        accessByType,
      };
    } catch (error) {
      this.logger.error('Failed to get course access stats:', error);
      return {
        totalAccesses: 0,
        uniqueUsers: 0,
        averageDuration: 0,
        accessByType: {},
      };
    }
  }

  /**
   * Get user access history
   */
  async getUserAccessHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await this.prisma.$queryRaw`
        SELECT 
          cal.*,
          cl.title as lesson_title,
          c.title as course_title
        FROM content_access_logs cal
        LEFT JOIN course_lessons cl ON cal.lesson_id = cl.id
        LEFT JOIN courses c ON cal.course_id = c.id
        WHERE cal.user_id = ${userId}
        ORDER BY cal.created_at DESC
        LIMIT ${limit}
      ` as any[];

      return history;
    } catch (error) {
      this.logger.error('Failed to get user access history:', error);
      return [];
    }
  }

  /**
   * Detect suspicious access patterns
   */
  async detectSuspiciousActivity(userId: string): Promise<{
    isSuspicious: boolean;
    reasons: string[];
  }> {
    try {
      const recentAccesses = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as access_count,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT lesson_id) as unique_lessons
        FROM content_access_logs
        WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '1 hour'
      ` as any[];

      const access = recentAccesses[0];
      const reasons: string[] = [];

      // Too many accesses in short time
      if (parseInt(access.access_count) > 100) {
        reasons.push('Excessive access attempts');
      }

      // Access from many different IPs
      if (parseInt(access.unique_ips) > 5) {
        reasons.push('Access from multiple IP addresses');
      }

      // Accessing many different lessons rapidly
      if (parseInt(access.unique_lessons) > 20) {
        reasons.push('Rapid lesson access pattern');
      }

      return {
        isSuspicious: reasons.length > 0,
        reasons,
      };
    } catch (error) {
      this.logger.error('Failed to detect suspicious activity:', error);
      return { isSuspicious: false, reasons: [] };
    }
  }

  /**
   * Clean up old access logs (to prevent database bloat)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM content_access_logs
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;

      this.logger.log(`Cleaned up ${result} old access log entries`);
      return result;
    } catch (error) {
      this.logger.error('Failed to cleanup old logs:', error);
      return 0;
    }
  }
}