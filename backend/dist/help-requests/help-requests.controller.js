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
exports.HelpRequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const help_requests_service_1 = require("./help-requests.service");
const create_help_request_dto_1 = require("./dto/create-help-request.dto");
const create_bid_dto_1 = require("./dto/create-bid.dto");
let HelpRequestsController = class HelpRequestsController {
    helpRequests;
    constructor(helpRequests) {
        this.helpRequests = helpRequests;
    }
    listOpen(subject) {
        return this.helpRequests.listOpenRequests(subject);
    }
    adminListAll() {
        return this.helpRequests.adminListAll();
    }
    create(user, dto) {
        return this.helpRequests.createRequest(user.id, dto);
    }
    myRequests(user) {
        return this.helpRequests.getMyRequests(user.id);
    }
    acceptBid(bidId, user) {
        return this.helpRequests.acceptBid(user.id, bidId);
    }
    cancel(id, user) {
        return this.helpRequests.cancelRequest(user.id, id);
    }
    myBids(user) {
        return this.helpRequests.getMyBids(user.id);
    }
    submitBid(requestId, user, dto) {
        return this.helpRequests.submitBid(user.id, requestId, dto);
    }
    setLink(sessionId, user, body) {
        return this.helpRequests.setMeetingLink(user.id, sessionId, body.meetingLink);
    }
    updateSession(sessionId, user, body) {
        return this.helpRequests.updateSession(user.id, sessionId, body);
    }
    complete(sessionId, user, body) {
        return this.helpRequests.completeSession(user.id, sessionId, body.actualHours);
    }
    getOne(id, user) {
        return this.helpRequests.getRequest(id, user.id);
    }
};
exports.HelpRequestsController = HelpRequestsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Browse open help requests' }),
    (0, swagger_1.ApiQuery)({ name: 'subject', required: false }),
    __param(0, (0, common_1.Query)('subject')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "listOpen", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Admin] List all help requests' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "adminListAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Student] Post a new help request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_help_request_dto_1.CreateHelpRequestDto]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Student] My posted help requests' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "myRequests", null);
__decorate([
    (0, common_1.Patch)('bids/:bidId/accept'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({
        summary: '[Student] Accept a bid — creates session & triggers payment',
    }),
    __param(0, (0, common_1.Param)('bidId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "acceptBid", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Student] Cancel an open request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('bids/mine'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] My submitted bids' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "myBids", null);
__decorate([
    (0, common_1.Post)(':id/bids'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Submit a bid on a help request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_bid_dto_1.CreateBidDto]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "submitBid", null);
__decorate([
    (0, common_1.Patch)('sessions/:id/link'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Helper] Set meeting link for a help session' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "setLink", null);
__decorate([
    (0, common_1.Patch)('sessions/:id'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Helper] Update help session details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Patch)('sessions/:id/complete'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Helper] Mark a help session as complete' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single help request with bids' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HelpRequestsController.prototype, "getOne", null);
exports.HelpRequestsController = HelpRequestsController = __decorate([
    (0, swagger_1.ApiTags)('Help Requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('help-requests'),
    __metadata("design:paramtypes", [help_requests_service_1.HelpRequestsService])
], HelpRequestsController);
//# sourceMappingURL=help-requests.controller.js.map