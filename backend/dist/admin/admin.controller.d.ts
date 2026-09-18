import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    listUsers(page?: number, limit?: number, role?: string, search?: string): Promise<{
        data: {
            instructorProfile: {
                kyc_status: string;
                is_active: boolean;
            } | null;
            id: string;
            email: string;
            role: string;
            first_name: string | null;
            last_name: string | null;
            is_email_verified: boolean;
            created_at: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateUserRole(id: string, body: {
        role: string;
    }): Promise<{
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
    }>;
    verifyUserEmail(id: string, body: {
        is_email_verified: boolean;
    }): Promise<{
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
    }>;
    pendingKyc(): Promise<{
        signedKycDocs: ({
            key: string;
            url: string;
        } | {
            key: string;
            url: null;
        })[];
        user: {
            email: string;
            first_name: string | null;
            last_name: string | null;
        };
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
    }[]>;
    updateKyc(profileId: string, body: {
        status: 'approved' | 'rejected';
        notes?: string;
    }): Promise<{
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
    }>;
    listCourses(page?: number, limit?: number, status?: string, search?: string): Promise<{
        data: ({
            category: {
                id: string;
                name: string;
                slug: string;
                icon: string | null;
            } | null;
            _count: {
                purchases: number;
                lessons: number;
            };
            instructor: {
                user: {
                    email: string;
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateCourseStatus(id: string, body: {
        status: string;
    }): Promise<{
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
    }>;
    deleteCourse(id: string): Promise<{
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
    }>;
    listTransactions(page?: number, limit?: number, search?: string): Promise<{
        data: ({
            user: {
                email: string;
                first_name: string | null;
                last_name: string | null;
            };
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            currency: string;
            booking_id: string | null;
            help_session_id: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            purchase_id: string | null;
            amount: import("@prisma/client-runtime-utils").Decimal;
            platform_fee: import("@prisma/client-runtime-utils").Decimal;
            provider: string;
            provider_tx_ref: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    exportTransactionsCsv(): Promise<string>;
    listCategories(): Promise<({
        _count: {
            courses: number;
        };
    } & {
        id: string;
        name: string;
        slug: string;
        icon: string | null;
    })[]>;
    createCategory(body: {
        name: string;
        slug?: string;
        icon?: string;
    }): Promise<{
        id: string;
        name: string;
        slug: string;
        icon: string | null;
    }>;
    updateCategory(id: string, body: {
        name?: string;
        slug?: string;
        icon?: string;
    }): Promise<{
        id: string;
        name: string;
        slug: string;
        icon: string | null;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        name: string;
        slug: string;
        icon: string | null;
    }>;
    getAllPayouts(): Promise<({
        transaction: {
            created_at: Date;
            currency: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
        } | null;
    } & {
        id: string;
        status: string;
        created_at: Date;
        instructor_id: string;
        currency: string;
        notes: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        transaction_id: string | null;
        account_details: string | null;
        paid_at: Date | null;
    })[]>;
    pendingPayouts(): Promise<({
        transaction: {
            created_at: Date;
            currency: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
        } | null;
    } & {
        id: string;
        status: string;
        created_at: Date;
        instructor_id: string;
        currency: string;
        notes: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        transaction_id: string | null;
        account_details: string | null;
        paid_at: Date | null;
    })[]>;
    updatePayout(id: string, body: {
        status: 'paid' | 'failed';
        notes?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        instructor_id: string;
        currency: string;
        notes: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        transaction_id: string | null;
        account_details: string | null;
        paid_at: Date | null;
    }>;
    getStats(): Promise<{
        users: {
            total: number;
            students: number;
            instructors: number;
        };
        content: {
            publishedCourses: number;
        };
        finance: {
            totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
            pendingPayouts: number;
            pendingKycApprovals: number;
        };
    }>;
    getQueueStatus(): Promise<{
        queues: {
            notifications: {
                [index: string]: number;
            };
            transcoding: {
                [index: string]: number;
            };
            payouts: {
                [index: string]: number;
            };
        };
    }>;
    retryFailedJobs(queueName: string): Promise<{
        retried: number;
    }>;
}
