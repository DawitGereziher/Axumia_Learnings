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
var ReviewManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewManagementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewManagementService = ReviewManagementService_1 = class ReviewManagementService {
    prisma;
    logger = new common_1.Logger(ReviewManagementService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCourseReview(userId, courseId, reviewData) {
        try {
            const completionInfo = await this.prisma.$queryRaw `
        SELECT 
          COUNT(lp.id) as completed_lessons,
          (SELECT COUNT(*) FROM course_lessons WHERE course_id = ${courseId}) as total_lessons
        FROM lesson_progress lp
        JOIN course_purchases cp ON lp.purchase_id = cp.id
        WHERE cp.user_id = ${userId} AND cp.course_id = ${courseId} AND lp.completed = true
      `;
            const completionData = completionInfo[0] || { completed_lessons: 0n, total_lessons: 0n };
            const completedLessons = Number(completionData.completed_lessons || 0n);
            const totalLessons = Number(completionData.total_lessons || 0n);
            const completionPercentage = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;
            const review = await this.prisma.courseReview.create({
                data: {
                    user_id: userId,
                    course_id: courseId,
                    overall_rating: reviewData.overall_rating,
                    content_quality: reviewData.content_quality || 0,
                    instructor_quality: reviewData.instructor_quality || 0,
                    course_structure: reviewData.course_structure || 0,
                    value_for_money: reviewData.value_for_money || 0,
                    title: reviewData.title,
                    comment: reviewData.comment,
                    pros: reviewData.pros || [],
                    cons: reviewData.cons || [],
                    completion_percentage: completionPercentage,
                    completed_lessons: completedLessons,
                    total_lessons: totalLessons,
                    is_verified: true,
                },
            });
            await this.updateCourseRatingStats(courseId);
            this.logger.log(`Created course review for user ${userId} on course ${courseId}`);
            return review;
        }
        catch (error) {
            this.logger.error('Error creating course review:', error);
            throw new Error('Failed to create review');
        }
    }
    async updateReview(reviewId, userId, reviewData) {
        try {
            const review = await this.prisma.courseReview.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new common_1.NotFoundException('Review not found');
            }
            if (review.user_id !== userId) {
                throw new common_1.ForbiddenException('You can only update your own reviews');
            }
            const updatedReview = await this.prisma.courseReview.update({
                where: { id: reviewId },
                data: {
                    overall_rating: reviewData.overall_rating || review.overall_rating,
                    content_quality: reviewData.content_quality || review.content_quality,
                    instructor_quality: reviewData.instructor_quality || review.instructor_quality,
                    course_structure: reviewData.course_structure || review.course_structure,
                    value_for_money: reviewData.value_for_money || review.value_for_money,
                    title: reviewData.title,
                    comment: reviewData.comment,
                    pros: reviewData.pros,
                    cons: reviewData.cons,
                },
            });
            await this.updateCourseRatingStats(review.course_id);
            return updatedReview;
        }
        catch (error) {
            this.logger.error('Error updating review:', error);
            throw new Error('Failed to update review');
        }
    }
    async deleteReview(reviewId, userId) {
        try {
            const review = await this.prisma.courseReview.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new common_1.NotFoundException('Review not found');
            }
            if (review.user_id !== userId) {
                throw new common_1.ForbiddenException('You can only delete your own reviews');
            }
            await this.prisma.courseReview.delete({
                where: { id: reviewId },
            });
            await this.updateCourseRatingStats(review.course_id);
            this.logger.log(`Deleted review ${reviewId} by user ${userId}`);
        }
        catch (error) {
            this.logger.error('Error deleting review:', error);
            throw new Error('Failed to delete review');
        }
    }
    async getCourseReviews(courseId, filters) {
        const where = {
            course_id: courseId,
            is_hidden: false,
        };
        if (filters.is_verified !== undefined) {
            where.is_verified = filters.is_verified;
        }
        if (filters.is_featured !== undefined) {
            where.is_featured = filters.is_featured;
        }
        if (filters.min_rating !== undefined) {
            where.overall_rating = { gte: filters.min_rating };
        }
        let orderBy = { created_at: 'desc' };
        if (filters.sort_by === 'helpful') {
            orderBy = { helpful_count: 'desc' };
        }
        else if (filters.sort_by === 'rating_high') {
            orderBy = { overall_rating: 'desc' };
        }
        else if (filters.sort_by === 'rating_low') {
            orderBy = { overall_rating: 'asc' };
        }
        const reviews = await this.prisma.courseReview.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        image: true,
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                image: true,
                            },
                        },
                    },
                },
            },
            orderBy,
            take: filters.limit || 10,
            skip: filters.offset || 0,
        });
        return reviews;
    }
    async getCourseRatingStats(courseId) {
        try {
            const reviews = await this.prisma.courseReview.findMany({
                where: {
                    course_id: courseId,
                    is_hidden: false,
                },
                select: {
                    overall_rating: true,
                    content_quality: true,
                    instructor_quality: true,
                    course_structure: true,
                    value_for_money: true,
                },
            });
            if (reviews.length === 0) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: {},
                    criteriaAverages: {
                        content_quality: 0,
                        instructor_quality: 0,
                        course_structure: 0,
                        value_for_money: 0,
                    },
                };
            }
            const total = reviews.length;
            const sumOverall = reviews.reduce((sum, r) => sum + r.overall_rating, 0);
            const averageRating = Math.round((sumOverall / total) * 10) / 10;
            const ratingDistribution = {};
            reviews.forEach(r => {
                ratingDistribution[r.overall_rating] = (ratingDistribution[r.overall_rating] || 0) + 1;
            });
            const criteriaAverages = {
                content_quality: this.calculateAverage(reviews.map(r => r.content_quality)),
                instructor_quality: this.calculateAverage(reviews.map(r => r.instructor_quality)),
                course_structure: this.calculateAverage(reviews.map(r => r.course_structure)),
                value_for_money: this.calculateAverage(reviews.map(r => r.value_for_money)),
            };
            return {
                averageRating,
                totalReviews: total,
                ratingDistribution,
                criteriaAverages,
            };
        }
        catch (error) {
            this.logger.error('Error calculating rating stats:', error);
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: {},
                criteriaAverages: {
                    content_quality: 0,
                    instructor_quality: 0,
                    course_structure: 0,
                    value_for_money: 0,
                },
            };
        }
    }
    async moderateReview(reviewId, action, moderatorId) {
        try {
            const updateData = {};
            if (action === 'hide') {
                updateData.is_hidden = true;
                updateData.is_flagged = true;
                updateData.moderated_by = moderatorId;
                updateData.moderated_at = new Date();
                updateData.moderation_reason = 'Hidden by moderator';
            }
            else if (action === 'show') {
                updateData.is_hidden = false;
                updateData.is_flagged = false;
                updateData.moderated_by = moderatorId;
                updateData.moderated_at = new Date();
                updateData.moderation_reason = 'Restored by moderator';
            }
            else if (action === 'feature') {
                updateData.is_featured = true;
            }
            await this.prisma.courseReview.update({
                where: { id: reviewId },
                data: updateData,
            });
            this.logger.log(`Moderated review ${reviewId} with action: ${action}`);
        }
        catch (error) {
            this.logger.error('Error moderating review:', error);
            throw new Error('Failed to moderate review');
        }
    }
    calculateAverage(values) {
        const nonZeroValues = values.filter(v => v > 0);
        if (nonZeroValues.length === 0)
            return 0;
        const sum = nonZeroValues.reduce((a, b) => a + b, 0);
        return Math.round((sum / nonZeroValues.length) * 10) / 10;
    }
    async updateCourseRatingStats(courseId) {
        try {
            const stats = await this.getCourseRatingStats(courseId);
            this.logger.log(`Course ${courseId} rating stats updated: ${stats.averageRating} avg, ${stats.totalReviews} total`);
        }
        catch (error) {
            this.logger.error('Error updating course rating stats:', error);
        }
    }
};
exports.ReviewManagementService = ReviewManagementService;
exports.ReviewManagementService = ReviewManagementService = ReviewManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewManagementService);
//# sourceMappingURL=review-management.service.js.map