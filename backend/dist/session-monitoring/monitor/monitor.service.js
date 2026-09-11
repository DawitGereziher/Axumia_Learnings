"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const THRESHOLD_HEALTHY = 0.9;
const THRESHOLD_SHORT = 0.7;
let MonitorService = MonitorService_1 = class MonitorService {
    prisma;
    notifications;
    logger = new common_1.Logger(MonitorService_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async onZoomSessionStarted(meetingId, startedAt) {
        const booking = await this.prisma.booking.findFirst({
            where: { platform: 'zoom', platform_meeting_id: meetingId },
        });
        if (!booking) {
            this.logger.warn(`Zoom meeting.started — no booking found for meeting ID ${meetingId}`);
            return;
        }
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: { session_started_at: startedAt, session_flag: null },
        });
        await this.prisma.sessionEvent.create({
            data: {
                booking_id: booking.id,
                platform: 'zoom',
                event_type: 'session.started',
                platform_event_id: meetingId,
                payload: { meetingId, startedAt },
                occurred_at: startedAt,
            },
        });
        this.logger.log(`Session started: booking=${booking.id} zoom=${meetingId}`);
    }
    async onZoomSessionEnded(meetingId, endedAt) {
        const booking = await this.prisma.booking.findFirst({
            where: { platform: 'zoom', platform_meeting_id: meetingId },
            include: { slot: true },
        });
        if (!booking) {
            this.logger.warn(`Zoom meeting.ended — no booking found for meeting ID ${meetingId}`);
            return;
        }
        await this.prisma.sessionEvent.create({
            data: {
                booking_id: booking.id,
                platform: 'zoom',
                event_type: 'session.ended',
                platform_event_id: meetingId,
                payload: { meetingId, endedAt },
                occurred_at: endedAt,
            },
        });
        await this.finaliseSession(booking.id, booking.session_started_at, endedAt, booking.slot);
    }
    async onParticipantEvent(meetingId, eventKind, participantCount, rawPayload) {
        const booking = await this.prisma.booking.findFirst({
            where: { platform: 'zoom', platform_meeting_id: meetingId },
        });
        if (!booking)
            return;
        await this.prisma.sessionEvent.create({
            data: {
                booking_id: booking.id,
                platform: 'zoom',
                event_type: `participant.${eventKind}`,
                platform_event_id: meetingId,
                payload: rawPayload,
                participant_count: participantCount,
                occurred_at: new Date(),
            },
        });
    }
    async onGoogleCalendarUpdate(bookingId, meetCode, _rawPayload) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            return;
        if (!booking.session_started_at) {
            const now = new Date();
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: { session_started_at: now, platform_meeting_id: meetCode },
            });
            await this.prisma.sessionEvent.create({
                data: {
                    booking_id: bookingId,
                    platform: 'google',
                    event_type: 'session.started',
                    platform_event_id: meetCode,
                    payload: { meetCode },
                    occurred_at: now,
                },
            });
            this.logger.log(`Google Meet session started: booking=${bookingId} meetCode=${meetCode}`);
        }
    }
    async onGoogleSessionPolled(bookingId, actualStartedAt, actualEndedAt, participantCount) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { slot: true },
        });
        if (!booking)
            return;
        if (actualEndedAt) {
            await this.prisma.sessionEvent.create({
                data: {
                    booking_id: bookingId,
                    platform: 'google',
                    event_type: 'session.ended',
                    platform_event_id: booking.platform_meeting_id ?? undefined,
                    payload: { actualStartedAt, actualEndedAt, participantCount },
                    participant_count: participantCount,
                    occurred_at: actualEndedAt,
                },
            });
            const startedAt = actualStartedAt ?? booking.session_started_at;
            await this.finaliseSession(bookingId, startedAt, actualEndedAt, booking.slot);
        }
        else {
            if (!booking.session_started_at) {
                await this.flagBooking(bookingId, 'no_start');
            }
        }
    }
    async finaliseSession(bookingId, startedAt, endedAt, slot) {
        const actualDurationMs = startedAt
            ? endedAt.getTime() - startedAt.getTime()
            : 0;
        const actualDurationM = Math.round(actualDurationMs / 60000);
        let bookedDurationM = 0;
        if (slot) {
            bookedDurationM = Math.round((slot.ends_at.getTime() - slot.starts_at.getTime()) / 60000);
        }
        const ratio = bookedDurationM > 0 ? actualDurationM / bookedDurationM : 1;
        const flag = this.computeFlag(ratio, startedAt !== null);
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                session_ended_at: endedAt,
                session_started_at: startedAt ?? undefined,
                session_duration_m: actualDurationM,
                session_flag: flag,
            },
        });
        if (flag && flag !== 'short_session') {
            await this.notifyAdminFlag(bookingId, flag, actualDurationM, bookedDurationM);
        }
        this.logger.log(`Session finalised: booking=${bookingId} actual=${actualDurationM}m booked=${bookedDurationM}m flag=${flag ?? 'none'}`);
    }
    computeFlag(ratio, sessionStarted) {
        if (!sessionStarted)
            return 'no_start';
        if (ratio >= THRESHOLD_HEALTHY)
            return null;
        if (ratio >= THRESHOLD_SHORT)
            return 'short_session';
        return 'early_end';
    }
    async flagBooking(bookingId, flag) {
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { session_flag: flag },
        });
        if (flag && flag !== 'short_session') {
            await this.notifyAdminFlag(bookingId, flag, 0, 0);
        }
    }
    async gatePayoutRelease(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { session_flag: true, platform: true },
        });
        if (!booking)
            return { blocked: false, reason: null };
        const flag = booking.session_flag;
        if (!flag || flag === 'unmonitored' || flag === 'short_session') {
            return { blocked: false, reason: null };
        }
        return { blocked: true, reason: flag };
    }
    async getAllMonitoredSessions(filters) {
        const { flag, platform, fromDate, toDate, page = 1, limit = 20 } = filters;
        const where = {};
        if (flag)
            where.session_flag = flag;
        if (platform)
            where.platform = platform;
        if (fromDate || toDate) {
            where.created_at = {};
            if (fromDate)
                where.created_at.gte = fromDate;
            if (toDate)
                where.created_at.lte = toDate;
        }
        const [total, sessions] = await this.prisma.$transaction([
            this.prisma.booking.count({ where }),
            this.prisma.booking.findMany({
                where,
                select: {
                    id: true,
                    status: true,
                    platform: true,
                    platform_meeting_id: true,
                    session_started_at: true,
                    session_ended_at: true,
                    session_duration_m: true,
                    session_flag: true,
                    slot: { select: { starts_at: true, ends_at: true } },
                    student: {
                        select: { first_name: true, last_name: true, email: true },
                    },
                    instructor: {
                        select: {
                            user: {
                                select: { first_name: true, last_name: true, email: true },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        return { total, page, limit, sessions };
    }
    async getSessionDetail(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                sessionEvents: { orderBy: { occurred_at: 'asc' } },
                slot: true,
                student: { select: { first_name: true, last_name: true, email: true } },
                instructor: {
                    select: {
                        user: {
                            select: { first_name: true, last_name: true, email: true },
                        },
                    },
                },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return booking;
    }
    async getInstructorStats(instructorProfileId) {
        const bookings = await this.prisma.booking.findMany({
            where: { instructor_id: instructorProfileId, platform: { not: null } },
            select: {
                session_flag: true,
                session_duration_m: true,
                status: true,
                slot: true,
            },
        });
        const total = bookings.length;
        const healthy = bookings.filter((b) => !b.session_flag).length;
        const flagged = bookings.filter((b) => b.session_flag && b.session_flag !== 'unmonitored').length;
        const avgDuration = total > 0
            ? bookings.reduce((sum, b) => sum + (b.session_duration_m ?? 0), 0) /
                total
            : 0;
        return {
            total,
            healthy,
            flagged,
            reliabilityRate: total > 0 ? Math.round((healthy / total) * 100) : 100,
            avgDurationMinutes: Math.round(avgDuration),
        };
    }
    async clearFlag(bookingId) {
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { session_flag: null },
        });
        this.logger.log(`Admin cleared session flag for booking ${bookingId}`);
    }
    async getPlatformStats() {
        const [total, byFlag, byPlatform] = await this.prisma.$transaction([
            this.prisma.booking.count({ where: { platform: { not: null } } }),
            this.prisma.booking.groupBy({
                by: ['session_flag'],
                _count: { _all: true },
                orderBy: { session_flag: 'asc' },
            }),
            this.prisma.booking.groupBy({
                by: ['platform'],
                _count: { _all: true },
                where: { platform: { not: null } },
                orderBy: { platform: 'asc' },
            }),
        ]);
        return { total, byFlag, byPlatform };
    }
    async notifyAdminFlag(bookingId, flag, actualMin, bookedMin) {
        this.logger.warn(`[ADMIN ALERT] Booking ${bookingId} flagged as "${flag}". Actual: ${actualMin}m / Booked: ${bookedMin}m`);
    }
};
exports.MonitorService = MonitorService;
exports.MonitorService = MonitorService = MonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], MonitorService);
//# sourceMappingURL=monitor.service.js.map