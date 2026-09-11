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
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const review_validation_service_1 = require("./review-validation.service");
const review_management_service_1 = require("./review-management.service");
const review_comment_service_1 = require("./review-comment.service");
const instructor_response_service_1 = require("./instructor-response.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsController = class ReviewsController {
    reviewValidation;
    reviewManagement;
    reviewComment;
    instructorResponse;
    prisma;
    constructor(reviewValidation, reviewManagement, reviewComment, instructorResponse, prisma) {
        this.reviewValidation = reviewValidation;
        this.reviewManagement = reviewManagement;
        this.reviewComment = reviewComment;
        this.instructorResponse = instructorResponse;
        this.prisma = prisma;
    }
    async getCourseReviews(courseId, isVerified, isFeatured, minRating, sortBy, limit, offset) {
        const filters = {
            is_verified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
            is_featured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
            min_rating: minRating ? parseInt(minRating) : undefined,
            sort_by: sortBy || 'recent',
            limit: limit ? parseInt(limit) : 10,
            offset: offset ? parseInt(offset) : 0,
        };
        return this.reviewManagement.getCourseReviews(courseId, filters);
    }
    async getCourseRatingStats(courseId) {
        return this.reviewManagement.getCourseRatingStats(courseId);
    }
    async createCourseReview(req, courseId, reviewData) {
        const userId = req.user.id;
        const validation = await this.reviewValidation.validateReviewSubmission(userId, courseId, reviewData);
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
            };
        }
        const review = await this.reviewManagement.createCourseReview(userId, courseId, reviewData);
        return {
            success: true,
            review,
            warnings: validation.warnings,
        };
    }
    async updateReview(req, reviewId, reviewData) {
        const userId = req.user.id;
        return this.reviewManagement.updateReview(reviewId, userId, reviewData);
    }
    async deleteReview(req, reviewId) {
        const userId = req.user.id;
        await this.reviewManagement.deleteReview(reviewId, userId);
    }
    async voteReviewHelpful(req, reviewId) {
        const userId = req.user.id;
        const existingVote = await this.prisma.reviewHelpfulVote.findFirst({
            where: {
                review_id: reviewId,
                user_id: userId,
            },
        });
        if (existingVote) {
            await this.prisma.reviewHelpfulVote.delete({
                where: { id: existingVote.id },
            });
            const review = await this.prisma.courseReview.update({
                where: { id: reviewId },
                data: {
                    helpful_count: {
                        decrement: 1,
                    },
                },
            });
            return { voted: false, helpful_count: review.helpful_count };
        }
        else {
            await this.prisma.reviewHelpfulVote.create({
                data: {
                    review_id: reviewId,
                    user_id: userId,
                    is_helpful: true,
                },
            });
            const review = await this.prisma.courseReview.update({
                where: { id: reviewId },
                data: {
                    helpful_count: {
                        increment: 1,
                    },
                },
            });
            return { voted: true, helpful_count: review.helpful_count };
        }
    }
    async reportReview(req, reviewId, reportData) {
        const userId = req.user.id;
        const report = await this.prisma.reviewReport.create({
            data: {
                review_id: reviewId,
                reporter_id: userId,
                reason: reportData.reason,
                description: reportData.description,
                status: 'pending',
            },
        });
        return { success: true, report };
    }
    async getReviewComments(reviewId, includeReplies) {
        return this.reviewComment.getReviewComments(reviewId, includeReplies === 'true');
    }
    async addComment(req, reviewId, commentData) {
        const userId = req.user.id;
        return this.reviewComment.addComment(userId, reviewId, commentData.comment, commentData.parent_id);
    }
    async updateComment(req, commentId, commentData) {
        const userId = req.user.id;
        return this.reviewComment.updateComment(commentId, userId, commentData.comment);
    }
    async deleteComment(req, commentId) {
        const userId = req.user.id;
        await this.reviewComment.deleteComment(commentId, userId);
    }
    async voteCommentHelpful(req, commentId) {
        const userId = req.user.id;
        return this.reviewComment.voteCommentHelpful(commentId, userId);
    }
    async createInstructorResponse(req, reviewId, responseData) {
        const instructorId = req.user.id;
        return this.instructorResponse.createInstructorResponse(instructorId, responseData.course_id, reviewId, responseData.response);
    }
    async updateInstructorResponse(req, responseId, responseData) {
        const instructorId = req.user.id;
        return this.instructorResponse.updateInstructorResponse(responseId, instructorId, responseData.response);
    }
    async deleteInstructorResponse(req, responseId) {
        const instructorId = req.user.id;
        await this.instructorResponse.deleteInstructorResponse(responseId, instructorId);
    }
    async toggleResponseVisibility(req, responseId) {
        const instructorId = req.user.id;
        return this.instructorResponse.toggleResponseVisibility(responseId, instructorId);
    }
    async getInstructorResponses(req, courseId) {
        const instructorId = req.user.id;
        return this.instructorResponse.getInstructorResponses(instructorId, courseId);
    }
    async moderateReview(req, reviewId, moderationData) {
        const moderatorId = req.user.id;
        await this.reviewManagement.moderateReview(reviewId, moderationData.action, moderatorId);
        return { success: true };
    }
    async moderateComment(req, commentId, moderationData) {
        const moderatorId = req.user.id;
        await this.reviewComment.moderateComment(commentId, moderationData.action, moderatorId);
        return { success: true };
    }
    async getPendingReports() {
        return this.prisma.reviewReport.findMany({
            where: {
                status: 'pending',
            },
            include: {
                review: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                            },
                        },
                        course: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
                reporter: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
    async reviewReport(req, reportId, reviewData) {
        const reviewedBy = req.user.id;
        await this.prisma.reviewReport.update({
            where: { id: reportId },
            data: {
                status: reviewData.status,
                reviewed_by: reviewedBy,
                reviewed_at: new Date(),
                resolution: reviewData.resolution,
            },
        });
        return { success: true };
    }
    async autoVerifyReviews() {
        const count = await this.reviewValidation.autoVerifyReviews();
        return { success: true, verified_count: count };
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)('course/:courseId'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Query)('is_verified')),
    __param(2, (0, common_1.Query)('is_featured')),
    __param(3, (0, common_1.Query)('min_rating')),
    __param(4, (0, common_1.Query)('sort_by')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getCourseReviews", null);
__decorate([
    (0, common_1.Get)('course/:courseId/stats'),
    __param(0, (0, common_1.Param)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getCourseRatingStats", null);
__decorate([
    (0, common_1.Post)('course/:courseId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('courseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createCourseReview", null);
__decorate([
    (0, common_1.Put)(':reviewId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateReview", null);
__decorate([
    (0, common_1.Delete)(':reviewId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "deleteReview", null);
__decorate([
    (0, common_1.Post)(':reviewId/helpful'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "voteReviewHelpful", null);
__decorate([
    (0, common_1.Post)(':reviewId/report'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "reportReview", null);
__decorate([
    (0, common_1.Get)(':reviewId/comments'),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Query)('include_replies')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getReviewComments", null);
__decorate([
    (0, common_1.Post)(':reviewId/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Put)('comments/:commentId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/helpful'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "voteCommentHelpful", null);
__decorate([
    (0, common_1.Post)(':reviewId/instructor-response'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createInstructorResponse", null);
__decorate([
    (0, common_1.Put)('instructor-responses/:responseId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('responseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateInstructorResponse", null);
__decorate([
    (0, common_1.Delete)('instructor-responses/:responseId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('responseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "deleteInstructorResponse", null);
__decorate([
    (0, common_1.Post)('instructor-responses/:responseId/toggle-visibility'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('responseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "toggleResponseVisibility", null);
__decorate([
    (0, common_1.Get)('instructor/responses'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('course_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getInstructorResponses", null);
__decorate([
    (0, common_1.Post)(':reviewId/moderate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "moderateReview", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/moderate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "moderateComment", null);
__decorate([
    (0, common_1.Get)('admin/reports/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getPendingReports", null);
__decorate([
    (0, common_1.Post)('admin/reports/:reportId/review'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reportId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "reviewReport", null);
__decorate([
    (0, common_1.Post)('admin/auto-verify'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "autoVerifyReviews", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, common_1.Controller)('reviews'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    __metadata("design:paramtypes", [review_validation_service_1.ReviewValidationService,
        review_management_service_1.ReviewManagementService,
        review_comment_service_1.ReviewCommentService,
        instructor_response_service_1.InstructorResponseService,
        prisma_service_1.PrismaService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map