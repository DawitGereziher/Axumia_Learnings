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
exports.GamificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const gamification_service_1 = require("./gamification.service");
const award_xp_dto_1 = require("./dto/award-xp.dto");
let GamificationController = class GamificationController {
    gamification;
    constructor(gamification) {
        this.gamification = gamification;
    }
    getMyStats(user) {
        return this.gamification.getMyStats(user.id);
    }
    getLeaderboard() {
        return this.gamification.getLeaderboard();
    }
    awardXP(dto, user) {
        return this.gamification.awardXP(user.id, dto);
    }
};
exports.GamificationController = GamificationController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get current user's XP, level, streak, and badges" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GamificationController.prototype, "getMyStats", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Top 10 learners by XP' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GamificationController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Post)('award'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Award XP for a learning event (called by frontend)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [award_xp_dto_1.AwardXPDto, Object]),
    __metadata("design:returntype", void 0)
], GamificationController.prototype, "awardXP", null);
exports.GamificationController = GamificationController = __decorate([
    (0, swagger_1.ApiTags)('Gamification'),
    (0, common_1.Controller)('gamification'),
    __metadata("design:paramtypes", [gamification_service_1.GamificationService])
], GamificationController);
//# sourceMappingURL=gamification.controller.js.map