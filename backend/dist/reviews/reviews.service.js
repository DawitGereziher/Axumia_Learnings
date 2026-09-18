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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsService = class ReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBookingSessionReview(userId, bookingId, dto) {
        if (!dto.overall_rating || dto.overall_rating < 1 || dto.overall_rating > 5) {
            throw new common_1.BadRequestException('Overall rating must be between 1 and 5');
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { instructor: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking session not found');
        if (booking.student_id !== userId) {
            throw new common_1.ForbiddenException('Only the student who attended can review this session');
        }
        const review = await this.prisma.sessionReview.upsert({
            where: { booking_id: bookingId },
            update: {
                overall_rating: Math.round(dto.overall_rating),
                teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
                communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
                comment: dto.comment?.trim() || null,
            },
            create: {
                student_id: userId,
                instructor_id: booking.instructor_id,
                booking_id: bookingId,
                overall_rating: Math.round(dto.overall_rating),
                teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
                communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
                comment: dto.comment?.trim() || null,
            },
            include: {
                student: { select: { id: true, first_name: true, last_name: true, image: true } },
                instructor: { include: { user: true } },
            },
        });
        await this.updateInstructorRating(booking.instructor_id);
        return review;
    }
    async createHelpSessionReview(userId, helpSessionId, dto) {
        if (!dto.overall_rating || dto.overall_rating < 1 || dto.overall_rating > 5) {
            throw new common_1.BadRequestException('Overall rating must be between 1 and 5');
        }
        const helpSession = await this.prisma.helpSession.findUnique({
            where: { id: helpSessionId },
            include: { helper: true },
        });
        if (!helpSession)
            throw new common_1.NotFoundException('Help session not found');
        if (helpSession.student_id !== userId) {
            throw new common_1.ForbiddenException('Only the student who requested help can review this session');
        }
        const review = await this.prisma.sessionReview.upsert({
            where: { help_session_id: helpSessionId },
            update: {
                overall_rating: Math.round(dto.overall_rating),
                teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
                communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
                comment: dto.comment?.trim() || null,
            },
            create: {
                student_id: userId,
                instructor_id: helpSession.helper_id,
                help_session_id: helpSessionId,
                overall_rating: Math.round(dto.overall_rating),
                teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
                communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
                comment: dto.comment?.trim() || null,
            },
            include: {
                student: { select: { id: true, first_name: true, last_name: true, image: true } },
                instructor: { include: { user: true } },
            },
        });
        await this.updateInstructorRating(helpSession.helper_id);
        return review;
    }
    async updateInstructorRating(instructorId) {
        const [courseReviews, sessionReviews] = await Promise.all([
            this.prisma.courseReview.findMany({
                where: { course: { instructor_id: instructorId }, is_hidden: false },
                select: { overall_rating: true },
            }),
            this.prisma.sessionReview.findMany({
                where: { instructor_id: instructorId },
                select: { overall_rating: true },
            }),
        ]);
        const allScores = [
            ...courseReviews.map((r) => r.overall_rating),
            ...sessionReviews.map((r) => r.overall_rating),
        ];
        if (allScores.length > 0) {
            const avg = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
            await this.prisma.instructorProfile.update({
                where: { id: instructorId },
                data: { avg_rating: avg },
            });
        }
    }
    async getBookingSessionReview(bookingId) {
        return this.prisma.sessionReview.findUnique({
            where: { booking_id: bookingId },
            include: {
                student: { select: { id: true, first_name: true, last_name: true, image: true } },
            },
        });
    }
    async getHelpSessionReview(helpSessionId) {
        return this.prisma.sessionReview.findUnique({
            where: { help_session_id: helpSessionId },
            include: {
                student: { select: { id: true, first_name: true, last_name: true, image: true } },
            },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map