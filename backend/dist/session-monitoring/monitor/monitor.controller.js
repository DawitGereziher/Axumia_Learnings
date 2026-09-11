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
exports.MonitorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const monitor_service_1 = require("./monitor.service");
const admin_guard_1 = require("../../common/guards/admin.guard");
let MonitorController = class MonitorController {
    monitorService;
    constructor(monitorService) {
        this.monitorService = monitorService;
    }
    getPlatformStats() {
        return this.monitorService.getPlatformStats();
    }
    getAllSessions(flag, platform, fromDate, toDate, page, limit) {
        return this.monitorService.getAllMonitoredSessions({
            flag,
            platform,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    getSessionDetail(id) {
        return this.monitorService.getSessionDetail(id);
    }
    async clearFlag(id) {
        await this.monitorService.clearFlag(id);
        return { success: true, bookingId: id };
    }
    getInstructorStats(id) {
        return this.monitorService.getInstructorStats(id);
    }
};
exports.MonitorController = MonitorController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform-wide session health stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MonitorController.prototype, "getPlatformStats", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'List all monitored sessions' }),
    (0, swagger_1.ApiQuery)({
        name: 'flag',
        required: false,
        description: 'Filter by flag: early_end | no_start | short_session',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'platform',
        required: false,
        description: 'Filter by platform: zoom | google',
    }),
    (0, swagger_1.ApiQuery)({ name: 'fromDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'toDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('flag')),
    __param(1, (0, common_1.Query)('platform')),
    __param(2, (0, common_1.Query)('fromDate')),
    __param(3, (0, common_1.Query)('toDate')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MonitorController.prototype, "getAllSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get session detail with full event log' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MonitorController.prototype, "getSessionDetail", null);
__decorate([
    (0, common_1.Post)('sessions/:id/clear-flag'),
    (0, swagger_1.ApiOperation)({ summary: 'Clear session flag (unblocks payout)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitorController.prototype, "clearFlag", null);
__decorate([
    (0, common_1.Get)('instructors/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get instructor session reliability stats' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MonitorController.prototype, "getInstructorStats", null);
exports.MonitorController = MonitorController = __decorate([
    (0, swagger_1.ApiTags)('Admin — Session Monitoring'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, common_1.Controller)('admin/session-monitoring'),
    __metadata("design:paramtypes", [monitor_service_1.MonitorService])
], MonitorController);
//# sourceMappingURL=monitor.controller.js.map