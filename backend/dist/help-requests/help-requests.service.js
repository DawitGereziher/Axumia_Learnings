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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const payments_service_1 = require("../payments/payments.service");
const ZOOM_MEET_PATTERN = /^https:\/\/([a-z0-9\-]+\.)*zoom\.us\/j\/|^https:\/\/meet\.google\.com\//;
let HelpRequestsService = class HelpRequestsService {
    prisma;
    notifications;
    payments;
    constructor(prisma, notifications, payments) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.payments = payments;
    }
    async createRequest(studentId, dto) {
        const parsedDate = new Date(dto.deadline);
        const validDeadline = isNaN(parsedDate.getTime())
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : parsedDate;
        return this.prisma.helpRequest.create({
            data: {
                student_id: studentId,
                title: dto.title,
                description: dto.description,
                subject_area: dto.subject_area,
                budget_max_per_hour: Number(dto.budget_max_per_hour),
                estimated_hours: Number(dto.estimated_hours ?? 1),
                deadline: validDeadline,
                status: 'open',
            },
        });
    }
    async listOpenRequests(subject) {
        return this.prisma.helpRequest.findMany({
            where: {
                status: 'open',
                deadline: { gt: new Date() },
                ...(subject ? { subject_area: subject } : {}),
            },
            include: {
                student: { select: { first_name: true, last_name: true, image: true } },
                _count: { select: { bids: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getRequest(requestId, requestingUserId) {
        const request = await this.prisma.helpRequest.findUnique({
            where: { id: requestId },
            include: {
                student: {
                    select: { id: true, first_name: true, last_name: true, image: true },
                },
                bids: {
                    include: {
                        helper: {
                            include: {
                                user: {
                                    select: { first_name: true, last_name: true, image: true },
                                },
                            },
                        },
                    },
                    orderBy: { created_at: 'asc' },
                },
                session: true,
            },
        });
        if (!request)
            throw new common_1.NotFoundException('Help request not found');
        return request;
    }
    async submitBid(instructorUserId, requestId, dto) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.ForbiddenException('Instructor profile not found');
        if (!profile.is_active || profile.kyc_status !== 'approved') {
            throw new common_1.ForbiddenException('Only approved instructors can submit bids');
        }
        const request = await this.prisma.helpRequest.findUnique({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Help request not found');
        if (request.status !== 'open')
            throw new common_1.BadRequestException('This request is no longer accepting bids');
        if (dto.quoted_rate > Number(request.budget_max_per_hour)) {
            throw new common_1.BadRequestException(`Quoted rate exceeds the student's maximum budget of ${request.budget_max_per_hour} ETB/hr`);
        }
        const existingBid = await this.prisma.helpBid.findUnique({
            where: {
                request_id_helper_id: { request_id: requestId, helper_id: profile.id },
            },
        });
        if (existingBid)
            throw new common_1.ConflictException('You have already submitted a bid for this request');
        return this.prisma.helpBid.create({
            data: {
                request_id: requestId,
                helper_id: profile.id,
                quoted_rate: dto.quoted_rate,
                estimated_hours: dto.estimated_hours,
                message: dto.message,
                status: 'pending',
            },
        });
    }
    async acceptBid(studentId, bidId) {
        const bid = await this.prisma.helpBid.findUnique({
            where: { id: bidId },
            include: {
                request: { include: { student: true } },
                helper: { include: { user: true } },
            },
        });
        if (!bid)
            throw new common_1.NotFoundException('Bid not found');
        if (bid.request.student_id !== studentId)
            throw new common_1.ForbiddenException();
        if (bid.request.status !== 'open')
            throw new common_1.BadRequestException('Request is no longer open');
        if (bid.status !== 'pending')
            throw new common_1.BadRequestException('Bid is no longer pending');
        const [, , , session] = await this.prisma.$transaction([
            this.prisma.helpBid.update({
                where: { id: bidId },
                data: { status: 'accepted' },
            }),
            this.prisma.helpBid.updateMany({
                where: {
                    request_id: bid.request_id,
                    id: { not: bidId },
                    status: 'pending',
                },
                data: { status: 'rejected' },
            }),
            this.prisma.helpRequest.update({
                where: { id: bid.request_id },
                data: { status: 'in_progress' },
            }),
            this.prisma.helpSession.create({
                data: {
                    request_id: bid.request_id,
                    bid_id: bidId,
                    helper_id: bid.helper_id,
                    student_id: studentId,
                    status: 'scheduled',
                },
            }),
        ]);
        const student = bid.request.student;
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
            student.email;
        const { checkoutUrl } = await this.payments.initiateHelpSessionPayment(studentId, session.id, student.email, studentName);
        await this.notifications.notifyBidAccepted(bid.helper.user.email, bid.request.title);
        return { session, checkoutUrl };
    }
    async setMeetingLink(helperUserId, sessionId, meetingLink) {
        if (!ZOOM_MEET_PATTERN.test(meetingLink)) {
            throw new common_1.BadRequestException('Meeting link must be a valid Zoom or Google Meet URL');
        }
        const session = await this.prisma.helpSession.findUnique({
            where: { id: sessionId },
            include: { helper: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (session.helper.user_id !== helperUserId)
            throw new common_1.ForbiddenException();
        return this.prisma.helpSession.update({
            where: { id: sessionId },
            data: {
                meeting_link: meetingLink,
                status: 'in_progress',
                started_at: new Date(),
            },
        });
    }
    async updateSession(helperUserId, sessionId, updates) {
        const session = await this.prisma.helpSession.findUnique({
            where: { id: sessionId },
            include: { helper: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (session.helper.user_id !== helperUserId)
            throw new common_1.ForbiddenException();
        const updateData = {};
        if (updates.meeting_link) {
            if (!ZOOM_MEET_PATTERN.test(updates.meeting_link)) {
                throw new common_1.BadRequestException('Meeting link must be a valid Zoom or Google Meet URL');
            }
            updateData.meeting_link = updates.meeting_link;
            const platform = updates.meeting_link.includes('zoom.us')
                ? 'zoom'
                : updates.meeting_link.includes('meet.google.com')
                    ? 'google'
                    : null;
            if (platform === 'zoom') {
                const match = updates.meeting_link.match(/zoom\.us\/j\/(\d+)/);
                updateData.platform_meeting_id = match ? match[1] : null;
            }
            else if (platform === 'google') {
                const match = updates.meeting_link.match(/meet\.google\.com\/([a-z0-9\-]+)/i);
                updateData.platform_meeting_id = match ? match[1] : null;
            }
            updateData.platform = platform;
            if (session.status === 'scheduled') {
                updateData.status = 'in_progress';
                updateData.started_at = new Date();
            }
        }
        return this.prisma.helpSession.update({
            where: { id: sessionId },
            data: updateData,
        });
    }
    async completeSession(helperUserId, sessionId, actualHours) {
        const session = await this.prisma.helpSession.findUnique({
            where: { id: sessionId },
            include: { helper: true, request: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (session.helper.user_id !== helperUserId)
            throw new common_1.ForbiddenException();
        if (session.status === 'completed')
            throw new common_1.BadRequestException('Session already completed');
        const [updatedSession] = await this.prisma.$transaction([
            this.prisma.helpSession.update({
                where: { id: sessionId },
                data: {
                    status: 'completed',
                    actual_hours: actualHours,
                    completed_at: new Date(),
                },
            }),
            this.prisma.helpRequest.update({
                where: { id: session.request_id },
                data: { status: 'completed' },
            }),
        ]);
        return updatedSession;
    }
    async cancelRequest(studentId, requestId) {
        const request = await this.prisma.helpRequest.findUnique({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        if (request.student_id !== studentId)
            throw new common_1.ForbiddenException();
        if (request.status !== 'open') {
            throw new common_1.BadRequestException('Only open requests can be cancelled');
        }
        return this.prisma.helpRequest.update({
            where: { id: requestId },
            data: { status: 'cancelled' },
        });
    }
    async getMyRequests(studentId) {
        return this.prisma.helpRequest.findMany({
            where: { student_id: studentId },
            include: {
                _count: { select: { bids: true } },
                session: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getMyBids(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        return this.prisma.helpBid.findMany({
            where: { helper_id: profile.id },
            include: {
                request: true,
                session: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async adminListAll() {
        return this.prisma.helpRequest.findMany({
            include: {
                student: { select: { first_name: true, last_name: true, email: true } },
                _count: { select: { bids: true } },
                session: { include: { transaction: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
};
exports.HelpRequestsService = HelpRequestsService;
exports.HelpRequestsService = HelpRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        payments_service_1.PaymentsService])
], HelpRequestsService);
//# sourceMappingURL=help-requests.service.js.map