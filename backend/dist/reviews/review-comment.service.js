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
var ReviewCommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewCommentService = ReviewCommentService_1 = class ReviewCommentService {
    prisma;
    logger = new common_1.Logger(ReviewCommentService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addComment(userId, reviewId, comment, parentId) {
        try {
            const review = await this.prisma.courseReview.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new common_1.NotFoundException('Review not found');
            }
            if (parentId) {
                const parentComment = await this.prisma.reviewComment.findUnique({
                    where: { id: parentId },
                });
                if (!parentComment) {
                    throw new common_1.NotFoundException('Parent comment not found');
                }
                if (parentComment.review_id !== reviewId) {
                    throw new common_1.ForbiddenException('Parent comment does not belong to this review');
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
        }
        catch (error) {
            this.logger.error('Error adding comment:', error);
            throw new Error('Failed to add comment');
        }
    }
    async updateComment(commentId, userId, comment) {
        try {
            const existingComment = await this.prisma.reviewComment.findUnique({
                where: { id: commentId },
            });
            if (!existingComment) {
                throw new common_1.NotFoundException('Comment not found');
            }
            if (existingComment.user_id !== userId) {
                throw new common_1.ForbiddenException('You can only update your own comments');
            }
            const updatedComment = await this.prisma.reviewComment.update({
                where: { id: commentId },
                data: { comment },
            });
            return updatedComment;
        }
        catch (error) {
            this.logger.error('Error updating comment:', error);
            throw new Error('Failed to update comment');
        }
    }
    async deleteComment(commentId, userId) {
        try {
            const existingComment = await this.prisma.reviewComment.findUnique({
                where: { id: commentId },
            });
            if (!existingComment) {
                throw new common_1.NotFoundException('Comment not found');
            }
            if (existingComment.user_id !== userId) {
                throw new common_1.ForbiddenException('You can only delete your own comments');
            }
            await this.prisma.reviewComment.delete({
                where: { id: commentId },
            });
            await this.prisma.courseReview.update({
                where: { id: existingComment.review_id },
                data: {
                    reply_count: {
                        decrement: 1,
                    },
                },
            });
            this.logger.log(`Deleted comment ${commentId} by user ${userId}`);
        }
        catch (error) {
            this.logger.error('Error deleting comment:', error);
            throw new Error('Failed to delete comment');
        }
    }
    async voteCommentHelpful(commentId, userId) {
        try {
            const comment = await this.prisma.reviewComment.findUnique({
                where: { id: commentId },
            });
            if (!comment) {
                throw new common_1.NotFoundException('Comment not found');
            }
            const existingVote = await this.prisma.reviewCommentHelpfulVote.findFirst({
                where: {
                    comment_id: commentId,
                    user_id: userId,
                },
            });
            if (existingVote) {
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
            }
            else {
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
        }
        catch (error) {
            this.logger.error('Error voting comment helpful:', error);
            throw new Error('Failed to vote on comment');
        }
    }
    async getReviewComments(reviewId, includeReplies = true) {
        try {
            const comments = await this.prisma.reviewComment.findMany({
                where: {
                    review_id: reviewId,
                    parent_id: null,
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
        }
        catch (error) {
            this.logger.error('Error getting review comments:', error);
            throw new Error('Failed to get comments');
        }
    }
    async moderateComment(commentId, action, moderatorId) {
        try {
            const updateData = action === 'hide'
                ? { is_hidden: true, is_flagged: true }
                : { is_hidden: false, is_flagged: false };
            await this.prisma.reviewComment.update({
                where: { id: commentId },
                data: updateData,
            });
            this.logger.log(`Moderated comment ${commentId} with action: ${action}`);
        }
        catch (error) {
            this.logger.error('Error moderating comment:', error);
            throw new Error('Failed to moderate comment');
        }
    }
};
exports.ReviewCommentService = ReviewCommentService;
exports.ReviewCommentService = ReviewCommentService = ReviewCommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewCommentService);
//# sourceMappingURL=review-comment.service.js.map