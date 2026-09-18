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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const users_service_1 = require("./users.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const instructor_profile_dto_1 = require("./dto/instructor-profile.dto");
const storage_service_1 = require("../storage/storage.service");
const common_2 = require("@nestjs/common");
let UsersController = class UsersController {
    usersService;
    storageService;
    constructor(usersService, storageService) {
        this.usersService = usersService;
        this.storageService = storageService;
    }
    async getMe(user) {
        return this.usersService.getProfile(user.id);
    }
    async updateMe(user, dto) {
        return this.usersService.updateProfile(user.id, dto);
    }
    async uploadAvatar(user, file) {
        if (!file)
            throw new common_2.BadRequestException('No file provided');
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_2.BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new common_2.BadRequestException('Avatar must be under 5 MB');
        }
        const ext = file.originalname.split('.').pop() || 'jpg';
        const key = this.storageService.buildKey('profile', user.id, `avatar.${ext}`);
        const uploadUrl = await this.storageService.getUploadUrl('public', key, file.mimetype);
        const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
        const imageUrl = publicDomain ? `${publicDomain}/${key}` : uploadUrl.split('?')[0];
        await this.usersService.updateProfile(user.id, { image: imageUrl });
        return { uploadUrl, imageUrl, key };
    }
    async getDashboard(user) {
        return this.usersService.getStudentDashboard(user.id);
    }
    async getMyPurchases(user) {
        return this.usersService.getPurchases(user.id);
    }
    async submitInstructorProfile(user, dto) {
        return this.usersService.submitInstructorProfile(user.id, dto);
    }
    async updateRichProfile(user, dto) {
        return this.usersService.updateRichInstructorProfile(user.id, dto);
    }
    async listInstructors(page, limit, search) {
        return this.usersService.listInstructors(page, limit, search);
    }
    async getPublicProfile(profileId) {
        return this.usersService.getPublicInstructorProfile(profileId);
    }
    async getInstructor(id) {
        return this.usersService.getPublicInstructorProfile(id);
    }
    async createInstructorReview(profileId, user, dto) {
        return this.usersService.createInstructorReview(user.id, profileId, dto);
    }
    async toggleFollow(profileId, user) {
        return this.usersService.toggleFollowInstructor(user.id, profileId);
    }
    async getFollowStatus(profileId, req) {
        const userId = req.user?.id ?? null;
        return this.usersService.getFollowStatus(userId, profileId);
    }
    async updateKyc(userId, dto) {
        return this.usersService.updateKycStatus(userId, dto.status);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile with instructor profile if applicable' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile (name, phone, image URL)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/avatar'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a new avatar/profile picture directly to R2' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Get)('me/dashboard'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get student dashboard: enrolled courses with progress, upcoming bookings, certificates, XP' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('me/purchases'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user course purchases' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyPurchases", null);
__decorate([
    (0, common_1.Post)('me/instructor-profile'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Submit / update instructor KYC profile (triggers admin review)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, instructor_profile_dto_1.SubmitInstructorProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "submitInstructorProfile", null);
__decorate([
    (0, common_1.Patch)('me/instructor-profile/rich'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Update rich profile — bio, skills, social links, etc.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, instructor_profile_dto_1.UpdateRichInstructorProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRichProfile", null);
__decorate([
    (0, common_1.Get)('instructors'),
    (0, swagger_1.ApiOperation)({ summary: 'Browse approved instructors (paginated, optional search)' }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listInstructors", null);
__decorate([
    (0, common_1.Get)('instructors/:profileId/public'),
    (0, swagger_1.ApiOperation)({ summary: 'Get full public instructor profile — courses, reviews, stats' }),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicProfile", null);
__decorate([
    (0, common_1.Get)('instructors/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get instructor public profile (alias for /public endpoint)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getInstructor", null);
__decorate([
    (0, common_1.Post)('instructors/:profileId/reviews'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a review for an instructor (must be enrolled in one of their courses)' }),
    __param(0, (0, common_1.Param)('profileId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, instructor_profile_dto_1.CreateInstructorReviewDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createInstructorReview", null);
__decorate([
    (0, common_1.Post)('instructors/:profileId/follow'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle follow/unfollow for an instructor' }),
    __param(0, (0, common_1.Param)('profileId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleFollow", null);
__decorate([
    (0, common_1.Get)('instructors/:profileId/follow-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get follow status and follower count for an instructor' }),
    __param(0, (0, common_1.Param)('profileId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getFollowStatus", null);
__decorate([
    (0, common_1.Patch)('admin/:userId/kyc'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Admin] Approve or reject instructor KYC' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, instructor_profile_dto_1.UpdateKycStatusDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateKyc", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        storage_service_1.StorageService])
], UsersController);
//# sourceMappingURL=users.controller.js.map