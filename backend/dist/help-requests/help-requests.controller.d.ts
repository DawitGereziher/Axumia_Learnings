import { AuthUser } from '../common/decorators/current-user.decorator';
import { HelpRequestsService } from './help-requests.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { CreateBidDto } from './dto/create-bid.dto';
export declare class HelpRequestsController {
    private readonly helpRequests;
    constructor(helpRequests: HelpRequestsService);
    listOpen(subject?: string): Promise<({
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
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
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
                created_at: Date;
                updated_at: Date;
                user_id: string;
                booking_id: string | null;
                status: string;
                currency: string;
                metadata: import("@prisma/client/runtime/client").JsonValue | null;
                purchase_id: string | null;
                help_session_id: string | null;
                amount: import("@prisma/client-runtime-utils").Decimal;
                platform_fee: import("@prisma/client-runtime-utils").Decimal;
                provider: string;
                provider_tx_ref: string | null;
            } | null;
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            status: string;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            completed_at: Date | null;
            request_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            bid_id: string;
        }) | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
    create(user: AuthUser, dto: CreateHelpRequestDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
    myRequests(user: AuthUser): Promise<({
        _count: {
            bids: number;
        };
        session: {
            id: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            status: string;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            completed_at: Date | null;
            request_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            bid_id: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    })[]>;
    acceptBid(bidId: string, user: AuthUser): Promise<{
        session: any;
        checkoutUrl: string;
    }>;
    cancel(id: string, user: AuthUser): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
    myBids(user: AuthUser): Promise<({
        session: {
            id: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            status: string;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            completed_at: Date | null;
            request_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            bid_id: string;
        } | null;
        request: {
            id: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            status: string;
            title: string;
            description: string;
            estimated_hours: import("@prisma/client-runtime-utils").Decimal;
            subject_area: string;
            budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
            deadline: Date;
        };
    } & {
        id: string;
        created_at: Date;
        status: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        message: string;
        request_id: string;
        helper_id: string;
        quoted_rate: import("@prisma/client-runtime-utils").Decimal;
    })[]>;
    submitBid(requestId: string, user: AuthUser, dto: CreateBidDto): Promise<{
        id: string;
        created_at: Date;
        status: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        message: string;
        request_id: string;
        helper_id: string;
        quoted_rate: import("@prisma/client-runtime-utils").Decimal;
    }>;
    setLink(sessionId: string, user: AuthUser, body: {
        meetingLink: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        status: string;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        completed_at: Date | null;
        request_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        bid_id: string;
    }>;
    updateSession(sessionId: string, user: AuthUser, body: {
        meeting_link?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        status: string;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        completed_at: Date | null;
        request_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        bid_id: string;
    }>;
    complete(sessionId: string, user: AuthUser, body: {
        actualHours: number;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        meeting_link: string | null;
        status: string;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
        completed_at: Date | null;
        request_id: string;
        helper_id: string;
        actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
        started_at: Date | null;
        bid_id: string;
    }>;
    getOne(id: string, user: AuthUser): Promise<{
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
            status: string;
            estimated_hours: import("@prisma/client-runtime-utils").Decimal;
            message: string;
            request_id: string;
            helper_id: string;
            quoted_rate: import("@prisma/client-runtime-utils").Decimal;
        })[];
        session: {
            id: string;
            created_at: Date;
            updated_at: Date;
            student_id: string;
            meeting_link: string | null;
            status: string;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            completed_at: Date | null;
            request_id: string;
            helper_id: string;
            actual_hours: import("@prisma/client-runtime-utils").Decimal | null;
            started_at: Date | null;
            bid_id: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        status: string;
        title: string;
        description: string;
        estimated_hours: import("@prisma/client-runtime-utils").Decimal;
        subject_area: string;
        budget_max_per_hour: import("@prisma/client-runtime-utils").Decimal;
        deadline: Date;
    }>;
}
