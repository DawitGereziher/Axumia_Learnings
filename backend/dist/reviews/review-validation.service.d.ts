import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewValidationService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    validateCourseReviewAccess(userId: string, courseId: string): Promise<boolean>;
    getCourseCompletion(userId: string, courseId: string): Promise<{
        completionPercentage: number;
        completedLessons: number;
        totalLessons: number;
    }>;
    hasExistingReview(userId: string, courseId: string): Promise<boolean>;
    validateRating(rating: number): boolean;
    validateCriteriaRatings(criteria: {
        content_quality: number;
        instructor_quality: number;
        course_structure: number;
        value_for_money: number;
    }): boolean;
    detectSuspiciousReview(userId: string, courseId: string, reviewData: any): Promise<{
        isSuspicious: boolean;
        reasons: string[];
    }>;
    validateReviewSubmission(userId: string, courseId: string, reviewData: any): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    markReviewAsVerified(reviewId: string): Promise<void>;
    autoVerifyReviews(): Promise<number>;
}
