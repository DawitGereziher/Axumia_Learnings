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
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
let RateLimitService = RateLimitService_1 = class RateLimitService {
    config;
    prisma;
    logger = new common_1.Logger(RateLimitService_1.name);
    maxAttempts;
    windowMs;
    useDatabase;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.maxAttempts = parseInt(this.config.get('RATE_LIMIT_MAX_ATTEMPTS') || '100', 10);
        this.windowMs = parseInt(this.config.get('RATE_LIMIT_WINDOW_MS') || '3600000', 10);
        this.useDatabase = this.config.get('USE_DATABASE_RATE_LIMIT') === 'true';
    }
    async checkRateLimit(options) {
        const { maxAttempts = this.maxAttempts, windowMs = this.windowMs, userId, ip, resourceType = 'content', } = options;
        const identifier = userId || ip;
        if (!identifier) {
            return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowMs };
        }
        if (this.useDatabase) {
            return this.checkDatabaseRateLimit(identifier, resourceType, maxAttempts, windowMs);
        }
        else {
            return this.checkMemoryRateLimit(identifier, resourceType, maxAttempts, windowMs);
        }
    }
    memoryStore = new Map();
    checkMemoryRateLimit(identifier, resourceType, maxAttempts, windowMs) {
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
            throw new common_1.HttpException(`Rate limit exceeded. Try again at ${new Date(record.resetAt).toISOString()}`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        record.count++;
        return {
            allowed: true,
            remaining: maxAttempts - record.count,
            resetAt: record.resetAt,
        };
    }
    async checkDatabaseRateLimit(identifier, resourceType, maxAttempts, windowMs) {
        const now = Date.now();
        const windowStart = now - windowMs;
        await this.prisma.$executeRaw `
      DELETE FROM rate_limit_records 
      WHERE created_at < ${new Date(windowStart)}
    `;
        const count = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count 
      FROM rate_limit_records 
      WHERE identifier = ${identifier} 
      AND resource_type = ${resourceType}
      AND created_at >= ${new Date(windowStart)}
    `;
        const currentCount = parseInt(count[0]?.count || '0', 10);
        if (currentCount >= maxAttempts) {
            const oldest = await this.prisma.$queryRaw `
        SELECT created_at 
        FROM rate_limit_records 
        WHERE identifier = ${identifier} 
        AND resource_type = ${resourceType}
        ORDER BY created_at ASC 
        LIMIT 1
      `;
            const resetAt = oldest[0]?.created_at
                ? new Date(oldest[0].created_at).getTime() + windowMs
                : now + windowMs;
            this.logger.warn(`Rate limit exceeded for ${identifier}:${resourceType}`);
            throw new common_1.HttpException(`Rate limit exceeded. Try again at ${new Date(resetAt).toISOString()}`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        await this.prisma.$executeRaw `
      INSERT INTO rate_limit_records (identifier, resource_type, ip_address, created_at)
      VALUES (${identifier}, ${resourceType}, ${identifier}, ${new Date(now)})
    `;
        return {
            allowed: true,
            remaining: maxAttempts - currentCount - 1,
            resetAt: now + windowMs,
        };
    }
    async resetRateLimit(identifier, resourceType) {
        if (this.useDatabase) {
            if (resourceType) {
                await this.prisma.$executeRaw `
          DELETE FROM rate_limit_records 
          WHERE identifier = ${identifier} 
          AND resource_type = ${resourceType}
        `;
            }
            else {
                await this.prisma.$executeRaw `
          DELETE FROM rate_limit_records 
          WHERE identifier = ${identifier}
        `;
            }
        }
        else {
            const key = resourceType ? `${identifier}:${resourceType}` : identifier;
            this.memoryStore.delete(key);
        }
    }
    async getRateLimitStatus(identifier, resourceType) {
        if (this.useDatabase) {
            const now = Date.now();
            const windowStart = now - this.windowMs;
            const count = await this.prisma.$queryRaw `
        SELECT COUNT(*) as count 
        FROM rate_limit_records 
        WHERE identifier = ${identifier} 
        AND resource_type = ${resourceType}
        AND created_at >= ${new Date(windowStart)}
      `;
            const current = parseInt(count[0]?.count || '0', 10);
            return {
                current,
                max: this.maxAttempts,
                resetAt: now + this.windowMs,
            };
        }
        else {
            const key = `${identifier}:${resourceType}`;
            const record = this.memoryStore.get(key);
            return {
                current: record?.count || 0,
                max: this.maxAttempts,
                resetAt: record?.resetAt || Date.now() + this.windowMs,
            };
        }
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map