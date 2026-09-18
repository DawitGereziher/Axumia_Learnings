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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const payments_service_1 = require("./payments.service");
let PaymentsController = class PaymentsController {
    payments;
    constructor(payments) {
        this.payments = payments;
    }
    initiateCoursePayment(courseId, user) {
        return this.payments.initiateCoursePayment(user.id, courseId, user.email, user.name);
    }
    initiateBookingPayment(bookingId, user) {
        return this.payments.initiateBookingPayment(user.id, bookingId, user.email, user.name);
    }
    initiateHelpSessionPayment(sessionId, user) {
        return this.payments.initiateHelpSessionPayment(user.id, sessionId, user.email, user.name);
    }
    verifyPaymentStatus(txRef, user) {
        return this.payments.verifyPaymentStatus(txRef, user.id);
    }
    async chapaWebhook(req, signature) {
        const rawBody = JSON.stringify(req.body);
        return this.payments.handleChapaWebhook(rawBody, signature);
    }
    myTransactions(user, page, limit) {
        return this.payments.getMyTransactions(user.id, page, limit);
    }
    getInstructorEarnings(user) {
        return this.payments.getInstructorEarnings(user.id);
    }
    requestInstructorPayout(user, body) {
        return this.payments.requestInstructorPayout(user.id, body);
    }
    cleanupAbandoned() {
        return this.payments.cleanupAbandonedTransactions();
    }
    refundTransaction(txRef, user, body) {
        return this.payments.refundTransaction(txRef, user.id, body?.amount, body?.reason);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('courses/:courseId/checkout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Chapa checkout for a course purchase' }),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initiateCoursePayment", null);
__decorate([
    (0, common_1.Post)('bookings/:bookingId/checkout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Chapa checkout for a session booking' }),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initiateBookingPayment", null);
__decorate([
    (0, common_1.Post)('help-sessions/:sessionId/checkout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Chapa checkout for a help session (upfront escrow)' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initiateHelpSessionPayment", null);
__decorate([
    (0, common_1.Get)('verify/:tx_ref'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Verify payment status by tx_ref (auth required, owned transactions only)' }),
    __param(0, (0, common_1.Param)('tx_ref')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "verifyPaymentStatus", null);
__decorate([
    (0, common_1.Post)('webhook/chapa'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Webhook] Chapa payment confirmation — always returns 200' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-chapa-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "chapaWebhook", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiOperation)({ summary: 'Get my transaction history (paginated, metadata redacted)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "myTransactions", null);
__decorate([
    (0, common_1.Get)('instructor/earnings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Get earnings summary and payout history (paid bookings only)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getInstructorEarnings", null);
__decorate([
    (0, common_1.Post)('instructor/payout-request'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Submit payout request for available balance' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "requestInstructorPayout", null);
__decorate([
    (0, common_1.Post)('admin/cleanup-abandoned'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Admin] Soft-mark stale pending transactions as abandoned (audit-safe)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "cleanupAbandoned", null);
__decorate([
    (0, common_1.Post)('admin/refund/:tx_ref'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Admin] Issue full or partial refund via Chapa — marks transaction as refunded, cancels booking/session' }),
    __param(0, (0, common_1.Param)('tx_ref')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "refundTransaction", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map