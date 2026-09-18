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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const monitor_service_1 = require("../session-monitoring/monitor/monitor.service");
const payments_service_1 = require("../payments/payments.service");
const oauth_service_1 = require("../session-monitoring/oauth/oauth.service");
const queue_constants_1 = require("../queue/queue.constants");
const ZOOM_MEET_PATTERN = /^https:\/\/(zoom\.us\/j\/|meet\.google\.com\/)/;
let BookingsService = class BookingsService {
    prisma;
    notifications;
    monitorService;
    payments;
    notificationsQueue;
    constructor(prisma, notifications, monitorService, payments, notificationsQueue) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.monitorService = monitorService;
        this.payments = payments;
        this.notificationsQueue = notificationsQueue;
    }
    async createSlot(instructorUserId, dto) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile || !profile.is_active)
            throw new common_1.ForbiddenException('Instructor not active');
        const starts = new Date(dto.starts_at);
        const ends = new Date(dto.ends_at);
        if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
            throw new common_1.BadRequestException('Invalid date format for starts_at or ends_at');
        }
        if (ends <= starts) {
            throw new common_1.BadRequestException('ends_at must be after starts_at');
        }
        if (starts <= new Date()) {
            throw new common_1.BadRequestException('Slot must be in the future');
        }
        return this.prisma.availabilitySlot.create({
            data: {
                instructor_id: profile.id,
                starts_at: starts,
                ends_at: ends,
            },
        });
    }
    async getInstructorSlots(instructorProfileId) {
        return this.prisma.availabilitySlot.findMany({
            where: {
                instructor_id: instructorProfileId,
                is_booked: false,
                starts_at: { gt: new Date() },
            },
            orderBy: { starts_at: 'asc' },
        });
    }
    async requestBooking(studentId, slotId, sessionType = '1-on-1', notes, userEmail, userName) {
        const slot = await this.prisma.availabilitySlot.findUnique({
            where: { id: slotId },
            include: { instructor: { include: { user: true } } },
        });
        if (!slot)
            throw new common_1.NotFoundException('Slot not found');
        if (slot.instructor.user_id === studentId) {
            throw new common_1.ForbiddenException('You cannot book your own slot');
        }
        const type = ['1-on-1', '1-on-many', 'group-class'].includes(sessionType)
            ? sessionType
            : '1-on-1';
        let multiplier = 1.0;
        let maxParticipants = 1;
        if (type === '1-on-many') {
            multiplier = 0.6;
            maxParticipants = 5;
        }
        else if (type === 'group-class') {
            multiplier = 0.4;
            maxParticipants = 20;
        }
        const currentCap = slot.current_participants || 0;
        const maxCap = Math.max(slot.max_participants || 1, maxParticipants);
        if (slot.is_booked || currentCap >= maxCap) {
            throw new common_1.BadRequestException('Slot is fully booked');
        }
        const baseRate = Number(slot.instructor?.hourly_rate || 500);
        const pricePaid = +(baseRate * multiplier).toFixed(2);
        const isNowFull = currentCap + 1 >= maxCap;
        const [booking] = await this.prisma.$transaction([
            this.prisma.booking.create({
                data: {
                    student_id: studentId,
                    instructor_id: slot.instructor_id,
                    slot_id: slotId,
                    session_type: type,
                    price_paid: pricePaid,
                    status: 'awaiting_payment',
                    notes: notes || null,
                },
            }),
            this.prisma.availabilitySlot.update({
                where: { id: slotId },
                data: {
                    current_participants: { increment: 1 },
                    max_participants: maxCap,
                    is_booked: isNowFull,
                },
            }),
        ]);
        const student = await this.prisma.user.findUnique({ where: { id: studentId } });
        const email = userEmail || student?.email || '';
        const name = userName ||
            `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
            'Student';
        const { checkoutUrl, txRef } = await this.payments.initiateBookingPayment(studentId, booking.id, email, name);
        return { booking, checkoutUrl, txRef };
    }
    async onBookingPaymentConfirmed(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { instructor: { include: { user: true } }, student: true },
        });
        if (!booking)
            return;
        if (booking.status !== 'awaiting_payment')
            return;
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'pending' },
        });
        try {
            const student = booking.student;
            await this.notificationsQueue.add(queue_constants_1.JOB_BOOKING_NEW, {
                instructorEmail: booking.instructor.user.email,
                bookingId: booking.id,
                studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student',
            });
        }
        catch {
            await this.notifications.notifyInstructorNewBooking(booking.instructor.user.email, booking.id);
        }
    }
    async confirmBooking(bookingId, instructorUserId, meetingLink) {
        if (!ZOOM_MEET_PATTERN.test(meetingLink)) {
            throw new common_1.BadRequestException('Meeting link must be a valid Zoom or Google Meet URL');
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { instructor: true, student: true, slot: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.instructor.user_id !== instructorUserId)
            throw new common_1.ForbiddenException();
        if (booking.status !== 'pending') {
            throw new common_1.BadRequestException(`Cannot confirm a booking in status '${booking.status}'`);
        }
        const platform = (0, oauth_service_1.detectPlatform)(meetingLink);
        const platformMeetingId = platform === 'zoom'
            ? (0, oauth_service_1.extractZoomMeetingId)(meetingLink)
            : (0, oauth_service_1.extractGoogleMeetCode)(meetingLink);
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                meeting_link: meetingLink,
                status: 'confirmed',
                platform: platform ?? undefined,
                platform_meeting_id: platformMeetingId ?? undefined,
            },
        });
        const slotTime = booking.slot?.starts_at
            ? new Date(booking.slot.starts_at).toLocaleString()
            : undefined;
        try {
            await this.notificationsQueue.add(queue_constants_1.JOB_BOOKING_CONFIRMED, {
                studentEmail: booking.student.email,
                meetingLink,
                slotTime,
                studentPhone: booking.student.phone || undefined,
            });
            if (booking.slot?.starts_at) {
                const sessionTime = new Date(booking.slot.starts_at).getTime();
                const now = Date.now();
                const delay24h = sessionTime - 24 * 60 * 60 * 1000 - now;
                if (delay24h > 0) {
                    await this.notificationsQueue.add(queue_constants_1.JOB_BOOKING_REMINDER_24H, { email: booking.student.email, meetingLink, phone: booking.student.phone }, { delay: delay24h });
                }
                const delay1h = sessionTime - 60 * 60 * 1000 - now;
                if (delay1h > 0) {
                    await this.notificationsQueue.add(queue_constants_1.JOB_BOOKING_REMINDER_1H, { email: booking.student.email, meetingLink, phone: booking.student.phone }, { delay: delay1h });
                }
            }
        }
        catch {
            await this.notifications.notifyStudentBookingConfirmed(booking.student.email, meetingLink, slotTime);
        }
        return updated;
    }
    async rejectBooking(bookingId, instructorUserId, reason) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { instructor: true, slot: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.instructor.user_id !== instructorUserId)
            throw new common_1.ForbiddenException();
        if (!['pending'].includes(booking.status)) {
            throw new common_1.BadRequestException(`Cannot reject a booking in status '${booking.status}'`);
        }
        await this.prisma.$transaction([
            this.prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'cancelled', notes: reason ? `Rejected: ${reason}` : booking.notes },
            }),
            this.prisma.availabilitySlot.update({
                where: { id: booking.slot_id },
                data: {
                    current_participants: { decrement: 1 },
                    is_booked: false,
                },
            }),
        ]);
        return { message: 'Booking rejected. Refund will be processed.' };
    }
    async cancelBooking(bookingId, studentId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { slot: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.student_id !== studentId)
            throw new common_1.ForbiddenException('Not your booking');
        if (!['awaiting_payment', 'pending'].includes(booking.status)) {
            throw new common_1.BadRequestException(`Cannot cancel a booking in status '${booking.status}'. Contact support for confirmed bookings.`);
        }
        await this.prisma.$transaction([
            this.prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'cancelled' },
            }),
            this.prisma.availabilitySlot.update({
                where: { id: booking.slot_id },
                data: {
                    current_participants: { decrement: 1 },
                    is_booked: false,
                },
            }),
        ]);
        return { message: 'Booking cancelled. If payment was made, a refund will be processed.' };
    }
    async completeBooking(bookingId, adminOrSystemCall = false) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.status !== 'confirmed') {
            throw new common_1.BadRequestException(`Booking must be 'confirmed' to complete. Current: '${booking.status}'`);
        }
        const { blocked } = await this.monitorService.gatePayoutRelease(bookingId);
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'completed' },
        });
        return { ...updated, payoutBlocked: blocked };
    }
    async markNoShow(bookingId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'no_show' },
        });
    }
    async getStudentBookings(studentId) {
        return this.prisma.booking.findMany({
            where: { student_id: studentId },
            include: { instructor: { include: { user: true } }, slot: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async getInstructorBookings(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        return this.prisma.booking.findMany({
            where: { instructor_id: profile.id },
            include: { student: true, slot: true },
            orderBy: { created_at: 'desc' },
        });
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NOTIFICATIONS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        monitor_service_1.MonitorService,
        payments_service_1.PaymentsService,
        bullmq_2.Queue])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map