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
export declare class ReviewManagementService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createCourseReview(userId: string, courseId: string, reviewData: {
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
    updateReview(reviewId: string, userId: string, reviewData: any): Promise<{
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
    deleteReview(reviewId: string, userId: string): Promise<void>;
    getCourseReviews(courseId: string, filters: {
        is_verified?: boolean;
        is_featured?: boolean;
        min_rating?: number;
        sort_by?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
        limit?: number;
        offset?: number;
    }): Promise<({
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
    getCourseRatingStats(courseId: string): Promise<RatingStats>;
    moderateReview(reviewId: string, action: 'hide' | 'show' | 'feature', moderatorId: string): Promise<void>;
    private calculateAverage;
    private updateCourseRatingStats;
}
