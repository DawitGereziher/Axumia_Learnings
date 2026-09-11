import { Injectable, Logger, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewValidationService {
  private readonly logger = new Logger(ReviewValidationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate that user can review this course
   */
  async validateCourseReviewAccess(userId: string, courseId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === 'admin') return true;

      // Check if user has purchased or enrolled
      const purchase = await this.prisma.coursePurchase.findUnique({
        where: {
          user_id_course_id: { user_id: userId, course_id: courseId },
        },
      });

      if (purchase) return true;

      // Also allow reviewing free courses
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (course && Number(course.price) === 0) return true;

      this.logger.warn(`User ${userId} attempted to review unpurchased course ${courseId}`);
      return false;
    } catch (error) {
      this.logger.error('Error validating course review access:', error);
      return false;
    }
  }

  /**
   * Get course completion percentage for a user
   */
  async getCourseCompletion(userId: string, courseId: string): Promise<{
    completionPercentage: number;
    completedLessons: number;
    totalLessons: number;
  }> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: { lessons: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
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
    } catch (error) {
      this.logger.error('Error calculating course completion:', error);
      return { completionPercentage: 0, completedLessons: 0, totalLessons: 0 };
    }
  }

  /**
   * Check if user already has a review for this course
   */
  async hasExistingReview(userId: string, courseId: string): Promise<boolean> {
    try {
      const existingReview = await this.prisma.courseReview.findUnique({
        where: {
          user_id_course_id: { user_id: userId, course_id: courseId },
        },
      });

      return !!existingReview;
    } catch (error) {
      this.logger.error('Error checking existing review:', error);
      return false;
    }
  }

  /**
   * Validate rating is within acceptable range (1-5)
   */
  validateRating(rating: number): boolean {
    return rating >= 1 && rating <= 5 && Number.isInteger(rating);
  }

  /**
   * Validate criteria ratings (1-5 each)
   */
  validateCriteriaRatings(criteria: {
    content_quality: number;
    instructor_quality: number;
    course_structure: number;
    value_for_money: number;
  }): boolean {
    const ratings = Object.values(criteria);
    return ratings.every(rating => this.validateRating(rating));
  }

  /**
   * Detect suspicious review patterns
   */
  async detectSuspiciousReview(userId: string, courseId: string, reviewData: any): Promise<{
    isSuspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    try {
      // Check 1: Review created too soon after purchase
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

      // Check 2: All ratings are perfect (5 stars)
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

      // Check 3: Review is too short
      const commentLength = reviewData.comment?.length || 0;
      if (commentLength < 20) {
        reasons.push('Review comment is too short');
      }

      // Check 4: User has multiple recent reviews
      const recentReviews = await this.prisma.courseReview.count({
        where: {
          user_id: userId,
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentReviews > 5) {
        reasons.push('User has submitted more than 5 reviews in 24 hours');
      }

      // Check 5: Review text contains suspicious patterns
      const suspiciousPatterns = [
        /\b(great|amazing|awesome|perfect|excellent)\b/gi,
        /\b(bad|terrible|horrible|worst)\b/gi,
        /\b(buy|purchase|price|cheap|expensive)\b/gi,
      ];

      const comment = reviewData.comment || '';
      let patternCount = 0;
      suspiciousPatterns.forEach(pattern => {
        const matches = comment.match(pattern);
        if (matches) patternCount += matches.length;
      });

      if (patternCount > 10) {
        reasons.push('Review contains excessive repetitive positive/negative words');
      }

      return {
        isSuspicious: reasons.length >= 2, // Flag if 2+ suspicious indicators
        reasons,
      };
    } catch (error) {
      this.logger.error('Error detecting suspicious review:', error);
      return { isSuspicious: false, reasons: [] };
    }
  }

  /**
   * Validate review data before submission
   */
  async validateReviewSubmission(userId: string, courseId: string, reviewData: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: User has purchased the course
    const hasAccess = await this.validateCourseReviewAccess(userId, courseId);
    if (!hasAccess) {
      errors.push('You must purchase this course before reviewing it');
    }

    // Check 2: User hasn't already reviewed
    const hasExisting = await this.hasExistingReview(userId, courseId);
    if (hasExisting) {
      errors.push('You have already reviewed this course');
    }

    // Check 3: Overall rating is valid
    if (!this.validateRating(reviewData.overall_rating)) {
      errors.push('Overall rating must be between 1 and 5');
    }

    // Check 4: Criteria ratings are valid
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

    // Check 5: Comment length (warning only)
    const commentLength = reviewData.comment?.length || 0;
    if (commentLength > 0 && commentLength < 10) {
      warnings.push('Review comment is quite short');
    }

    // Check 6: Comment not too long
    if (commentLength > 5000) {
      errors.push('Review comment is too long (max 5000 characters)');
    }

    // Check 7: Detect suspicious patterns
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

  /**
   * Mark review as verified purchaser
   */
  async markReviewAsVerified(reviewId: string): Promise<void> {
    try {
      await this.prisma.courseReview.update({
        where: { id: reviewId },
        data: { is_verified: true },
      });
    } catch (error) {
      this.logger.error('Error marking review as verified:', error);
    }
  }

  /**
   * Auto-verify reviews based on purchase records
   */
  async autoVerifyReviews(): Promise<number> {
    try {
      // Find all reviews that should be verified but aren't
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
    } catch (error) {
      this.logger.error('Error auto-verifying reviews:', error);
      return 0;
    }
  }
}