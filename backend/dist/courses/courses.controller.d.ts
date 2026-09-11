import { AuthUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
export declare class CoursesController {
    private courses;
    constructor(courses: CoursesService);
    findAll(query: {
        search?: string;
        category?: string;
        level?: string;
        language?: string;
        priceRange?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: string;
        page?: string;
        limit?: string;
    }): Promise<{
        data: {
            avgRating: number;
            category: {
                id: string;
                name: string;
                slug: string;
                icon: string | null;
            } | null;
            _count: {
                reviews: number;
                purchases: number;
            };
            instructor: {
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
                updated_at: Date;
                user_id: string;
                bio: string | null;
                headline: string | null;
                kyc_status: string;
                kyc_docs: string[];
                hourly_rate: import("@prisma/client-runtime-utils").Decimal;
                is_active: boolean;
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
                total_students: number;
                total_sessions: number;
                avg_rating: import("@prisma/client-runtime-utils").Decimal;
            };
            id: string;
            created_at: Date;
            updated_at: Date;
            instructor_id: string;
            status: string;
            category_id: string | null;
            title: string;
            slug: string;
            description: string | null;
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
            total_lessons: number;
            total_materials: number;
            version: number;
            last_published_at: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    listCategories(): Promise<{
        id: string;
        name: string;
        slug: string;
        icon: string | null;
    }[]>;
    findMyCourses(user: AuthUser): Promise<({
        lessons: {
            id: string;
            created_at: Date;
            updated_at: Date;
            course_id: string;
            title: string;
            description: string | null;
            version: number;
            content_type: string;
            storage_type: string;
            youtube_video_id: string | null;
            video_key: string | null;
            hls_key: string | null;
            external_url: string | null;
            embed_code: string | null;
            duration_s: number | null;
            section_id: string | null;
            position: number;
            is_encrypted: boolean;
            access_level: string;
            is_published: boolean;
            published_at: Date | null;
            is_free_preview: boolean;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        status: string;
        category_id: string | null;
        title: string;
        slug: string;
        description: string | null;
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
        total_lessons: number;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    })[]>;
    checkPurchase(courseId: string, user: AuthUser): Promise<{
        purchased: boolean;
        purchaseId: string | null;
    }>;
    enrollFree(courseId: string, user: AuthUser): Promise<{
        purchase: {
            id: string;
            created_at: Date;
            user_id: string;
            course_id: string;
            currency: string;
            amount_paid: import("@prisma/client-runtime-utils").Decimal;
        };
        alreadyEnrolled: boolean;
    }>;
    findOne(slug: string): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
            icon: string | null;
        } | null;
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
        instructor: {
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
            updated_at: Date;
            user_id: string;
            bio: string | null;
            headline: string | null;
            kyc_status: string;
            kyc_docs: string[];
            hourly_rate: import("@prisma/client-runtime-utils").Decimal;
            is_active: boolean;
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
            total_students: number;
            total_sessions: number;
            avg_rating: import("@prisma/client-runtime-utils").Decimal;
        };
        sections: {
            id: string;
            created_at: Date;
            updated_at: Date;
            course_id: string;
            title: string;
            description: string | null;
            position: number;
        }[];
        lessons: ({
            materials: {
                id: string;
                created_at: Date;
                updated_at: Date;
                title: string;
                description: string | null;
                file_size: number | null;
                file_name: string | null;
                position: number;
                is_free_preview: boolean;
                lesson_id: string;
                material_type: string;
                file_url: string | null;
                is_downloadable: boolean;
                download_limit: number | null;
            }[];
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            course_id: string;
            title: string;
            description: string | null;
            version: number;
            content_type: string;
            storage_type: string;
            youtube_video_id: string | null;
            video_key: string | null;
            hls_key: string | null;
            external_url: string | null;
            embed_code: string | null;
            duration_s: number | null;
            section_id: string | null;
            position: number;
            is_encrypted: boolean;
            access_level: string;
            is_published: boolean;
            published_at: Date | null;
            is_free_preview: boolean;
        })[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        status: string;
        category_id: string | null;
        title: string;
        slug: string;
        description: string | null;
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
        total_lessons: number;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    }>;
    create(user: AuthUser, dto: {
        title: string;
        description?: string;
        price: number;
        category_id?: string;
        level?: string;
        language?: string;
        tags?: string[];
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        status: string;
        category_id: string | null;
        title: string;
        slug: string;
        description: string | null;
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
        total_lessons: number;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    }>;
    update(id: string, user: AuthUser, dto: any): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        status: string;
        category_id: string | null;
        title: string;
        slug: string;
        description: string | null;
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
        total_lessons: number;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    }>;
    addLesson(courseId: string, user: AuthUser, dto: {
        title: string;
        description?: string;
        position?: number;
        is_free_preview?: boolean;
        content_type?: any;
        storage_type?: string;
        youtube_url?: string;
        video_key?: string;
        external_url?: string;
        embed_code?: string;
        section_id?: string;
        duration_s?: number;
        requires_progress?: boolean;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        course_id: string;
        title: string;
        description: string | null;
        version: number;
        content_type: string;
        storage_type: string;
        youtube_video_id: string | null;
        video_key: string | null;
        hls_key: string | null;
        external_url: string | null;
        embed_code: string | null;
        duration_s: number | null;
        section_id: string | null;
        position: number;
        is_encrypted: boolean;
        access_level: string;
        is_published: boolean;
        published_at: Date | null;
        is_free_preview: boolean;
    }>;
    updateLesson(lessonId: string, user: AuthUser, dto: any): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        course_id: string;
        title: string;
        description: string | null;
        version: number;
        content_type: string;
        storage_type: string;
        youtube_video_id: string | null;
        video_key: string | null;
        hls_key: string | null;
        external_url: string | null;
        embed_code: string | null;
        duration_s: number | null;
        section_id: string | null;
        position: number;
        is_encrypted: boolean;
        access_level: string;
        is_published: boolean;
        published_at: Date | null;
        is_free_preview: boolean;
    }>;
    deleteLesson(lessonId: string, user: AuthUser): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        course_id: string;
        title: string;
        description: string | null;
        version: number;
        content_type: string;
        storage_type: string;
        youtube_video_id: string | null;
        video_key: string | null;
        hls_key: string | null;
        external_url: string | null;
        embed_code: string | null;
        duration_s: number | null;
        section_id: string | null;
        position: number;
        is_encrypted: boolean;
        access_level: string;
        is_published: boolean;
        published_at: Date | null;
        is_free_preview: boolean;
    }>;
    addSection(courseId: string, user: AuthUser, dto: {
        title: string;
        description?: string;
        position?: number;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        course_id: string;
        title: string;
        description: string | null;
        position: number;
    }>;
    deleteSection(sectionId: string, user: AuthUser): Promise<void>;
    addMaterial(lessonId: string, user: AuthUser, dto: {
        title: string;
        description?: string;
        material_type: string;
        file_url?: string;
        file_name?: string;
        file_size?: number;
        is_downloadable?: boolean;
        is_free_preview?: boolean;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        title: string;
        description: string | null;
        file_size: number | null;
        file_name: string | null;
        position: number;
        is_free_preview: boolean;
        lesson_id: string;
        material_type: string;
        file_url: string | null;
        is_downloadable: boolean;
        download_limit: number | null;
    }>;
    deleteMaterial(materialId: string, user: AuthUser): Promise<void>;
    getMaterialDownloadUrl(materialId: string, user: AuthUser): Promise<{
        url: string;
        fileName: string;
    }>;
    getLessonVideoUrl(lessonId: string, user: AuthUser, request: any): Promise<{
        url: string;
        content_type: string;
    }>;
    recordProgress(lessonId: string, user: AuthUser, body: {
        watchedSeconds: number;
        totalSeconds?: number;
        purchaseId: string;
    }): Promise<{
        id: string;
        updated_at: Date;
        lesson_id: string;
        purchase_id: string;
        completed: boolean;
        watched_s: number;
    }>;
    getCourseProgress(courseId: string, user: AuthUser): Promise<{
        purchaseId: string;
        completionPct: number;
        completedLessons: number;
        totalLessons: number;
        courseCompleted: boolean;
        sections: any[];
        lessons: any[];
        progressMap: {
            [k: string]: {
                completed: boolean;
                pct: any;
                watchedS: number;
            };
        };
    } | null>;
    getSections(courseId: string): Promise<({
        lessons: {
            id: string;
            created_at: Date;
            updated_at: Date;
            course_id: string;
            title: string;
            description: string | null;
            version: number;
            content_type: string;
            storage_type: string;
            youtube_video_id: string | null;
            video_key: string | null;
            hls_key: string | null;
            external_url: string | null;
            embed_code: string | null;
            duration_s: number | null;
            section_id: string | null;
            position: number;
            is_encrypted: boolean;
            access_level: string;
            is_published: boolean;
            published_at: Date | null;
            is_free_preview: boolean;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        course_id: string;
        title: string;
        description: string | null;
        position: number;
    })[]>;
    toggleWishlist(courseId: string, user: AuthUser): Promise<{
        wishlisted: boolean;
    }>;
    getMyWishlist(user: AuthUser): Promise<({
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
            created_at: Date;
            updated_at: Date;
            user_id: string;
            bio: string | null;
            headline: string | null;
            kyc_status: string;
            kyc_docs: string[];
            hourly_rate: import("@prisma/client-runtime-utils").Decimal;
            is_active: boolean;
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
            total_students: number;
            total_sessions: number;
            avg_rating: import("@prisma/client-runtime-utils").Decimal;
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        status: string;
        category_id: string | null;
        title: string;
        slug: string;
        description: string | null;
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
        total_lessons: number;
        total_materials: number;
        version: number;
        last_published_at: Date | null;
    })[]>;
    validateCoupon(body: {
        code: string;
    }): Promise<{
        code: string;
        discount_type: string;
        discount_value: number;
        valid: boolean;
    }>;
    getLessonQuestions(lessonId: string): Promise<({
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
        answers: ({
            user: {
                role: string;
                first_name: string | null;
                last_name: string | null;
            };
        } & {
            id: string;
            created_at: Date;
            user_id: string;
            answer: string;
            is_accepted: boolean;
            question_id: string;
        })[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        title: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    })[]>;
    postLessonQuestion(lessonId: string, user: AuthUser, body: {
        title: string;
        details: string;
    }): Promise<{
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
        answers: {
            id: string;
            created_at: Date;
            user_id: string;
            answer: string;
            is_accepted: boolean;
            question_id: string;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        title: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    }>;
    postLessonAnswer(questionId: string, user: AuthUser, body: {
        answer: string;
    }): Promise<{
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        user_id: string;
        answer: string;
        is_accepted: boolean;
        question_id: string;
    }>;
    acceptAnswer(answerId: string, user: AuthUser): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        answer: string;
        is_accepted: boolean;
        question_id: string;
    }>;
    upvoteQuestion(questionId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        title: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    }>;
}
