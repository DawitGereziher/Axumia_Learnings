import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { ReviewValidationService } from './review-validation.service';
import { ReviewManagementService } from './review-management.service';
import { ReviewCommentService } from './review-comment.service';
import { InstructorResponseService } from './instructor-response.service';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private reviewValidation: ReviewValidationService,
    private reviewManagement: ReviewManagementService,
    private reviewComment: ReviewCommentService,
    private instructorResponse: InstructorResponseService,
    private reviewsService: ReviewsService,
    private prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // 1-on-1 & Help Session Reviews (Teaching / Learning Style)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Submit review for a completed 1-on-1 booking session
   */
  @Post('sessions/booking/:bookingId')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async reviewBookingSession(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() body: { overall_rating: number; teaching_style_rating?: number; communication_rating?: number; comment?: string },
  ) {
    const userId = req.user.id;
    return this.reviewsService.createBookingSessionReview(userId, bookingId, body);
  }

  /**
   * Get review for a 1-on-1 booking session
   */
  @Get('sessions/booking/:bookingId')
  async getBookingSessionReview(@Param('bookingId') bookingId: string) {
    return this.reviewsService.getBookingSessionReview(bookingId);
  }

  /**
   * Submit review for a completed help request session
   */
  @Post('sessions/help/:helpSessionId')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async reviewHelpSession(
    @Request() req,
    @Param('helpSessionId') helpSessionId: string,
    @Body() body: { overall_rating: number; teaching_style_rating?: number; communication_rating?: number; comment?: string },
  ) {
    const userId = req.user.id;
    return this.reviewsService.createHelpSessionReview(userId, helpSessionId, body);
  }

  /**
   * Get review for a help request session
   */
  @Get('sessions/help/:helpSessionId')
  async getHelpSessionReview(@Param('helpSessionId') helpSessionId: string) {
    return this.reviewsService.getHelpSessionReview(helpSessionId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Course Reviews
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get reviews for a course (Public)
   */
  @Get('course/:courseId')
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('is_verified') isVerified?: string,
    @Query('is_featured') isFeatured?: string,
    @Query('min_rating') minRating?: string,
    @Query('sort_by') sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
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

  /**
   * Get course rating statistics (Public)
   */
  @Get('course/:courseId/stats')
  async getCourseRatingStats(@Param('courseId') courseId: string) {
    return this.reviewManagement.getCourseRatingStats(courseId);
  }

  /**
   * Create a direct instructor review
   */
  @Post('instructor/:instructorId')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createInstructorReview(
    @Request() req,
    @Param('instructorId') instructorId: string,
    @Body() body: { rating: number; comment?: string; course_id?: string },
  ) {
    const userId = req.user.id;
    const profile = await this.prisma.instructorProfile.findFirst({
      where: { OR: [{ id: instructorId }, { user_id: instructorId }] },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    if (profile.user_id === userId) {
      throw new BadRequestException('You cannot review your own instructor profile');
    }
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Determine course
    let courseId = body.course_id;
    if (!courseId) {
      const course = await this.prisma.course.findFirst({
        where: { instructor_id: profile.id, status: 'published' },
        select: { id: true },
        orderBy: { created_at: 'desc' },
      });
      if (!course) {
        throw new BadRequestException('Instructor has no published courses to review');
      }
      courseId = course.id;
    }

    const ratingVal = Math.round(body.rating);
    const review = await this.prisma.courseReview.upsert({
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId,
        },
      },
      update: {
        overall_rating: ratingVal,
        content_quality: ratingVal,
        instructor_quality: ratingVal,
        course_structure: ratingVal,
        value_for_money: ratingVal,
        comment: body.comment?.trim() || null,
      },
      create: {
        user_id: userId,
        course_id: courseId,
        overall_rating: ratingVal,
        content_quality: ratingVal,
        instructor_quality: ratingVal,
        course_structure: ratingVal,
        value_for_money: ratingVal,
        comment: body.comment?.trim() || null,
        is_verified: true,
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, image: true } },
        course: { select: { id: true, title: true } },
      },
    });

    const all = await this.prisma.courseReview.findMany({
      where: {
        course: { instructor_id: profile.id },
        is_hidden: false,
      },
      select: { overall_rating: true },
    });
    if (all.length > 0) {
      const avg = all.reduce((s, r) => s + r.overall_rating, 0) / all.length;
      await this.prisma.instructorProfile.update({
        where: { id: profile.id },
        data: { avg_rating: avg },
      });
    }

    return {
      success: true,
      review: {
        id: review.id,
        rating: review.overall_rating,
        comment: review.comment || '',
        created_at: review.created_at,
        user: review.user,
        course_title: review.course?.title,
      },
    };
  }

  /**
   * Create a course review
   */
  @Post('course/:courseId')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createCourseReview(
    @Request() req,
    @Param('courseId') courseId: string,
    @Body() reviewData: {
      overall_rating: number;
      content_quality?: number;
      instructor_quality?: number;
      course_structure?: number;
      value_for_money?: number;
      title?: string;
      comment?: string;
      pros?: string[];
      cons?: string[];
    },
  ) {
    const userId = req.user.id;

    // Validate review submission
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

  /**
   * Update a review
   */
  @Put(':reviewId')
  async updateReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() reviewData: any,
  ) {
    const userId = req.user.id;
    return this.reviewManagement.updateReview(reviewId, userId, reviewData);
  }

  /**
   * Delete a review
   */
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Request() req, @Param('reviewId') reviewId: string) {
    const userId = req.user.id;
    await this.reviewManagement.deleteReview(reviewId, userId);
  }

  /**
   * Vote on a review as helpful
   */
  @Post(':reviewId/helpful')
  async voteReviewHelpful(@Request() req, @Param('reviewId') reviewId: string) {
    const userId = req.user.id;
    
    // Check if user already voted
    const existingVote = await this.prisma.reviewHelpfulVote.findFirst({
      where: {
        review_id: reviewId,
        user_id: userId,
      },
    });

    if (existingVote) {
      // Remove vote (toggle)
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
    } else {
      // Add vote
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

  /**
   * Report a review
   */
  @Post(':reviewId/report')
  @HttpCode(HttpStatus.CREATED)
  async reportReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() reportData: {
      reason: string;
      description?: string;
    },
  ) {
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

  // ─────────────────────────────────────────────────────────────────
  // Review Comments
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get comments for a review
   */
  @Get(':reviewId/comments')
  async getReviewComments(
    @Param('reviewId') reviewId: string,
    @Query('include_replies') includeReplies?: string,
  ) {
    return this.reviewComment.getReviewComments(
      reviewId,
      includeReplies === 'true',
    );
  }

  /**
   * Add comment to a review
   */
  @Post(':reviewId/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() commentData: {
      comment: string;
      parent_id?: string;
    },
  ) {
    const userId = req.user.id;
    return this.reviewComment.addComment(userId, reviewId, commentData.comment, commentData.parent_id);
  }

  /**
   * Update a comment
   */
  @Put('comments/:commentId')
  async updateComment(
    @Request() req,
    @Param('commentId') commentId: string,
    @Body() commentData: {
      comment: string;
    },
  ) {
    const userId = req.user.id;
    return this.reviewComment.updateComment(commentId, userId, commentData.comment);
  }

  /**
   * Delete a comment
   */
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Request() req, @Param('commentId') commentId: string) {
    const userId = req.user.id;
    await this.reviewComment.deleteComment(commentId, userId);
  }

  /**
   * Vote comment as helpful
   */
  @Post('comments/:commentId/helpful')
  async voteCommentHelpful(@Request() req, @Param('commentId') commentId: string) {
    const userId = req.user.id;
    return this.reviewComment.voteCommentHelpful(commentId, userId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Instructor Responses
  // ─────────────────────────────────────────────────────────────────

  /**
   * Create instructor response to a review
   */
  @Post(':reviewId/instructor-response')
  @HttpCode(HttpStatus.CREATED)
  async createInstructorResponse(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() responseData: {
      course_id: string;
      response: string;
    },
  ) {
    const instructorId = req.user.id;
    return this.instructorResponse.createInstructorResponse(
      instructorId,
      responseData.course_id,
      reviewId,
      responseData.response,
    );
  }

  /**
   * Update instructor response
   */
  @Put('instructor-responses/:responseId')
  async updateInstructorResponse(
    @Request() req,
    @Param('responseId') responseId: string,
    @Body() responseData: {
      response: string;
    },
  ) {
    const instructorId = req.user.id;
    return this.instructorResponse.updateInstructorResponse(responseId, instructorId, responseData.response);
  }

  /**
   * Delete instructor response
   */
  @Delete('instructor-responses/:responseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInstructorResponse(@Request() req, @Param('responseId') responseId: string) {
    const instructorId = req.user.id;
    await this.instructorResponse.deleteInstructorResponse(responseId, instructorId);
  }

  /**
   * Toggle instructor response visibility
   */
  @Post('instructor-responses/:responseId/toggle-visibility')
  async toggleResponseVisibility(@Request() req, @Param('responseId') responseId: string) {
    const instructorId = req.user.id;
    return this.instructorResponse.toggleResponseVisibility(responseId, instructorId);
  }

  /**
   * Get instructor's responses
   */
  @Get('instructor/responses')
  async getInstructorResponses(
    @Request() req,
    @Query('course_id') courseId?: string,
  ) {
    const instructorId = req.user.id;
    return this.instructorResponse.getInstructorResponses(instructorId, courseId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Admin Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * Moderate a review (admin only)
   */
  @Post(':reviewId/moderate')
  async moderateReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() moderationData: {
      action: 'hide' | 'show' | 'feature';
    },
  ) {
    const moderatorId = req.user.id;
    await this.reviewManagement.moderateReview(reviewId, moderationData.action, moderatorId);
    return { success: true };
  }

  /**
   * Moderate a comment (admin only)
   */
  @Post('comments/:commentId/moderate')
  async moderateComment(
    @Request() req,
    @Param('commentId') commentId: string,
    @Body() moderationData: {
      action: 'hide' | 'show';
    },
  ) {
    const moderatorId = req.user.id;
    await this.reviewComment.moderateComment(commentId, moderationData.action, moderatorId);
    return { success: true };
  }

  /**
   * Get pending review reports (admin only)
   */
  @Get('admin/reports/pending')
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

  /**
   * Review a report (admin only)
   */
  @Post('admin/reports/:reportId/review')
  async reviewReport(
    @Request() req,
    @Param('reportId') reportId: string,
    @Body() reviewData: {
      status: 'approved' | 'rejected' | 'resolved';
      resolution?: string;
    },
  ) {
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

  /**
   * Auto-verify reviews (admin only)
   */
  @Post('admin/auto-verify')
  async autoVerifyReviews() {
    const count = await this.reviewValidation.autoVerifyReviews();
    return { success: true, verified_count: count };
  }
}