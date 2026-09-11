import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    createCourseReview(userId: string, courseId: string, dto: {
        rating: number;
        comment?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        course_id: string | null;
        booking_id: string | null;
        rating: number;
        comment: string | null;
    }>;
    createBookingReview(userId: string, bookingId: string, dto: {
        rating: number;
        comment?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        course_id: string | null;
        booking_id: string | null;
        rating: number;
        comment: string | null;
    }>;
    getCourseReviews(courseId: string): Promise<{
        reviews: ({
            user: {
                id: string;
                email: string;
                role: string;
                password_hash: string | null;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
                is_email_verified: boolean;
                created_at: Date;
                updated_at: Date;
            };
        } & {
            id: string;
            created_at: Date;
            user_id: string;
            course_id: string | null;
            booking_id: string | null;
            rating: number;
            comment: string | null;
        })[];
        averageRating: number;
        count: number;
    }>;
}
