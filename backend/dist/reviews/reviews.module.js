"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseReviewsModule = void 0;
const common_1 = require("@nestjs/common");
const review_validation_service_1 = require("./review-validation.service");
const review_management_service_1 = require("./review-management.service");
const review_comment_service_1 = require("./review-comment.service");
const instructor_response_service_1 = require("./instructor-response.service");
const reviews_controller_1 = require("./reviews.controller");
const prisma_module_1 = require("../prisma/prisma.module");
let CourseReviewsModule = class CourseReviewsModule {
};
exports.CourseReviewsModule = CourseReviewsModule;
exports.CourseReviewsModule = CourseReviewsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [reviews_controller_1.ReviewsController],
        providers: [
            review_validation_service_1.ReviewValidationService,
            review_management_service_1.ReviewManagementService,
            review_comment_service_1.ReviewCommentService,
            instructor_response_service_1.InstructorResponseService,
        ],
        exports: [
            review_validation_service_1.ReviewValidationService,
            review_management_service_1.ReviewManagementService,
            review_comment_service_1.ReviewCommentService,
            instructor_response_service_1.InstructorResponseService,
        ],
    })
], CourseReviewsModule);
//# sourceMappingURL=reviews.module.js.map