import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
export type SessionFlag = 'short_session' | 'early_end' | 'no_start' | 'unmonitored' | null;
export declare class MonitorService {
    private prisma;
    private notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    onZoomSessionStarted(meetingId: string, startedAt: Date): Promise<void>;
    onZoomSessionEnded(meetingId: string, endedAt: Date): Promise<void>;
    onParticipantEvent(meetingId: string, eventKind: 'joined' | 'left', participantCount: number, rawPayload: any): Promise<void>;
    onGoogleCalendarUpdate(bookingId: string, meetCode: string, _rawPayload: any): Promise<void>;
    onGoogleSessionPolled(bookingId: string, actualStartedAt: Date | null, actualEndedAt: Date | null, participantCount: number): Promise<void>;
    private finaliseSession;
    private computeFlag;
    flagBooking(bookingId: string, flag: SessionFlag): Promise<void>;
    gatePayoutRelease(bookingId: string): Promise<{
        blocked: boolean;
        reason: string | null;
    }>;
    getAllMonitoredSessions(filters: {
        flag?: string;
        platform?: string;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        total: number;
        page: number;
        limit: number;
        sessions: {
            id: string;
            student: {
                email: string;
                first_name: string | null;
                last_name: string | null;
            };
            status: string;
            platform: string | null;
            platform_meeting_id: string | null;
            session_started_at: Date | null;
            session_ended_at: Date | null;
            session_duration_m: number | null;
            session_flag: string | null;
            instructor: {
                user: {
                    email: string;
                    first_name: string | null;
                    last_name: string | null;
                };
            };
            slot: {
                starts_at: Date;
                ends_at: Date;
            };
        }[];
    }>;
    getSessionDetail(bookingId: string): Promise<{
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
            platform: string;
            help_session_id: string | null;
            event_type: string;
            platform_event_id: string | null;
            payload: import("@prisma/client/runtime/client").JsonValue;
            participant_count: number | null;
            occurred_at: Date;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        student_id: string;
        instructor_id: string;
        slot_id: string;
        session_type: string;
        price_paid: import("@prisma/client-runtime-utils").Decimal | null;
        meeting_link: string | null;
        status: string;
        notes: string | null;
        platform: string | null;
        platform_meeting_id: string | null;
        session_started_at: Date | null;
        session_ended_at: Date | null;
        session_duration_m: number | null;
        session_flag: string | null;
    }>;
    getInstructorStats(instructorProfileId: string): Promise<{
        total: number;
        healthy: number;
        flagged: number;
        reliabilityRate: number;
        avgDurationMinutes: number;
    }>;
    clearFlag(bookingId: string): Promise<void>;
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
    private notifyAdminFlag;
}
