import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { CreateBidDto } from './dto/create-bid.dto';
export declare class HelpRequestsService {
    private readonly prisma;
    private readonly notifications;
    private readonly payments;
    constructor(prisma: PrismaService, notifications: NotificationsService, payments: PaymentsService);
    createRequest(studentId: string, dto: CreateHelpRequestDto): Promise<{
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
    listOpenRequests(subject?: string): Promise<({
        student: {
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        _count: {
            bids: number;
        };
    } & {
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
    getRequest(requestId: string, requestingUserId?: string): Promise<{
        student: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        bids: ({
            helper: {
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
        } & {
            id: string;
            status: string;
            created_at: Date;
            estimated_hours: import("@prisma/client-runtime-utils").Decimal;
            request_id: string;
            helper_id: string;
            message: string;
            quoted_rate: import("@prisma/client-runtime-utils").Decimal;
        })[];
        session: {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            request_id: string;
            bid_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            completed_at: Date | null;
        } | null;
    } & {
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
    submitBid(instructorUserId: string, requestId: string, dto: CreateBidDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        request_id: string;
        helper_id: string;
        message: string;
        quoted_rate: import("@prisma/client-runtime-utils").Decimal;
    }>;
    acceptBid(studentId: string, bidId: string): Promise<{
        session: any;
        checkoutUrl: string;
        txRef: string;
    }>;
    setMeetingLink(helperUserId: string, sessionId: string, meetingLink: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        request_id: string;
        bid_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        completed_at: Date | null;
    }>;
    updateSession(helperUserId: string, sessionId: string, updates: {
        meeting_link?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        request_id: string;
        bid_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        completed_at: Date | null;
    }>;
    onHelpSessionPaymentConfirmed(sessionId: string): Promise<void>;
    markHelperCompleted(helperUserId: string, sessionId: string, actualHours: number): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        request_id: string;
        bid_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        completed_at: Date | null;
    }>;
    confirmCompletion(studentId: string, sessionId: string, confirmed: boolean): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        request_id: string;
        bid_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        completed_at: Date | null;
    }>;
    forceCompleteSession(sessionId: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        request_id: string;
        bid_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        completed_at: Date | null;
    }>;
    cancelRequest(studentId: string, requestId: string): Promise<{
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
    getMyRequests(studentId: string): Promise<({
        _count: {
            bids: number;
        };
        session: {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            request_id: string;
            bid_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            completed_at: Date | null;
        } | null;
    } & {
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
    getMyBids(instructorUserId: string): Promise<({
        session: {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            request_id: string;
            bid_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            completed_at: Date | null;
        } | null;
        request: {
            id: string;
            description: string;
            title: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            estimated_hours: import("@prisma/client-runtime-utils").Decimal;
            student_id: string;
            subject_area: string;
            budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
            deadline: Date;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        request_id: string;
        helper_id: string;
        message: string;
        quoted_rate: import("@prisma/client-runtime-utils").Decimal;
    })[]>;
    withdrawBid(instructorUserId: string, bidId: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        request_id: string;
        helper_id: string;
        message: string;
        quoted_rate: import("@prisma/client-runtime-utils").Decimal;
    }>;
    adminListAll(): Promise<({
        student: {
            email: string;
            first_name: string | null;
            last_name: string | null;
        };
        _count: {
            bids: number;
        };
        session: ({
            transaction: {
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
            } | null;
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            request_id: string;
            bid_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            completed_at: Date | null;
        }) | null;
    } & {
        id: string;
        description: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        student_id: string;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
}
