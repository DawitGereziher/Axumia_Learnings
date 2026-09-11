import { ReviewValidationService } from './review-validation.service';
import { ReviewManagementService } from './review-management.service';
import { ReviewCommentService } from './review-comment.service';
import { InstructorResponseService } from './instructor-response.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewsController {
    private reviewValidation;
    private reviewManagement;
    private reviewComment;
    private instructorResponse;
    private prisma;
    constructor(reviewValidation: ReviewValidationService, reviewManagement: ReviewManagementService, reviewComment: ReviewCommentService, instructorResponse: InstructorResponseService, prisma: PrismaService);
    getCourseReviews(courseId: string, isVerified?: string, isFeatured?: string, minRating?: string, sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low', limit?: string, offset?: string): Promise<({
        comments: ({
            user: {
                id: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
            };
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            comment: string;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            review_id: string;
            parent_id: string | null;
            is_instructor_response: boolean;
        })[];
        user: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        course_id: string;
        comment: string | null;
        title: string | null;
        total_lessons: number | null;
        instructorResponseId: string | null;
        overall_rating: number;
        content_quality: number;
        instructor_quality: number;
        course_structure: number;
        value_for_money: number;
        pros: string[];
        cons: string[];
        completion_percentage: number | null;
        completed_lessons: number | null;
        is_verified: boolean;
        is_featured: boolean;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        reply_count: number;
        moderated_by: string | null;
        moderated_at: Date | null;
        moderation_reason: string | null;
    })[]>;
    getCourseRatingStats(courseId: string): Promise<import("./review-management.service").RatingStats>;
    createCourseReview(req: any, courseId: string, reviewData: {
        overall_rating: number;
        content_quality?: number;
        instructor_quality?: number;
        course_structure?: number;
        value_for_money?: number;
        title?: string;
        comment?: string;
        pros?: string[];
        cons?: string[];
    }): Promise<{
        success: boolean;
        errors: string[];
        warnings: string[];
        review?: undefined;
    } | {
        success: boolean;
        review: {
            id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            course_id: string;
            comment: string | null;
            title: string | null;
            total_lessons: number | null;
            instructorResponseId: string | null;
            overall_rating: number;
            content_quality: number;
            instructor_quality: number;
            course_structure: number;
            value_for_money: number;
            pros: string[];
            cons: string[];
            completion_percentage: number | null;
            completed_lessons: number | null;
            is_verified: boolean;
            is_featured: boolean;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            reply_count: number;
            moderated_by: string | null;
            moderated_at: Date | null;
            moderation_reason: string | null;
        };
        warnings: string[];
        errors?: undefined;
    }>;
    updateReview(req: any, reviewId: string, reviewData: any): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        course_id: string;
        comment: string | null;
        title: string | null;
        total_lessons: number | null;
        instructorResponseId: string | null;
        overall_rating: number;
        content_quality: number;
        instructor_quality: number;
        course_structure: number;
        value_for_money: number;
        pros: string[];
        cons: string[];
        completion_percentage: number | null;
        completed_lessons: number | null;
        is_verified: boolean;
        is_featured: boolean;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        reply_count: number;
        moderated_by: string | null;
        moderated_at: Date | null;
        moderation_reason: string | null;
    }>;
    deleteReview(req: any, reviewId: string): Promise<void>;
    voteReviewHelpful(req: any, reviewId: string): Promise<{
        voted: boolean;
        helpful_count: number;
    }>;
    reportReview(req: any, reviewId: string, reportData: {
        reason: string;
        description?: string;
    }): Promise<{
        success: boolean;
        report: {
            id: string;
            created_at: Date;
            status: string;
            description: string | null;
            reason: string;
            review_id: string;
            reviewed_by: string | null;
            reviewed_at: Date | null;
            resolution: string | null;
            reporter_id: string;
        };
    }>;
    getReviewComments(reviewId: string, includeReplies?: string): Promise<({
        user: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        replies: {
            id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            comment: string;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            review_id: string;
            parent_id: string | null;
            is_instructor_response: boolean;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    })[]>;
    addComment(req: any, reviewId: string, commentData: {
        comment: string;
        parent_id?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    }>;
    updateComment(req: any, commentId: string, commentData: {
        comment: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    }>;
    deleteComment(req: any, commentId: string): Promise<void>;
    voteCommentHelpful(req: any, commentId: string): Promise<{
        voted: boolean;
        helpful_count: number;
    }>;
    createInstructorResponse(req: any, reviewId: string, responseData: {
        course_id: string;
        response: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    updateInstructorResponse(req: any, responseId: string, responseData: {
        response: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    deleteInstructorResponse(req: any, responseId: string): Promise<void>;
    toggleResponseVisibility(req: any, responseId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    getInstructorResponses(req: any, courseId?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }[]>;
    moderateReview(req: any, reviewId: string, moderationData: {
        action: 'hide' | 'show' | 'feature';
    }): Promise<{
        success: boolean;
    }>;
    moderateComment(req: any, commentId: string, moderationData: {
        action: 'hide' | 'show';
    }): Promise<{
        success: boolean;
    }>;
    getPendingReports(): Promise<({
        review: {
            user: {
                id: string;
                email: string;
                first_name: string | null;
                last_name: string | null;
            };
            course: {
                id: string;
                title: string;
            };
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            course_id: string;
            comment: string | null;
            title: string | null;
            total_lessons: number | null;
            instructorResponseId: string | null;
            overall_rating: number;
            content_quality: number;
            instructor_quality: number;
            course_structure: number;
            value_for_money: number;
            pros: string[];
            cons: string[];
            completion_percentage: number | null;
            completed_lessons: number | null;
            is_verified: boolean;
            is_featured: boolean;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            reply_count: number;
            moderated_by: string | null;
            moderated_at: Date | null;
            moderation_reason: string | null;
        };
        reporter: {
            id: string;
            email: string;
            first_name: string | null;
            last_name: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        status: string;
        description: string | null;
        reason: string;
        review_id: string;
        reviewed_by: string | null;
        reviewed_at: Date | null;
        resolution: string | null;
        reporter_id: string;
    })[]>;
    reviewReport(req: any, reportId: string, reviewData: {
        status: 'approved' | 'rejected' | 'resolved';
        resolution?: string;
    }): Promise<{
        success: boolean;
    }>;
    autoVerifyReviews(): Promise<{
        success: boolean;
        verified_count: number;
    }>;
}
