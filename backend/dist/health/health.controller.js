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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_constants_1 = require("../queue/queue.constants");
let HealthController = class HealthController {
    prisma;
    notificationsQueue;
    constructor(prisma, notificationsQueue) {
        this.prisma = prisma;
        this.notificationsQueue = notificationsQueue;
    }
    async check() {
        const start = Date.now();
        let dbStatus = 'connected';
        try {
            await this.prisma.$queryRaw `SELECT 1`;
        }
        catch {
            dbStatus = 'error';
        }
        let redisStatus = 'connected';
        try {
            await this.notificationsQueue.getJobCounts();
        }
        catch {
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
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(1, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NOTIFICATIONS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], HealthController);
//# sourceMappingURL=health.controller.js.map