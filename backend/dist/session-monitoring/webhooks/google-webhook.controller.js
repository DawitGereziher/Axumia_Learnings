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
var GoogleWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const webhook_guard_1 = require("./webhook.guard");
const monitor_service_1 = require("../monitor/monitor.service");
let GoogleWebhookController = GoogleWebhookController_1 = class GoogleWebhookController {
    monitorService;
    logger = new common_1.Logger(GoogleWebhookController_1.name);
    constructor(monitorService) {
        this.monitorService = monitorService;
    }
    async handleGoogleWebhook(body, resourceState, channelId, resourceId, messageNumber) {
        this.logger.debug(`Google Calendar webhook: state=${resourceState} channel=${channelId} msg=${messageNumber}`);
        if (resourceState === 'sync') {
            this.logger.log(`Google Calendar channel ${channelId} sync confirmed`);
            return { received: true };
        }
        if (resourceState === 'exists') {
            const match = channelId.match(/axumia-meet-([a-f0-9-]+)-(.+)/);
            if (!match) {
                this.logger.warn(`Unrecognised Google channel ID format: ${channelId}`);
                return { received: true };
            }
            const [, bookingId, meetCode] = match;
            await this.monitorService.onGoogleCalendarUpdate(bookingId, meetCode, body);
        }
        return { received: true };
    }
};
exports.GoogleWebhookController = GoogleWebhookController;
__decorate([
    (0, common_1.Post)('google'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(webhook_guard_1.WebhookGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-goog-resource-state')),
    __param(2, (0, common_1.Headers)('x-goog-channel-id')),
    __param(3, (0, common_1.Headers)('x-goog-resource-id')),
    __param(4, (0, common_1.Headers)('x-goog-message-number')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GoogleWebhookController.prototype, "handleGoogleWebhook", null);
exports.GoogleWebhookController = GoogleWebhookController = GoogleWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [monitor_service_1.MonitorService])
], GoogleWebhookController);
//# sourceMappingURL=google-webhook.controller.js.map