import { AuthUser } from '../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
export declare class BookingsController {
    private bookings;
    constructor(bookings: BookingsService);
    getInstructorSlots(profileId: string): Promise<{
        id: string;
        instructor_id: string;
        starts_at: Date;
        ends_at: Date;
        is_booked: boolean;
        max_participants: number;
        current_participants: number;
    }[]>;
    requestBooking(slotId: string, user: AuthUser, body?: {
        notes?: string;
        session_type?: string;
    }): Promise<{
        booking: any;
        checkoutUrl: string;
        txRef: string;
    }>;
    myBookings(user: AuthUser): Promise<({
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
        slot: {
            id: string;
            instructor_id: string;
            starts_at: Date;
            ends_at: Date;
            is_booked: boolean;
            max_participants: number;
            current_participants: number;
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
    })[]>;
    cancelBooking(id: string, user: AuthUser): Promise<{
        message: string;
    }>;
    createSlot(user: AuthUser, dto: {
        starts_at: string;
        ends_at: string;
    }): Promise<{
        id: string;
        instructor_id: string;
        starts_at: Date;
        ends_at: Date;
        is_booked: boolean;
        max_participants: number;
        current_participants: number;
    }>;
    confirm(id: string, user: AuthUser, body: {
        meetingLink: string;
    }): Promise<{
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
    }>;
    reject(id: string, user: AuthUser, body?: {
        reason?: string;
    }): Promise<{
        message: string;
    }>;
    instructorBookings(user: AuthUser): Promise<({
        student: {
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
        slot: {
            id: string;
            instructor_id: string;
            starts_at: Date;
            ends_at: Date;
            is_booked: boolean;
            max_participants: number;
            current_participants: number;
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
    })[]>;
    completeBooking(id: string): Promise<{
        payoutBlocked: boolean;
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
    }>;
    noShow(id: string): Promise<{
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
    }>;
}
