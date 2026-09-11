"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionMonitoringModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const prisma_module_1 = require("../prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
const oauth_service_1 = require("./oauth/oauth.service");
const oauth_controller_1 = require("./oauth/oauth.controller");
const zoom_webhook_controller_1 = require("./webhooks/zoom-webhook.controller");
const google_webhook_controller_1 = require("./webhooks/google-webhook.controller");
const webhook_guard_1 = require("./webhooks/webhook.guard");
const monitor_service_1 = require("./monitor/monitor.service");
const monitor_controller_1 = require("./monitor/monitor.controller");
let SessionMonitoringModule = class SessionMonitoringModule {
};
exports.SessionMonitoringModule = SessionMonitoringModule;
exports.SessionMonitoringModule = SessionMonitoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            prisma_module_1.PrismaModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [oauth_service_1.OAuthService, monitor_service_1.MonitorService, webhook_guard_1.WebhookGuard],
        controllers: [
            oauth_controller_1.OAuthController,
            zoom_webhook_controller_1.ZoomWebhookController,
            google_webhook_controller_1.GoogleWebhookController,
            monitor_controller_1.MonitorController,
        ],
        exports: [monitor_service_1.MonitorService],
    })
], SessionMonitoringModule);
//# sourceMappingURL=session-monitoring.module.js.map