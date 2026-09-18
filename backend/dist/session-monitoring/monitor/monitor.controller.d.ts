import { MonitorService } from './monitor.service';
export declare class MonitorController {
    private readonly monitorService;
    constructor(monitorService: MonitorService);
    getPlatformStats(): Promise<{
        total: number;
        byFlag: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.BookingGroupByOutputType, import(".prisma/client").Prisma.BookingScalarFieldEnum | import(".prisma/client").Prisma.BookingScalarFieldEnum[]> & {
            _count: true | {
                id?: number | undefined;
                student_id?: number | undefined;
                instructor_id?: number | undefined;
                slot_id?: number | undefined;
                session_type?: number | undefined;
                price_paid?: number | undefined;
                meeting_link?: number | undefined;
                status?: number | undefined;
                notes?: number | undefined;
                platform?: number | undefined;
                platform_meeting_id?: number | undefined;
                session_started_at?: number | undefined;
                session_ended_at?: number | undefined;
                session_duration_m?: number | undefined;
                session_flag?: number | undefined;
                created_at?: number | undefined;
                updated_at?: number | undefined;
                _all?: number | undefined;
            } | undefined;
            _avg: {
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                session_duration_m?: number | null | undefined;
            } | undefined;
            _sum: {
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                session_duration_m?: number | null | undefined;
            } | undefined;
            _min: {
                id?: string | null | undefined;
                student_id?: string | null | undefined;
                instructor_id?: string | null | undefined;
                slot_id?: string | null | undefined;
                session_type?: string | null | undefined;
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                meeting_link?: string | null | undefined;
                status?: string | null | undefined;
                notes?: string | null | undefined;
                platform?: string | null | undefined;
                platform_meeting_id?: string | null | undefined;
                session_started_at?: Date | null | undefined;
                session_ended_at?: Date | null | undefined;
                session_duration_m?: number | null | undefined;
                session_flag?: string | null | undefined;
                created_at?: Date | null | undefined;
                updated_at?: Date | null | undefined;
            } | undefined;
            _max: {
                id?: string | null | undefined;
                student_id?: string | null | undefined;
                instructor_id?: string | null | undefined;
                slot_id?: string | null | undefined;
                session_type?: string | null | undefined;
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                meeting_link?: string | null | undefined;
                status?: string | null | undefined;
                notes?: string | null | undefined;
                platform?: string | null | undefined;
                platform_meeting_id?: string | null | undefined;
                session_started_at?: Date | null | undefined;
                session_ended_at?: Date | null | undefined;
                session_duration_m?: number | null | undefined;
                session_flag?: string | null | undefined;
                created_at?: Date | null | undefined;
                updated_at?: Date | null | undefined;
            } | undefined;
        })[];
        byPlatform: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.BookingGroupByOutputType, import(".prisma/client").Prisma.BookingScalarFieldEnum | import(".prisma/client").Prisma.BookingScalarFieldEnum[]> & {
            _count: true | {
                id?: number | undefined;
                student_id?: number | undefined;
                instructor_id?: number | undefined;
                slot_id?: number | undefined;
                session_type?: number | undefined;
                price_paid?: number | undefined;
                meeting_link?: number | undefined;
                status?: number | undefined;
                notes?: number | undefined;
                platform?: number | undefined;
                platform_meeting_id?: number | undefined;
                session_started_at?: number | undefined;
                session_ended_at?: number | undefined;
                session_duration_m?: number | undefined;
                session_flag?: number | undefined;
                created_at?: number | undefined;
                updated_at?: number | undefined;
                _all?: number | undefined;
            } | undefined;
            _avg: {
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                session_duration_m?: number | null | undefined;
            } | undefined;
            _sum: {
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                session_duration_m?: number | null | undefined;
            } | undefined;
            _min: {
                id?: string | null | undefined;
                student_id?: string | null | undefined;
                instructor_id?: string | null | undefined;
                slot_id?: string | null | undefined;
                session_type?: string | null | undefined;
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                meeting_link?: string | null | undefined;
                status?: string | null | undefined;
                notes?: string | null | undefined;
                platform?: string | null | undefined;
                platform_meeting_id?: string | null | undefined;
                session_started_at?: Date | null | undefined;
                session_ended_at?: Date | null | undefined;
                session_duration_m?: number | null | undefined;
                session_flag?: string | null | undefined;
                created_at?: Date | null | undefined;
                updated_at?: Date | null | undefined;
            } | undefined;
            _max: {
                id?: string | null | undefined;
                student_id?: string | null | undefined;
                instructor_id?: string | null | undefined;
                slot_id?: string | null | undefined;
                session_type?: string | null | undefined;
                price_paid?: import("@prisma/client-runtime-utils").Decimal | null | undefined;
                meeting_link?: string | null | undefined;
                status?: string | null | undefined;
                notes?: string | null | undefined;
                platform?: string | null | undefined;
                platform_meeting_id?: string | null | undefined;
                session_started_at?: Date | null | undefined;
                session_ended_at?: Date | null | undefined;
                session_duration_m?: number | null | undefined;
                session_flag?: string | null | undefined;
                created_at?: Date | null | undefined;
                updated_at?: Date | null | undefined;
            } | undefined;
        })[];
    }>;
    getAllSessions(flag?: string, platform?: string, fromDate?: string, toDate?: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        sessions: {
            id: string;
            status: string;
            student: {
                email: string;
                first_name: string | null;
                last_name: string | null;
            };
            instructor: {
                user: {
                    email: string;
                    first_name: string | null;
                    last_name: string | null;
                };
            };
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            slot: {
                starts_at: Date;
                ends_at: Date;
            };
        }[];
    }>;
    getSessionDetail(id: string): Promise<{
        student: {
            email: string;
            first_name: string | null;
            last_name: string | null;
        };
        instructor: {
            user: {
                email: string;
                first_name: string | null;
                last_name: string | null;
            };
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
        sessionEvents: {
            id: string;
            created_at: Date;
            booking_id: string | null;
            help_session_id: string | null;
            platform: string;
            event_type: string;
            platform_event_id: string | null;
            payload: import("@prisma/client/runtime/client").JsonValue;
            participant_count: number | null;
            occurred_at: Date;
        }[];
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
    }>;
    clearFlag(id: string): Promise<{
        success: boolean;
        bookingId: string;
    }>;
    getInstructorStats(id: string): Promise<{
        total: number;
        healthy: number;
        flagged: number;
        reliabilityRate: number;
        avgDurationMinutes: number;
    }>;
}
