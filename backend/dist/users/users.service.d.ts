import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitInstructorProfileDto, UpdateRichInstructorProfileDto, CreateInstructorReviewDto } from './dto/instructor-profile.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    syncUser(jwtPayload: {
        id: string;
        email: string;
        name?: string;
        role?: string;
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
    findById(id: string): Promise<{
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
    getProfile(id: string): Promise<({
        instructorProfile: {
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
        } | null;
    } & {
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
    }) | null>;
    updateProfile(id: string, dto: UpdateProfileDto): Promise<{
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
    submitInstructorProfile(userId: string, dto: SubmitInstructorProfileDto): Promise<{
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
    updateRichInstructorProfile(userId: string, dto: UpdateRichInstructorProfileDto): Promise<{
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
    getPublicInstructorProfile(profileId: string): Promise<{
        courses: any[];
        reviews: ({
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
            course_id: string;
            type: string;
        } | {
            id: string;
            rating: number;
            teaching_style_rating: number | null;
            communication_rating: number | null;
            comment: string;
            created_at: Date;
            user: {
                id: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
            };
            type: string;
            session_title: string;
        })[];
        rating: string;
        avg_rating: string;
        total_reviews: number;
        user: {
            first_name: string | null;
            last_name: string | null;
            image: string | null;
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
    }>;
    createInstructorReview(userId: string, instructorId: string, dto: CreateInstructorReviewDto): Promise<{
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
    }>;
    updateKycStatus(userId: string, status: 'approved' | 'rejected'): Promise<{
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
    listInstructors(page?: number, limit?: number, search?: string): Promise<{
        data: ({
            user: {
                id: string;
                first_name: string | null;
                last_name: string | null;
                image: string | null;
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getPurchases(userId: string): Promise<({
        course: {
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
        };
    } & {
        id: string;
        course_id: string;
        created_at: Date;
        user_id: string;
        currency: string;
        completed_at: Date | null;
        amount_paid: import("@prisma/client-runtime-utils").Decimal;
        completion_pct: number;
    })[]>;
    getStudentDashboard(userId: string): Promise<{
        user: {
            id: string;
            role: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        } | null;
        enrolled_count: number;
        courses: {
            purchase_id: string;
            progress: number;
            completed: boolean;
            id: string;
            title: string;
            total_lessons: number;
            slug: string;
            thumbnail_url: string | null;
            instructor: {
                user: {
                    first_name: string | null;
                    last_name: string | null;
                };
            };
        }[];
        upcoming_bookings: ({
            instructor: {
                user: {
                    first_name: string | null;
                    last_name: string | null;
                    image: string | null;
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
            slot: {
                starts_at: Date;
                ends_at: Date;
            };
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            instructor_id: string;
            student_id: string;
            slot_id: string;
            session_type: string;
            price_paid: import("@prisma/client-runtime-utils").Decimal | null;
            meeting_link: string | null;
            notes: string | null;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
        })[];
        certificates: {
            id: string;
            course_id: string;
            user_id: string;
            certificate_number: string;
            pdf_key: string | null;
            issued_at: Date;
        }[];
        gamification: {
            xp: number;
            badges: {
                badge_id: string;
                earned_at: Date;
            }[];
        };
    }>;
    toggleFollowInstructor(userId: string, profileId: string): Promise<{
        following: boolean;
        followerCount: number;
    }>;
    getFollowStatus(userId: string | null, profileId: string): Promise<{
        following: boolean;
        followerCount: number;
    }>;
}
