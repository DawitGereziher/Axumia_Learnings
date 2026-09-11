"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const help_requests_controller_1 = require("./help-requests.controller");
const help_requests_service_1 = require("./help-requests.service");
const notifications_module_1 = require("../notifications/notifications.module");
const payments_module_1 = require("../payments/payments.module");
let HelpRequestsModule = class HelpRequestsModule {
};
exports.HelpRequestsModule = HelpRequestsModule;
exports.HelpRequestsModule = HelpRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule, payments_module_1.PaymentsModule],
        controllers: [help_requests_controller_1.HelpRequestsController],
        providers: [help_requests_service_1.HelpRequestsService],
        exports: [help_requests_service_1.HelpRequestsService],
    })
], HelpRequestsModule);
//# sourceMappingURL=help-requests.module.js.map