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
    async createCourseReview(userId, courseId, dto) {
        if (dto.rating < 1 || dto.rating > 5)
            throw new common_1.BadRequestException('Rating must be 1–5');
        const purchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (!purchase)
            throw new common_1.BadRequestException('You must purchase this course first');
        return this.prisma.review.create({
            data: { user_id: userId, course_id: courseId, ...dto },
        });
    }
    async createBookingReview(userId, bookingId, dto) {
        if (dto.rating < 1 || dto.rating > 5)
            throw new common_1.BadRequestException('Rating must be 1–5');
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking ||
            booking.student_id !== userId ||
            booking.status !== 'completed') {
            throw new common_1.BadRequestException('Can only review completed sessions you attended');
        }
        return this.prisma.review.create({
            data: { user_id: userId, booking_id: bookingId, ...dto },
        });
    }
    async getCourseReviews(courseId) {
        const reviews = await this.prisma.review.findMany({
            where: { course_id: courseId },
            include: { user: true },
            orderBy: { created_at: 'desc' },
        });
        const avg = reviews.length
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : 0;
        return { reviews, averageRating: +avg.toFixed(1), count: reviews.length };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map