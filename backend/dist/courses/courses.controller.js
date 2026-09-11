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
exports.CoursesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const courses_service_1 = require("./courses.service");
let CoursesController = class CoursesController {
    courses;
    constructor(courses) {
        this.courses = courses;
    }
    findAll(query) {
        return this.courses.findAll({
            ...query,
            minPrice: query.minPrice ? +query.minPrice : undefined,
            maxPrice: query.maxPrice ? +query.maxPrice : undefined,
            minRating: query.rating ? +query.rating : query.minRating ? +query.minRating : undefined,
            page: query.page ? +query.page : 1,
            limit: query.limit ? +query.limit : 20,
        });
    }
    listCategories() {
        return this.courses.listCategories();
    }
    findMyCourses(user) {
        return this.courses.findInstructorCourses(user.id);
    }
    async checkPurchase(courseId, user) {
        const p = await this.courses.checkOwnership(user.id, courseId);
        return { purchased: !!p, purchaseId: p?.id ?? null };
    }
    async enrollFree(courseId, user) {
        return this.courses.enrollFree(user.id, courseId);
    }
    findOne(slug) {
        return this.courses.findOne(slug);
    }
    create(user, dto) {
        return this.courses.create(user.id, dto);
    }
    update(id, user, dto) {
        return this.courses.update(id, user.id, dto);
    }
    addLesson(courseId, user, dto) {
        return this.courses.addLesson(courseId, user.id, dto);
    }
    updateLesson(lessonId, user, dto) {
        return this.courses.updateLesson(lessonId, user.id, dto);
    }
    deleteLesson(lessonId, user) {
        return this.courses.deleteLesson(lessonId, user.id);
    }
    addSection(courseId, user, dto) {
        return this.courses.addSection(courseId, user.id, dto);
    }
    deleteSection(sectionId, user) {
        return this.courses.deleteSection(sectionId, user.id);
    }
    addMaterial(lessonId, user, dto) {
        return this.courses.addMaterial(lessonId, user.id, dto);
    }
    deleteMaterial(materialId, user) {
        return this.courses.deleteMaterial(materialId, user.id);
    }
    async getMaterialDownloadUrl(materialId, user) {
        return await this.courses.getMaterialDownloadUrl(materialId, user.id);
    }
    async getLessonVideoUrl(lessonId, user, request) {
        const requestIp = request.ip || request.connection.remoteAddress;
        const userAgent = request.headers['user-agent'];
        const referrer = request.headers.referer || request.headers.referrer;
        return await this.courses.getLessonVideoUrl(lessonId, user.id, requestIp, userAgent, referrer);
    }
    async recordProgress(lessonId, user, body) {
        return this.courses.updateProgress(body.purchaseId, lessonId, body.watchedSeconds, body.totalSeconds);
    }
    async getCourseProgress(courseId, user) {
        return this.courses.getCourseProgress(user.id, courseId);
    }
    async getSections(courseId) {
        return this.courses.getCourseSections(courseId);
    }
    async toggleWishlist(courseId, user) {
        return this.courses.toggleWishlist(user.id, courseId);
    }
    async getMyWishlist(user) {
        return this.courses.getUserWishlist(user.id);
    }
    async validateCoupon(body) {
        return this.courses.validateCoupon(body.code);
    }
    async getLessonQuestions(lessonId) {
        return this.courses.getLessonQuestions(lessonId);
    }
    async postLessonQuestion(lessonId, user, body) {
        return this.courses.addLessonQuestion(user.id, lessonId, body.title, body.details);
    }
    async postLessonAnswer(questionId, user, body) {
        return this.courses.addLessonAnswer(user.id, questionId, body.answer);
    }
    async acceptAnswer(answerId, user) {
        return this.courses.acceptLessonAnswer(user.id, answerId);
    }
    async upvoteQuestion(questionId) {
        return this.courses.upvoteLessonQuestion(questionId);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Browse published courses' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'level', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'language', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'priceRange', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sort', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'List course categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)('instructor/mine'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] List my created courses' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "findMyCourses", null);
__decorate([
    (0, common_1.Get)(':id/check-purchase'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Check if user has purchased this course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "checkPurchase", null);
__decorate([
    (0, common_1.Post)(':id/enroll-free'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll in a free (price=0) course without payment' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "enrollFree", null);
__decorate([
    (0, common_1.Get)(':slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course details by slug' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Create a new course' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Update course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/lessons'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Add lesson to course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addLesson", null);
__decorate([
    (0, common_1.Patch)('lessons/:lessonId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Update lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:lessonId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Delete lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "deleteLesson", null);
__decorate([
    (0, common_1.Post)(':id/sections'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Add section to course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addSection", null);
__decorate([
    (0, common_1.Delete)('sections/:sectionId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Delete section' }),
    __param(0, (0, common_1.Param)('sectionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "deleteSection", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/materials'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Add material to lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addMaterial", null);
__decorate([
    (0, common_1.Delete)('materials/:materialId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Delete material' }),
    __param(0, (0, common_1.Param)('materialId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "deleteMaterial", null);
__decorate([
    (0, common_1.Get)('materials/:id/download-url'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed download URL for lesson material' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getMaterialDownloadUrl", null);
__decorate([
    (0, common_1.Get)('lessons/:lessonId/video-url'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed video URL for a lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLessonVideoUrl", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/progress'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Record lesson watch progress (anti-cheat, 80% threshold)' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "recordProgress", null);
__decorate([
    (0, common_1.Get)(':id/progress'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get full course progress for the authenticated student' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCourseProgress", null);
__decorate([
    (0, common_1.Get)(':id/sections'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get sections for a course' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getSections", null);
__decorate([
    (0, common_1.Post)(':id/wishlist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle wishlist status for a course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "toggleWishlist", null);
__decorate([
    (0, common_1.Get)('wishlist/mine'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user wishlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getMyWishlist", null);
__decorate([
    (0, common_1.Post)('coupons/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate promotional coupon code' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "validateCoupon", null);
__decorate([
    (0, common_1.Get)('lessons/:lessonId/questions'),
    (0, swagger_1.ApiOperation)({ summary: 'List Q&A questions for a lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLessonQuestions", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/questions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Post a question for a lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "postLessonQuestion", null);
__decorate([
    (0, common_1.Post)('questions/:questionId/answers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Answer a lesson question' }),
    __param(0, (0, common_1.Param)('questionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "postLessonAnswer", null);
__decorate([
    (0, common_1.Patch)('answers/:answerId/accept'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Accept best answer for a question' }),
    __param(0, (0, common_1.Param)('answerId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "acceptAnswer", null);
__decorate([
    (0, common_1.Post)('questions/:questionId/upvote'),
    (0, swagger_1.ApiOperation)({ summary: 'Upvote a question' }),
    __param(0, (0, common_1.Param)('questionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "upvoteQuestion", null);
exports.CoursesController = CoursesController = __decorate([
    (0, swagger_1.ApiTags)('Courses'),
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map