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
var ReviewValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewValidationService = ReviewValidationService_1 = class ReviewValidationService {
    prisma;
    logger = new common_1.Logger(ReviewValidationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateCourseReviewAccess(userId, courseId) {
        try {
            const purchase = await this.prisma.coursePurchase.findUnique({
                where: {
                    user_id_course_id: { user_id: userId, course_id: courseId },
                },
            });
            if (!purchase) {
                this.logger.warn(`User ${userId} attempted to review unpurchased course ${courseId}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error('Error validating course review access:', error);
            return false;
        }
    }
    async getCourseCompletion(userId, courseId) {
        try {
            const course = await this.prisma.course.findUnique({
                where: { id: courseId },
                include: { lessons: true },
            });
            if (!course) {
                throw new common_1.NotFoundException('Course not found');
            }
            const totalLessons = course.lessons.length;
            if (totalLessons === 0) {
                return { completionPercentage: 0, completedLessons: 0, totalLessons: 0 };
            }
            const completedLessons = await this.prisma.lessonProgress.count({
                where: {
                    purchase: {
                        user_id: userId,
                        course_id: courseId,
                    },
                    completed: true,
                },
            });
            const completionPercentage = Math.round((completedLessons / totalLessons) * 100);
            return {
                completionPercentage,
                completedLessons,
                totalLessons,
            };
        }
        catch (error) {
            this.logger.error('Error calculating course completion:', error);
            return { completionPercentage: 0, completedLessons: 0, totalLessons: 0 };
        }
    }
    async hasExistingReview(userId, courseId) {
        try {
            const existingReview = await this.prisma.courseReview.findUnique({
                where: {
                    user_id_course_id: { user_id: userId, course_id: courseId },
                },
            });
            return !!existingReview;
        }
        catch (error) {
            this.logger.error('Error checking existing review:', error);
            return false;
        }
    }
    validateRating(rating) {
        return rating >= 1 && rating <= 5 && Number.isInteger(rating);
    }
    validateCriteriaRatings(criteria) {
        const ratings = Object.values(criteria);
        return ratings.every(rating => this.validateRating(rating));
    }
    async detectSuspiciousReview(userId, courseId, reviewData) {
        const reasons = [];
        try {
            const purchase = await this.prisma.coursePurchase.findUnique({
                where: {
                    user_id_course_id: { user_id: userId, course_id: courseId },
                },
            });
            if (purchase) {
                const hoursSincePurchase = (Date.now() - purchase.created_at.getTime()) / (1000 * 60 * 60);
                if (hoursSincePurchase < 1) {
                    reasons.push('Review submitted within 1 hour of purchase');
                }
            }
            const ratings = [
                reviewData.overall_rating,
                reviewData.content_quality,
                reviewData.instructor_quality,
                reviewData.course_structure,
                reviewData.value_for_money,
            ];
            if (ratings.every(r => r === 5)) {
                reasons.push('All ratings are perfect 5 stars');
            }
            const commentLength = reviewData.comment?.length || 0;
            if (commentLength < 20) {
                reasons.push('Review comment is too short');
            }
            const recentReviews = await this.prisma.courseReview.count({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            });
            if (recentReviews > 5) {
                reasons.push('User has submitted more than 5 reviews in 24 hours');
            }
            const suspiciousPatterns = [
                /\b(great|amazing|awesome|perfect|excellent)\b/gi,
                /\b(bad|terrible|horrible|worst)\b/gi,
                /\b(buy|purchase|price|cheap|expensive)\b/gi,
            ];
            const comment = reviewData.comment || '';
            let patternCount = 0;
            suspiciousPatterns.forEach(pattern => {
                const matches = comment.match(pattern);
                if (matches)
                    patternCount += matches.length;
            });
            if (patternCount > 10) {
                reasons.push('Review contains excessive repetitive positive/negative words');
            }
            return {
                isSuspicious: reasons.length >= 2,
                reasons,
            };
        }
        catch (error) {
            this.logger.error('Error detecting suspicious review:', error);
            return { isSuspicious: false, reasons: [] };
        }
    }
    async validateReviewSubmission(userId, courseId, reviewData) {
        const errors = [];
        const warnings = [];
        const hasAccess = await this.validateCourseReviewAccess(userId, courseId);
        if (!hasAccess) {
            errors.push('You must purchase this course before reviewing it');
        }
        const hasExisting = await this.hasExistingReview(userId, courseId);
        if (hasExisting) {
            errors.push('You have already reviewed this course');
        }
        if (!this.validateRating(reviewData.overall_rating)) {
            errors.push('Overall rating must be between 1 and 5');
        }
        if (reviewData.content_quality || reviewData.instructor_quality ||
            reviewData.course_structure || reviewData.value_for_money) {
            const criteria = {
                content_quality: reviewData.content_quality || 0,
                instructor_quality: reviewData.instructor_quality || 0,
                course_structure: reviewData.course_structure || 0,
                value_for_money: reviewData.value_for_money || 0,
            };
            if (!this.validateCriteriaRatings(criteria)) {
                errors.push('All criteria ratings must be between 1 and 5');
            }
        }
        const commentLength = reviewData.comment?.length || 0;
        if (commentLength > 0 && commentLength < 10) {
            warnings.push('Review comment is quite short');
        }
        if (commentLength > 5000) {
            errors.push('Review comment is too long (max 5000 characters)');
        }
        const suspicious = await this.detectSuspiciousReview(userId, courseId, reviewData);
        if (suspicious.isSuspicious) {
            warnings.push(`Review flagged for review: ${suspicious.reasons.join(', ')}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    async markReviewAsVerified(reviewId) {
        try {
            await this.prisma.courseReview.update({
                where: { id: reviewId },
                data: { is_verified: true },
            });
        }
        catch (error) {
            this.logger.error('Error marking review as verified:', error);
        }
    }
    async autoVerifyReviews() {
        try {
            const unverifiedReviews = await this.prisma.courseReview.findMany({
                where: {
                    is_verified: false,
                    is_hidden: false,
                },
                include: {
                    user: true,
                    course: true,
                },
            });
            let verifiedCount = 0;
            for (const review of unverifiedReviews) {
                const hasPurchase = await this.validateCourseReviewAccess(review.user_id, review.course_id);
                if (hasPurchase) {
                    await this.markReviewAsVerified(review.id);
                    verifiedCount++;
                }
            }
            this.logger.log(`Auto-verified ${verifiedCount} course reviews`);
            return verifiedCount;
        }
        catch (error) {
            this.logger.error('Error auto-verifying reviews:', error);
            return 0;
        }
    }
};
exports.ReviewValidationService = ReviewValidationService;
exports.ReviewValidationService = ReviewValidationService = ReviewValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewValidationService);
//# sourceMappingURL=review-validation.service.js.map