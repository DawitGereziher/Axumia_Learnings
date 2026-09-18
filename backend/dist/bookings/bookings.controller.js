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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const bookings_service_1 = require("./bookings.service");
let BookingsController = class BookingsController {
    bookings;
    constructor(bookings) {
        this.bookings = bookings;
    }
    getInstructorSlots(profileId) {
        return this.bookings.getInstructorSlots(profileId);
    }
    requestBooking(slotId, user, body) {
        return this.bookings.requestBooking(user.id, slotId, body?.session_type || '1-on-1', body?.notes, user.email, user.name);
    }
    myBookings(user) {
        return this.bookings.getStudentBookings(user.id);
    }
    cancelBooking(id, user) {
        return this.bookings.cancelBooking(id, user.id);
    }
    createSlot(user, dto) {
        return this.bookings.createSlot(user.id, dto);
    }
    confirm(id, user, body) {
        return this.bookings.confirmBooking(id, user.id, body.meetingLink);
    }
    reject(id, user, body) {
        return this.bookings.rejectBooking(id, user.id, body?.reason);
    }
    instructorBookings(user) {
        return this.bookings.getInstructorBookings(user.id);
    }
    completeBooking(id) {
        return this.bookings.completeBooking(id, true);
    }
    noShow(id) {
        return this.bookings.markNoShow(id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)('slots/instructor/:profileId'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get available slots for an instructor (auth required)' }),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getInstructorSlots", null);
__decorate([
    (0, common_1.Post)('request/:slotId'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: '[Student] Request a booking — immediately initiates payment (returns checkoutUrl)',
    }),
    __param(0, (0, common_1.Param)('slotId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "requestBooking", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: '[Student] List my bookings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "myBookings", null);
__decorate([
    (0, common_1.Delete)(':id/cancel'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '[Student] Cancel a booking (only allowed before confirmation)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.Post)('slots'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Create an availability slot' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "createSlot", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({
        summary: '[Instructor] Confirm a paid booking and add meeting link',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '[Instructor] Reject a pending booking (triggers student refund)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)('instructor/mine'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] List my bookings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "instructorBookings", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '[Admin] Mark booking as completed — gates payout via session monitoring',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "completeBooking", null);
__decorate([
    (0, common_1.Patch)(':id/no-show'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Admin] Mark booking as no-show' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "noShow", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map