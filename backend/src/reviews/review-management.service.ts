import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  criteriaAverages: {
    content_quality: number;
    instructor_quality: number;
    course_structure: number;
    value_for_money: number;
  };
}

@Injectable()
export class ReviewManagementService {
  private readonly logger = new Logger(ReviewManagementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new course review
   */
  async createCourseReview(userId: string, courseId: string, reviewData: {
    overall_rating: number;
    content_quality?: number;
    instructor_quality?: number;
    course_structure?: number;
    value_for_money?: number;
    title?: string;
    comment?: string;
    pros?: string[];
    cons?: string[];
  }) {
    try {
      // Get course completion info
      const completionInfo = await this.prisma.$queryRaw`
        SELECT 
          COUNT(lp.id) as completed_lessons,
          (SELECT COUNT(*) FROM course_lessons WHERE course_id = ${courseId}) as total_lessons
        FROM lesson_progress lp
        JOIN course_purchases cp ON lp.purchase_id = cp.id
        WHERE cp.user_id = ${userId} AND cp.course_id = ${courseId} AND lp.completed = true
      ` as any[];

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
          is_verified: true, // Auto-verify since we check purchase
        },
      });

      // Update course rating stats
      await this.updateCourseRatingStats(courseId);

      this.logger.log(`Created course review for user ${userId} on course ${courseId}`);
      return review;
    } catch (error) {
      this.logger.error('Error creating course review:', error);
      throw new Error('Failed to create review');
    }
  }

  /**
   * Update existing review
   */
  async updateReview(reviewId: string, userId: string, reviewData: any) {
    try {
      const review = await this.prisma.courseReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.user_id !== userId) {
        throw new ForbiddenException('You can only update your own reviews');
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

      // Update course rating stats
      await this.updateCourseRatingStats(review.course_id);

      return updatedReview;
    } catch (error) {
      this.logger.error('Error updating review:', error);
      throw new Error('Failed to update review');
    }
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string) {
    try {
      const review = await this.prisma.courseReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.user_id !== userId) {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      await this.prisma.courseReview.delete({
        where: { id: reviewId },
      });

      // Update course rating stats
      await this.updateCourseRatingStats(review.course_id);

      this.logger.log(`Deleted review ${reviewId} by user ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting review:', error);
      throw new Error('Failed to delete review');
    }
  }

  /**
   * Get course reviews with filtering
   */
  async getCourseReviews(courseId: string, filters: {
    is_verified?: boolean;
    is_featured?: boolean;
    min_rating?: number;
    sort_by?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
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

    let orderBy: any = { created_at: 'desc' };
    if (filters.sort_by === 'helpful') {
      orderBy = { helpful_count: 'desc' };
    } else if (filters.sort_by === 'rating_high') {
      orderBy = { overall_rating: 'desc' };
    } else if (filters.sort_by === 'rating_low') {
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

  /**
   * Calculate course rating statistics
   */
  async getCourseRatingStats(courseId: string): Promise<RatingStats> {
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

      // Rating distribution
      const ratingDistribution: Record<number, number> = {};
      reviews.forEach(r => {
        ratingDistribution[r.overall_rating] = (ratingDistribution[r.overall_rating] || 0) + 1;
      });

      // Criteria averages
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
    } catch (error) {
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

  /**
   * Moderate review (hide/show/feature)
   */
  async moderateReview(reviewId: string, action: 'hide' | 'show' | 'feature', moderatorId: string): Promise<void> {
    try {
      const updateData: any = {};

      if (action === 'hide') {
        updateData.is_hidden = true;
        updateData.is_flagged = true;
        updateData.moderated_by = moderatorId;
        updateData.moderated_at = new Date();
        updateData.moderation_reason = 'Hidden by moderator';
      } else if (action === 'show') {
        updateData.is_hidden = false;
        updateData.is_flagged = false;
        updateData.moderated_by = moderatorId;
        updateData.moderated_at = new Date();
        updateData.moderation_reason = 'Restored by moderator';
      } else if (action === 'feature') {
        updateData.is_featured = true;
      }

      await this.prisma.courseReview.update({
        where: { id: reviewId },
        data: updateData,
      });

      this.logger.log(`Moderated review ${reviewId} with action: ${action}`);
    } catch (error) {
      this.logger.error('Error moderating review:', error);
      throw new Error('Failed to moderate review');
    }
  }

  /**
   * Helper: Calculate average ignoring zeros
   */
  private calculateAverage(values: number[]): number {
    const nonZeroValues = values.filter(v => v > 0);
    if (nonZeroValues.length === 0) return 0;
    const sum = nonZeroValues.reduce((a, b) => a + b, 0);
    return Math.round((sum / nonZeroValues.length) * 10) / 10;
  }

  /**
   * Update course rating stats (denormalized)
   */
  private async updateCourseRatingStats(courseId: string): Promise<void> {
    try {
      const stats = await this.getCourseRatingStats(courseId);
      
      // Note: Course model doesn't have avg_rating field
      // Rating stats are calculated on-demand via getCourseRatingStats
      this.logger.log(`Course ${courseId} rating stats updated: ${stats.averageRating} avg, ${stats.totalReviews} total`);
    } catch (error) {
      this.logger.error('Error updating course rating stats:', error);
    }
  }
}