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
var ZoomWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoomWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const webhook_guard_1 = require("./webhook.guard");
const monitor_service_1 = require("../monitor/monitor.service");
let ZoomWebhookController = ZoomWebhookController_1 = class ZoomWebhookController {
    monitorService;
    logger = new common_1.Logger(ZoomWebhookController_1.name);
    constructor(monitorService) {
        this.monitorService = monitorService;
    }
    async handleZoomWebhook(body, _sig) {
        const eventType = body?.event;
        const payload = body?.payload;
        this.logger.debug(`Zoom event received: ${eventType}`);
        switch (eventType) {
            case 'endpoint.url_validation': {
                const token = payload?.plainToken;
                if (!token)
                    return { message: 'missing plainToken' };
                const hash = require('crypto')
                    .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET ?? '')
                    .update(token)
                    .digest('hex');
                return { plainToken: token, encryptedToken: hash };
            }
            case 'meeting.started': {
                const meetingId = String(payload?.object?.id);
                const startTime = payload?.object?.start_time
                    ? new Date(payload.object.start_time)
                    : new Date();
                await this.monitorService.onZoomSessionStarted(meetingId, startTime);
                break;
            }
            case 'meeting.ended': {
                const meetingId = String(payload?.object?.id);
                const endTime = payload?.object?.end_time
                    ? new Date(payload.object.end_time)
                    : new Date();
                await this.monitorService.onZoomSessionEnded(meetingId, endTime);
                break;
            }
            case 'meeting.participant_joined': {
                const meetingId = String(payload?.object?.id);
                const participantCount = payload?.object?.participant?.total_in_room ?? 1;
                await this.monitorService.onParticipantEvent(meetingId, 'joined', participantCount, body);
                break;
            }
            case 'meeting.participant_left': {
                const meetingId = String(payload?.object?.id);
                const participantCount = payload?.object?.participant?.total_in_room ?? 0;
                await this.monitorService.onParticipantEvent(meetingId, 'left', participantCount, body);
                break;
            }
            default:
                this.logger.verbose(`Unhandled Zoom event type: ${eventType}`);
        }
        return { received: true };
    }
};
exports.ZoomWebhookController = ZoomWebhookController;
__decorate([
    (0, common_1.Post)('zoom'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(webhook_guard_1.WebhookGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    (0, swagger_1.ApiOperation)({ summary: 'Zoom webhook receiver' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-zm-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ZoomWebhookController.prototype, "handleZoomWebhook", null);
exports.ZoomWebhookController = ZoomWebhookController = ZoomWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [monitor_service_1.MonitorService])
], ZoomWebhookController);
//# sourceMappingURL=zoom-webhook.controller.js.map