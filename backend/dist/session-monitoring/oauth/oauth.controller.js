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
exports.OAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const oauth_service_1 = require("./oauth.service");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../../common/guards/d-auth.guard");
let OAuthController = class OAuthController {
    oauthService;
    config;
    constructor(oauthService, config) {
        this.oauthService = oauthService;
        this.config = config;
    }
    connectZoom(req, res) {
        const userId = req.user?.sub ?? req.user?.id;
        const url = this.oauthService.getZoomAuthUrl(userId);
        return res.redirect(url);
    }
    async zoomCallback(code, state, res) {
        await this.oauthService.handleZoomCallback(code, state);
        const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3001';
        return res.redirect(`${frontendUrl}/settings/instructor?tab=video&connected=zoom`);
    }
    connectGoogle(req, res) {
        const userId = req.user?.sub ?? req.user?.id;
        const url = this.oauthService.getGoogleAuthUrl(userId);
        return res.redirect(url);
    }
    async googleCallback(code, state, res) {
        await this.oauthService.handleGoogleCallback(code, state);
        const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3001';
        return res.redirect(`${frontendUrl}/settings/instructor?tab=video&connected=google`);
    }
    getAuthUrl(platform, req) {
        const userId = req.user?.sub ?? req.user?.id;
        const url = platform === 'zoom'
            ? this.oauthService.getZoomAuthUrl(userId)
            : this.oauthService.getGoogleAuthUrl(userId);
        return { authUrl: url };
    }
    async getVideoAccounts(req) {
        const userId = req.user?.sub ?? req.user?.id;
        const accounts = await this.oauthService.getVideoAccounts(userId);
        return { accounts };
    }
    async deleteVideoAccount(id, req) {
        const userId = req.user?.sub ?? req.user?.id;
        await this.oauthService.deleteVideoAccount(id, userId);
        return { success: true };
    }
    getStatus(req) {
        const userId = req.user?.sub ?? req.user?.id;
        return this.oauthService.getConnectionStatus(userId);
    }
    disconnect(platform, req) {
        const userId = req.user?.sub ?? req.user?.id;
        return this.oauthService.disconnectPlatform(userId, platform);
    }
    async createZoomMeeting(req, body) {
        const userId = req.user?.sub ?? req.user?.id;
        const startTime = new Date(body.startTime);
        const result = await this.oauthService.createZoomMeeting(userId, body.topic, startTime, body.durationMinutes);
        return {
            meetingUrl: result.meetingUrl,
            meetingId: result.meetingId,
            platformMeetingId: result.platformMeetingId,
        };
    }
    async createGoogleMeetEvent(req, body) {
        const userId = req.user?.sub ?? req.user?.id;
        const startTime = new Date(body.startTime);
        const result = await this.oauthService.createGoogleMeetEvent(userId, body.title, startTime, body.durationMinutes);
        return {
            meetingUrl: result.meetingUrl,
            meetingId: result.meetingId,
            platformMeetingId: result.platformMeetingId,
        };
    }
    async checkAccountConnection(platform, req) {
        const userId = req.user?.sub ?? req.user?.id;
        const isConnected = await this.oauthService.hasConnectedAccount(userId, platform);
        return { connected: isConnected };
    }
};
exports.OAuthController = OAuthController;
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('zoom/connect'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Zoom OAuth flow for instructor' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "connectZoom", null);
__decorate([
    (0, common_1.Get)('zoom/callback'),
    (0, swagger_1.ApiOperation)({ summary: 'Zoom OAuth callback' }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "zoomCallback", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('google/connect'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Google OAuth flow for instructor' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "connectGoogle", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, swagger_1.ApiOperation)({ summary: 'Google OAuth callback' }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('oauth/:platform/auth-url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get OAuth authorization URL for a platform' }),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('video-accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all video accounts for logged-in instructor' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "getVideoAccounts", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Delete)('video-accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect a video account' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "deleteVideoAccount", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get linked platform status for logged-in instructor',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "getStatus", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Delete)(':platform/disconnect'),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect a linked Zoom or Google account' }),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "disconnect", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Post)('meetings/zoom'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Zoom meeting using connected account' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "createZoomMeeting", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Post)('meetings/google'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a Google Meet event using connected account',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "createGoogleMeetEvent", null);
__decorate([
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.Get)('accounts/:platform/check'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check if instructor has connected account for platform',
    }),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "checkAccountConnection", null);
exports.OAuthController = OAuthController = __decorate([
    (0, swagger_1.ApiTags)('Session Monitoring — OAuth'),
    (0, common_1.Controller)('session-monitoring'),
    __metadata("design:paramtypes", [oauth_service_1.OAuthService,
        config_1.ConfigService])
], OAuthController);
//# sourceMappingURL=oauth.controller.js.map