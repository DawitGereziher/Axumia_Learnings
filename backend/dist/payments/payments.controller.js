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
    async verifyPaymentStatus(txRef) {
        return this.payments.verifyPaymentStatus(txRef);
    }
    async chapaWebhook(req, signature) {
        const rawBody = JSON.stringify(req.body);
        return this.payments.handleChapaWebhook(rawBody, signature);
    }
    myTransactions(user) {
        return this.payments.getMyTransactions(user.id);
    }
    getInstructorEarnings(user) {
        return this.payments.getInstructorEarnings(user.id);
    }
    requestInstructorPayout(user, body) {
        return this.payments.requestInstructorPayout(user.id, body);
    }
    requestPayout(txId, user) {
        return this.payments.getInstructorEarnings(user.id);
    }
    cleanupAbandoned() {
        return this.payments.cleanupAbandonedTransactions();
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('courses/:courseId/checkout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Chapa checkout for a course' }),
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
    (0, swagger_1.ApiOperation)({
        summary: 'Initiate Chapa checkout for a help session (upfront escrow)',
    }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initiateHelpSessionPayment", null);
__decorate([
    (0, common_1.Get)('verify/:tx_ref'),
    (0, swagger_1.ApiOperation)({ summary: '[Public] Verify payment status by tx_ref' }),
    __param(0, (0, common_1.Param)('tx_ref')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyPaymentStatus", null);
__decorate([
    (0, common_1.Post)('webhook/chapa'),
    (0, swagger_1.ApiOperation)({ summary: '[Webhook] Chapa payment confirmation' }),
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
    (0, swagger_1.ApiOperation)({ summary: 'Get my transaction history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "myTransactions", null);
__decorate([
    (0, common_1.Get)('instructor/earnings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Get earnings summary and payout history' }),
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
    (0, common_1.Post)('payouts/request/:transactionId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: '[Instructor] Request payout for a completed transaction',
    }),
    __param(0, (0, common_1.Param)('transactionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "requestPayout", null);
__decorate([
    (0, common_1.Post)('cleanup/abandoned'),
    (0, swagger_1.ApiOperation)({ summary: '[System] Cleanup abandoned pending transactions' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "cleanupAbandoned", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map