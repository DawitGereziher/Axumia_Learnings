import { ReviewValidationService } from './review-validation.service';
import { ReviewManagementService } from './review-management.service';
import { ReviewCommentService } from './review-comment.service';
import { InstructorResponseService } from './instructor-response.service';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewsController {
    private reviewValidation;
    private reviewManagement;
    private reviewComment;
    private instructorResponse;
    private reviewsService;
    private prisma;
    constructor(reviewValidation: ReviewValidationService, reviewManagement: ReviewManagementService, reviewComment: ReviewCommentService, instructorResponse: InstructorResponseService, reviewsService: ReviewsService, prisma: PrismaService);
    reviewBookingSession(req: any, bookingId: string, body: {
        overall_rating: number;
        teaching_style_rating?: number;
        communication_rating?: number;
        comment?: string;
    }): Promise<{
        student: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        instructor: {
            user: {
                id: string;
                email: string;
                role: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
                password_hash: string | null;
                is_email_verified: boolean;
                created_at: Date;
                updated_at: Date;
            };
        } & {
            id: string;
            bio: string | null;
            headline: string | null;
            hourly_rate: import("@prisma/client-runtime-utils").Decimal;
            kyc_docs: string[];
            cover_image: string | null;
            profile_image: string | null;
            skills: string[];
            languages: string[];
            experience_years: number | null;
            location: string | null;
            website_url: string | null;
            linkedin_url: string | null;
            twitter_url: string | null;
            youtube_url: string | null;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            kyc_status: string;
            is_active: boolean;
            total_students: number;
            total_sessions: number;
            avg_rating: import("@prisma/client-runtime-utils").Decimal;
        };
    } & {
        id: string;
        comment: string | null;
        created_at: Date;
        updated_at: Date;
        overall_rating: number;
        instructor_id: string;
        student_id: string;
        booking_id: string | null;
        help_session_id: string | null;
        teaching_style_rating: number | null;
        communication_rating: number | null;
    }>;
    getBookingSessionReview(bookingId: string): Promise<({
        student: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
    } & {
        id: string;
        comment: string | null;
        created_at: Date;
        updated_at: Date;
        overall_rating: number;
        instructor_id: string;
        student_id: string;
        booking_id: string | null;
        help_session_id: string | null;
        teaching_style_rating: number | null;
        communication_rating: number | null;
    }) | null>;
    reviewHelpSession(req: any, helpSessionId: string, body: {
        overall_rating: number;
        teaching_style_rating?: number;
        communication_rating?: number;
        comment?: string;
    }): Promise<{
        student: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        instructor: {
            user: {
                id: string;
                email: string;
                role: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
                password_hash: string | null;
                is_email_verified: boolean;
                created_at: Date;
                updated_at: Date;
            };
        } & {
            id: string;
            bio: string | null;
            headline: string | null;
            hourly_rate: import("@prisma/client-runtime-utils").Decimal;
            kyc_docs: string[];
            cover_image: string | null;
            profile_image: string | null;
            skills: string[];
            languages: string[];
            experience_years: number | null;
            location: string | null;
            website_url: string | null;
            linkedin_url: string | null;
            twitter_url: string | null;
            youtube_url: string | null;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            kyc_status: string;
            is_active: boolean;
            total_students: number;
            total_sessions: number;
            avg_rating: import("@prisma/client-runtime-utils").Decimal;
        };
    } & {
        id: string;
        comment: string | null;
        created_at: Date;
        updated_at: Date;
        overall_rating: number;
        instructor_id: string;
        student_id: string;
        booking_id: string | null;
        help_session_id: string | null;
        teaching_style_rating: number | null;
        communication_rating: number | null;
    }>;
    getHelpSessionReview(helpSessionId: string): Promise<({
        student: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
    } & {
        id: string;
        comment: string | null;
        created_at: Date;
        updated_at: Date;
        overall_rating: number;
        instructor_id: string;
        student_id: string;
        booking_id: string | null;
        help_session_id: string | null;
        teaching_style_rating: number | null;
        communication_rating: number | null;
    }) | null>;
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
            comment: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
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
        title: string | null;
        comment: string | null;
        course_id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        is_hidden: boolean;
        overall_rating: number;
        content_quality: number;
        instructor_quality: number;
        course_structure: number;
        value_for_money: number;
        pros: string[];
        cons: string[];
        completion_percentage: number | null;
        completed_lessons: number | null;
        total_lessons: number | null;
        is_verified: boolean;
        is_featured: boolean;
        is_flagged: boolean;
        helpful_count: number;
        reply_count: number;
        instructorResponseId: string | null;
        moderated_by: string | null;
        moderated_at: Date | null;
        moderation_reason: string | null;
    })[]>;
    getCourseRatingStats(courseId: string): Promise<import("./review-management.service").RatingStats>;
    createInstructorReview(req: any, instructorId: string, body: {
        rating: number;
        comment?: string;
        course_id?: string;
    }): Promise<{
        success: boolean;
        review: {
            id: string;
            rating: number;
            comment: string;
            created_at: Date;
            user: {
                id: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
            };
            course_title: string;
        };
    }>;
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
            title: string | null;
            comment: string | null;
            course_id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            is_hidden: boolean;
            overall_rating: number;
            content_quality: number;
            instructor_quality: number;
            course_structure: number;
            value_for_money: number;
            pros: string[];
            cons: string[];
            completion_percentage: number | null;
            completed_lessons: number | null;
            total_lessons: number | null;
            is_verified: boolean;
            is_featured: boolean;
            is_flagged: boolean;
            helpful_count: number;
            reply_count: number;
            instructorResponseId: string | null;
            moderated_by: string | null;
            moderated_at: Date | null;
            moderation_reason: string | null;
        };
        warnings: string[];
        errors?: undefined;
    }>;
    updateReview(req: any, reviewId: string, reviewData: any): Promise<{
        id: string;
        title: string | null;
        comment: string | null;
        course_id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        is_hidden: boolean;
        overall_rating: number;
        content_quality: number;
        instructor_quality: number;
        course_structure: number;
        value_for_money: number;
        pros: string[];
        cons: string[];
        completion_percentage: number | null;
        completed_lessons: number | null;
        total_lessons: number | null;
        is_verified: boolean;
        is_featured: boolean;
        is_flagged: boolean;
        helpful_count: number;
        reply_count: number;
        instructorResponseId: string | null;
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
            description: string | null;
            status: string;
            created_at: Date;
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
            comment: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            review_id: string;
            parent_id: string | null;
            is_instructor_response: boolean;
        }[];
    } & {
        id: string;
        comment: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
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
        comment: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
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
        comment: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
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
            title: string | null;
            comment: string | null;
            course_id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            is_hidden: boolean;
            overall_rating: number;
            content_quality: number;
            instructor_quality: number;
            course_structure: number;
            value_for_money: number;
            pros: string[];
            cons: string[];
            completion_percentage: number | null;
            completed_lessons: number | null;
            total_lessons: number | null;
            is_verified: boolean;
            is_featured: boolean;
            is_flagged: boolean;
            helpful_count: number;
            reply_count: number;
            instructorResponseId: string | null;
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
        description: string | null;
        status: string;
        created_at: Date;
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
