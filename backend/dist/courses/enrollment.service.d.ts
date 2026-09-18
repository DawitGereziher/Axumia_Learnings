import { PrismaService } from '../prisma/prisma.service';
export declare class EnrollmentService {
    private prisma;
    constructor(prisma: PrismaService);
    checkOwnership(userId: string, courseId: string): Promise<{
        id: string;
        course_id: string;
        created_at: Date;
        user_id: string;
        currency: string;
        completed_at: Date | null;
        amount_paid: import("@prisma/client-runtime-utils").Decimal;
        completion_pct: number;
    } | null>;
    enrollFree(userId: string, courseId: string): Promise<{
        purchase: {
            id: string;
            course_id: string;
            created_at: Date;
            user_id: string;
            currency: string;
            completed_at: Date | null;
            amount_paid: import("@prisma/client-runtime-utils").Decimal;
            completion_pct: number;
        };
        alreadyEnrolled: boolean;
    }>;
    updateProgress(userId: string, purchaseId: string, lessonId: string, watchedSeconds: number, totalSeconds?: number): Promise<{
        id: string;
        updated_at: Date;
        completed_at: Date | null;
        completed: boolean;
        lesson_id: string;
        purchase_id: string;
        watched_s: number;
        min_watch_pct: number;
        last_heartbeat_at: Date | null;
    }>;
    toggleLessonComplete(userId: string, lessonId: string, purchaseId?: string): Promise<{
        completed: boolean;
        lessonId: string;
    }>;
    getCourseProgress(userId: string, courseId: string): Promise<{
        purchaseId: string;
        completionPct: number;
        completedLessons: number;
        totalLessons: number;
        courseCompleted: boolean;
        sections: {
            id: string;
            description: string | null;
            title: string;
            course_id: string;
            created_at: Date;
            updated_at: Date;
            position: number;
        }[];
        lessons: ({
            materials: {
                id: string;
                description: string | null;
                title: string;
                created_at: Date;
                updated_at: Date;
                position: number;
                is_free_preview: boolean;
                lesson_id: string;
                material_type: string;
                file_url: string | null;
                file_size: number | null;
                file_name: string | null;
                is_downloadable: boolean;
                download_limit: number | null;
            }[];
        } & {
            id: string;
            description: string | null;
            title: string;
            course_id: string;
            created_at: Date;
            updated_at: Date;
            version: number;
            position: number;
            section_id: string | null;
            content_type: string;
            storage_type: string;
            video_key: string | null;
            hls_key: string | null;
            youtube_video_id: string | null;
            duration_s: number | null;
            external_url: string | null;
            embed_code: string | null;
            is_encrypted: boolean;
            access_level: string;
            is_published: boolean;
            published_at: Date | null;
            is_free_preview: boolean;
            requires_progress: boolean;
        })[];
        progressMap: {
            [k: string]: {
                completed: boolean;
                pct: number;
                watchedS: number;
            };
        };
    } | null>;
    toggleWishlist(userId: string, courseId: string): Promise<{
        wishlisted: boolean;
    }>;
    getUserWishlist(userId: string): Promise<({
        category: {
            id: string;
            name: string;
            slug: string;
            icon: string | null;
        } | null;
        instructor: {
            user: {
                first_name: string | null;
                last_name: string | null;
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
        description: string | null;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        total_lessons: number;
        instructor_id: string;
        category_id: string | null;
        slug: string;
        price: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        thumbnail: string | null;
        level: string;
        language: string;
        tags: string[];
        search_vector: string | null;
        estimated_hours: number | null;
        skill_level: string | null;
        prerequisites: string[];
        learning_objectives: string[];
        promo_video_id: string | null;
        thumbnail_url: string | null;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    })[]>;
    validateCoupon(code: string): Promise<{
        code: string;
        discount_type: string;
        discount_value: number;
        valid: boolean;
    }>;
    private recalculateCourseCompletion;
}
