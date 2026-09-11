"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AccessLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AccessLogService = AccessLogService_1 = class AccessLogService {
    prisma;
    logger = new common_1.Logger(AccessLogService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logAccess(entry) {
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
        }
        catch (error) {
            this.logger.error('Failed to log access:', error);
        }
    }
    async getCourseAccessStats(courseId) {
        try {
            const stats = await this.prisma.$queryRaw `
        SELECT 
          COUNT(*) as total_accesses,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(duration) as avg_duration,
          access_type
        FROM content_access_logs
        WHERE course_id = ${courseId}
        AND success = true
        GROUP BY access_type
      `;
            const totalAccesses = stats.reduce((sum, stat) => sum + parseInt(stat.total_accesses), 0);
            const uniqueUsers = stats.length > 0 ? parseInt(stats[0].unique_users) : 0;
            const averageDuration = stats.length > 0 ? parseFloat(stats[0].avg_duration) || 0 : 0;
            const accessByType = {};
            stats.forEach(stat => {
                accessByType[stat.access_type] = parseInt(stat.total_accesses);
            });
            return {
                totalAccesses,
                uniqueUsers,
                averageDuration,
                accessByType,
            };
        }
        catch (error) {
            this.logger.error('Failed to get course access stats:', error);
            return {
                totalAccesses: 0,
                uniqueUsers: 0,
                averageDuration: 0,
                accessByType: {},
            };
        }
    }
    async getUserAccessHistory(userId, limit = 50) {
        try {
            const history = await this.prisma.$queryRaw `
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
      `;
            return history;
        }
        catch (error) {
            this.logger.error('Failed to get user access history:', error);
            return [];
        }
    }
    async detectSuspiciousActivity(userId) {
        try {
            const recentAccesses = await this.prisma.$queryRaw `
        SELECT 
          COUNT(*) as access_count,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT lesson_id) as unique_lessons
        FROM content_access_logs
        WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '1 hour'
      `;
            const access = recentAccesses[0];
            const reasons = [];
            if (parseInt(access.access_count) > 100) {
                reasons.push('Excessive access attempts');
            }
            if (parseInt(access.unique_ips) > 5) {
                reasons.push('Access from multiple IP addresses');
            }
            if (parseInt(access.unique_lessons) > 20) {
                reasons.push('Rapid lesson access pattern');
            }
            return {
                isSuspicious: reasons.length > 0,
                reasons,
            };
        }
        catch (error) {
            this.logger.error('Failed to detect suspicious activity:', error);
            return { isSuspicious: false, reasons: [] };
        }
    }
    async cleanupOldLogs(daysToKeep = 90) {
        try {
            const result = await this.prisma.$executeRaw `
        DELETE FROM content_access_logs
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;
            this.logger.log(`Cleaned up ${result} old access log entries`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to cleanup old logs:', error);
            return 0;
        }
    }
};
exports.AccessLogService = AccessLogService;
exports.AccessLogService = AccessLogService = AccessLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccessLogService);
//# sourceMappingURL=access-log.service.js.map