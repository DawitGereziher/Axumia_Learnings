import { PrismaService } from '../prisma/prisma.service';
export interface CreateSessionReviewDto {
    overall_rating: number;
    teaching_style_rating?: number;
    communication_rating?: number;
    comment?: string;
}
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    createBookingSessionReview(userId: string, bookingId: string, dto: CreateSessionReviewDto): Promise<{
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
    createHelpSessionReview(userId: string, helpSessionId: string, dto: CreateSessionReviewDto): Promise<{
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
    private updateInstructorRating;
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
}
