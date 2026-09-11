import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewCommentService {
  private readonly logger = new Logger(ReviewCommentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add comment to a review
   */
  async addComment(userId: string, reviewId: string, comment: string, parentId?: string) {
    try {
      const review = await this.prisma.courseReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // If it's a reply, validate parent comment exists
      if (parentId) {
        const parentComment = await this.prisma.reviewComment.findUnique({
          where: { id: parentId },
        });

        if (!parentComment) {
          throw new NotFoundException('Parent comment not found');
        }

        if (parentComment.review_id !== reviewId) {
          throw new ForbiddenException('Parent comment does not belong to this review');
        }
      }

      const newComment = await this.prisma.reviewComment.create({
        data: {
          review_id: reviewId,
          user_id: userId,
          parent_id: parentId,
          comment,
        },
      });

      // Update review reply count
      await this.prisma.courseReview.update({
        where: { id: reviewId },
        data: {
          reply_count: {
            increment: 1,
          },
        },
      });

      this.logger.log(`Added comment to review ${reviewId} by user ${userId}`);
      return newComment;
    } catch (error) {
      this.logger.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, userId: string, comment: string) {
    try {
      const existingComment = await this.prisma.reviewComment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        throw new NotFoundException('Comment not found');
      }

      if (existingComment.user_id !== userId) {
        throw new ForbiddenException('You can only update your own comments');
      }

      const updatedComment = await this.prisma.reviewComment.update({
        where: { id: commentId },
        data: { comment },
      });

      return updatedComment;
    } catch (error) {
      this.logger.error('Error updating comment:', error);
      throw new Error('Failed to update comment');
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string) {
    try {
      const existingComment = await this.prisma.reviewComment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        throw new NotFoundException('Comment not found');
      }

      if (existingComment.user_id !== userId) {
        throw new ForbiddenException('You can only delete your own comments');
      }

      await this.prisma.reviewComment.delete({
        where: { id: commentId },
      });

      // Update review reply count
      await this.prisma.courseReview.update({
        where: { id: existingComment.review_id },
        data: {
          reply_count: {
            decrement: 1,
          },
        },
      });

      this.logger.log(`Deleted comment ${commentId} by user ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      throw new Error('Failed to delete comment');
    }
  }

  /**
   * Vote comment as helpful
   */
  async voteCommentHelpful(commentId: string, userId: string) {
    try {
      const comment = await this.prisma.reviewComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Check if user already voted
      const existingVote = await this.prisma.reviewCommentHelpfulVote.findFirst({
        where: {
          comment_id: commentId,
          user_id: userId,
        },
      });

      if (existingVote) {
        // Remove vote (toggle)
        await this.prisma.reviewCommentHelpfulVote.delete({
          where: { id: existingVote.id },
        });

        await this.prisma.reviewComment.update({
          where: { id: commentId },
          data: {
            helpful_count: {
              decrement: 1,
            },
          },
        });

        return { voted: false, helpful_count: comment.helpful_count - 1 };
      } else {
        // Add vote
        await this.prisma.reviewCommentHelpfulVote.create({
          data: {
            comment_id: commentId,
            user_id: userId,
          },
        });

        await this.prisma.reviewComment.update({
          where: { id: commentId },
          data: {
            helpful_count: {
              increment: 1,
            },
          },
        });

        return { voted: true, helpful_count: comment.helpful_count + 1 };
      }
    } catch (error) {
      this.logger.error('Error voting comment helpful:', error);
      throw new Error('Failed to vote on comment');
    }
  }

  /**
   * Get comments for a review
   */
  async getReviewComments(reviewId: string, includeReplies: boolean = true) {
    try {
      const comments = await this.prisma.reviewComment.findMany({
        where: {
          review_id: reviewId,
          parent_id: null, // Only top-level comments
          is_hidden: false,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
          replies: includeReplies ? {
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
            orderBy: { created_at: 'asc' },
          } : false,
        },
        orderBy: { created_at: 'desc' },
      });

      return comments;
    } catch (error) {
      this.logger.error('Error getting review comments:', error);
      throw new Error('Failed to get comments');
    }
  }

  /**
   * Moderate comment (hide/show)
   */
  async moderateComment(commentId: string, action: 'hide' | 'show', moderatorId: string): Promise<void> {
    try {
      const updateData = action === 'hide' 
        ? { is_hidden: true, is_flagged: true }
        : { is_hidden: false, is_flagged: false };

      await this.prisma.reviewComment.update({
        where: { id: commentId },
        data: updateData,
      });

      this.logger.log(`Moderated comment ${commentId} with action: ${action}`);
    } catch (error) {
      this.logger.error('Error moderating comment:', error);
      throw new Error('Failed to moderate comment');
    }
  }
}