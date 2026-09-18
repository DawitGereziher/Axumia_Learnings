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
const lessons_service_1 = require("./lessons.service");
const enrollment_service_1 = require("./enrollment.service");
const qa_service_1 = require("./qa.service");
const create_course_dto_1 = require("./dto/create-course.dto");
const update_course_dto_1 = require("./dto/update-course.dto");
const query_courses_dto_1 = require("./dto/query-courses.dto");
const add_lesson_dto_1 = require("./dto/add-lesson.dto");
const update_lesson_dto_1 = require("./dto/update-lesson.dto");
const add_section_dto_1 = require("./dto/add-section.dto");
const add_material_dto_1 = require("./dto/add-material.dto");
const record_progress_dto_1 = require("./dto/record-progress.dto");
let CoursesController = class CoursesController {
    courses;
    lessons;
    enrollment;
    qa;
    constructor(courses, lessons, enrollment, qa) {
        this.courses = courses;
        this.lessons = lessons;
        this.enrollment = enrollment;
        this.qa = qa;
    }
    findAll(query) {
        return this.courses.findAll(query);
    }
    listCategories() {
        return this.courses.listCategories();
    }
    findOne(slug) {
        return this.courses.findOne(slug);
    }
    findMyCourses(user) {
        return this.courses.findInstructorCourses(user.id);
    }
    getAnalytics(user) {
        return this.courses.getInstructorAnalytics(user.id);
    }
    create(user, dto) {
        return this.courses.create(user.id, dto);
    }
    update(id, user, dto) {
        return this.courses.update(id, user.id, dto);
    }
    publishCourse(id, user) {
        return this.courses.publishCourse(id, user.id);
    }
    archiveCourse(id, user) {
        return this.courses.archiveCourse(id, user.id);
    }
    getThumbnailUploadUrl(id, user, contentType) {
        return this.courses.getThumbnailUploadUrl(id, user.id, contentType);
    }
    addLesson(courseId, user, dto) {
        return this.lessons.addLesson(courseId, user.id, dto);
    }
    updateLesson(lessonId, user, dto) {
        return this.lessons.updateLesson(lessonId, user.id, dto);
    }
    deleteLesson(lessonId, user) {
        return this.lessons.deleteLesson(lessonId, user.id);
    }
    async getLessonVideoUrl(lessonId, user, request) {
        const requestIp = request.ip || request.connection?.remoteAddress;
        const userAgent = request.headers['user-agent'];
        const referrer = request.headers.referer || request.headers.referrer;
        return this.lessons.getLessonVideoUrl(lessonId, user.id, requestIp, userAgent, referrer);
    }
    getSections(courseId) {
        return this.lessons.getCourseSections(courseId);
    }
    addSection(courseId, user, dto) {
        return this.lessons.addSection(courseId, user.id, dto);
    }
    deleteSection(sectionId, user) {
        return this.lessons.deleteSection(sectionId, user.id);
    }
    addMaterial(lessonId, user, dto) {
        return this.lessons.addMaterial(lessonId, user.id, dto);
    }
    deleteMaterial(materialId, user) {
        return this.lessons.deleteMaterial(materialId, user.id);
    }
    getMaterialDownloadUrl(materialId, user) {
        return this.lessons.getMaterialDownloadUrl(materialId, user.id);
    }
    async checkPurchase(courseId, user) {
        const p = await this.enrollment.checkOwnership(user.id, courseId);
        return { purchased: !!p, purchaseId: p?.id ?? null };
    }
    enrollFree(courseId, user) {
        return this.enrollment.enrollFree(user.id, courseId);
    }
    recordProgress(lessonId, user, body) {
        return this.enrollment.updateProgress(user.id, body.purchaseId, lessonId, body.watchedSeconds, body.totalSeconds);
    }
    toggleLessonComplete(lessonId, user, body) {
        return this.enrollment.toggleLessonComplete(user.id, lessonId, body?.purchaseId);
    }
    getCourseProgress(courseId, user) {
        return this.enrollment.getCourseProgress(user.id, courseId);
    }
    toggleWishlist(courseId, user) {
        return this.enrollment.toggleWishlist(user.id, courseId);
    }
    getMyWishlist(user) {
        return this.enrollment.getUserWishlist(user.id);
    }
    validateCoupon(body) {
        return this.enrollment.validateCoupon(body.code);
    }
    getLessonQuestions(lessonId) {
        return this.qa.getLessonQuestions(lessonId);
    }
    postLessonQuestion(lessonId, user, body) {
        return this.qa.addLessonQuestion(user.id, lessonId, body.title, body.details);
    }
    postLessonAnswer(questionId, user, body) {
        return this.qa.addLessonAnswer(user.id, questionId, body.answer);
    }
    acceptAnswer(answerId, user) {
        return this.qa.acceptLessonAnswer(user.id, answerId);
    }
    upvoteQuestion(questionId, user) {
        return this.qa.upvoteLessonQuestion(questionId);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Browse published courses (paginated, filterable, cached 5min)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_courses_dto_1.QueryCoursesDto]),
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
    (0, common_1.Get)(':slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course details by slug or ID' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('instructor/mine'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] List my courses (all statuses)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "findMyCourses", null);
__decorate([
    (0, common_1.Get)('instructor/analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Get revenue, enrollment, and completion analytics' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Create a new course (starts as draft)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_course_dto_1.CreateCourseDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Update course content/metadata (cannot change status here)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_course_dto_1.UpdateCourseDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Publish course (must have title, description, and ≥1 lesson)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "publishCourse", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Archive (soft-delete) a course — hides from browse, preserves data' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "archiveCourse", null);
__decorate([
    (0, common_1.Post)(':id/thumbnail-upload-url'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Get pre-signed R2 PUT URL for course thumbnail upload' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { contentType: { type: 'string', example: 'image/jpeg' } } } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('contentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getThumbnailUploadUrl", null);
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
    __metadata("design:paramtypes", [String, Object, add_lesson_dto_1.AddLessonDto]),
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
    __metadata("design:paramtypes", [String, Object, update_lesson_dto_1.UpdateLessonDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:lessonId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Delete lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "deleteLesson", null);
__decorate([
    (0, common_1.Get)('lessons/:lessonId/video-url'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed video URL for a lesson (rate-limited, logged)' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLessonVideoUrl", null);
__decorate([
    (0, common_1.Get)(':id/sections'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sections for a course (public)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getSections", null);
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
    __metadata("design:paramtypes", [String, Object, add_section_dto_1.AddSectionDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addSection", null);
__decorate([
    (0, common_1.Delete)('sections/:sectionId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '[Instructor] Delete section (lessons moved to course root)' }),
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
    __metadata("design:paramtypes", [String, Object, add_material_dto_1.AddMaterialDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addMaterial", null);
__decorate([
    (0, common_1.Delete)('materials/:materialId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
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
    (0, swagger_1.ApiOperation)({ summary: 'Get signed download URL for lesson material (purchase required for paid)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getMaterialDownloadUrl", null);
__decorate([
    (0, common_1.Get)(':id/check-purchase'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Check if current user has purchased this course' }),
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
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "enrollFree", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/progress'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Record lesson watch progress (anti-cheat, 80% threshold, user-ownership verified)' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, record_progress_dto_1.RecordProgressDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "recordProgress", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/toggle-complete'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle completion status for any lesson (video, pdf, reading)' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, record_progress_dto_1.ToggleCompleteDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "toggleLessonComplete", null);
__decorate([
    (0, common_1.Get)(':id/progress'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get full course progress for authenticated student' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getCourseProgress", null);
__decorate([
    (0, common_1.Post)(':id/wishlist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle wishlist status for a course' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "toggleWishlist", null);
__decorate([
    (0, common_1.Get)('wishlist/mine'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user wishlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getMyWishlist", null);
__decorate([
    (0, common_1.Post)('coupons/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate a promotional coupon code' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_progress_dto_1.ValidateCouponDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "validateCoupon", null);
__decorate([
    (0, common_1.Get)('lessons/:lessonId/questions'),
    (0, swagger_1.ApiOperation)({ summary: 'List Q&A questions for a lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
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
    __metadata("design:paramtypes", [String, Object, record_progress_dto_1.AddQuestionDto]),
    __metadata("design:returntype", void 0)
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
    __metadata("design:paramtypes", [String, Object, record_progress_dto_1.AddAnswerDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "postLessonAnswer", null);
__decorate([
    (0, common_1.Patch)('answers/:answerId/accept'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Accept best answer for a question (question owner only)' }),
    __param(0, (0, common_1.Param)('answerId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "acceptAnswer", null);
__decorate([
    (0, common_1.Post)('questions/:questionId/upvote'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Upvote a question (auth required to prevent manipulation)' }),
    __param(0, (0, common_1.Param)('questionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "upvoteQuestion", null);
exports.CoursesController = CoursesController = __decorate([
    (0, swagger_1.ApiTags)('Courses'),
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService,
        lessons_service_1.LessonsService,
        enrollment_service_1.EnrollmentService,
        qa_service_1.QaService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map