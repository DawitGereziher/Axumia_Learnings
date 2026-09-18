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
exports.EnrollmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EnrollmentService = class EnrollmentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkOwnership(userId, courseId) {
        const directPurchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (directPurchase)
            return directPurchase;
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (course?.instructor?.user_id === userId || user?.role === 'admin') {
            return this.prisma.coursePurchase.upsert({
                where: { user_id_course_id: { user_id: userId, course_id: courseId } },
                create: { user_id: userId, course_id: courseId, amount_paid: 0 },
                update: {},
            });
        }
        const paidTransactions = await this.prisma.transaction.findMany({
            where: { user_id: userId, status: 'paid' },
        });
        const relevant = paidTransactions.find((tx) => {
            const meta = tx.metadata;
            return meta?.entity_type === 'course' && meta?.entity_id === courseId;
        });
        if (!relevant)
            return null;
        const purchase = await this.prisma.coursePurchase.create({
            data: { user_id: userId, course_id: courseId, amount_paid: relevant.amount },
        });
        await this.prisma.transaction.update({
            where: { id: relevant.id },
            data: { purchase_id: purchase.id },
        });
        return purchase;
    }
    async enrollFree(userId, courseId) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        if (Number(course.price) !== 0) {
            throw new common_1.ForbiddenException('This course requires payment. Use the checkout flow.');
        }
        const existing = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (existing)
            return { purchase: existing, alreadyEnrolled: true };
        const purchase = await this.prisma.coursePurchase.create({
            data: { user_id: userId, course_id: courseId, amount_paid: 0 },
        });
        return { purchase, alreadyEnrolled: false };
    }
    async updateProgress(userId, purchaseId, lessonId, watchedSeconds, totalSeconds) {
        const purchase = await this.prisma.coursePurchase.findUnique({
            where: { id: purchaseId },
            select: { user_id: true },
        });
        if (!purchase)
            throw new common_1.NotFoundException('Purchase not found');
        if (purchase.user_id !== userId) {
            throw new common_1.ForbiddenException('This purchase does not belong to you');
        }
        const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        if (!lesson.requires_progress) {
            return this.prisma.lessonProgress.upsert({
                where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
                create: {
                    purchase_id: purchaseId,
                    lesson_id: lessonId,
                    watched_s: 0,
                    completed: true,
                    min_watch_pct: 100,
                    completed_at: new Date(),
                },
                update: {},
            });
        }
        const existing = await this.prisma.lessonProgress.findUnique({
            where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
        });
        if (existing?.last_heartbeat_at) {
            const elapsed = Date.now() - new Date(existing.last_heartbeat_at).getTime();
            if (elapsed < 9000)
                return existing;
        }
        const storedDuration = lesson.duration_s ?? null;
        let pct = 0;
        if (storedDuration && storedDuration > 0) {
            const clamped = Math.min(watchedSeconds, storedDuration);
            pct = Math.floor((clamped / storedDuration) * 100);
        }
        else if (totalSeconds && totalSeconds > 0) {
            pct = Math.min(100, Math.floor((watchedSeconds / totalSeconds) * 100));
        }
        const isCompleted = pct >= 80;
        const now = new Date();
        const progress = await this.prisma.lessonProgress.upsert({
            where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
            create: {
                purchase_id: purchaseId,
                lesson_id: lessonId,
                watched_s: watchedSeconds,
                completed: isCompleted,
                min_watch_pct: pct,
                completed_at: isCompleted ? now : null,
                last_heartbeat_at: now,
            },
            update: {
                watched_s: watchedSeconds,
                min_watch_pct: pct,
                last_heartbeat_at: now,
                ...(!existing?.completed && isCompleted ? { completed: true, completed_at: now } : {}),
            },
        });
        if (isCompleted && !existing?.completed) {
            await this.recalculateCourseCompletion(purchaseId);
        }
        return progress;
    }
    async toggleLessonComplete(userId, lessonId, purchaseId) {
        const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        let pid = purchaseId;
        if (!pid) {
            const p = await this.prisma.coursePurchase.findUnique({
                where: { user_id_course_id: { user_id: userId, course_id: lesson.course_id } },
            });
            pid = p?.id;
        }
        if (!pid)
            throw new common_1.ForbiddenException('Not enrolled in course');
        const existing = await this.prisma.lessonProgress.findUnique({
            where: { purchase_id_lesson_id: { purchase_id: pid, lesson_id: lessonId } },
        });
        const newCompleted = !existing?.completed;
        await this.prisma.lessonProgress.upsert({
            where: { purchase_id_lesson_id: { purchase_id: pid, lesson_id: lessonId } },
            create: {
                purchase_id: pid,
                lesson_id: lessonId,
                completed: true,
                watched_s: lesson.duration_s ?? 300,
            },
            update: { completed: newCompleted },
        });
        await this.recalculateCourseCompletion(pid);
        return { completed: newCompleted, lessonId };
    }
    async getCourseProgress(userId, courseId) {
        let purchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (!purchase) {
            const courseRecord = await this.prisma.course.findUnique({
                where: { id: courseId },
                include: { instructor: true },
            });
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (courseRecord?.instructor?.user_id === userId || user?.role === 'admin') {
                purchase = await this.prisma.coursePurchase.upsert({
                    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
                    create: { user_id: userId, course_id: courseId, amount_paid: 0 },
                    update: {},
                });
            }
        }
        if (!purchase)
            return null;
        const [lessonProgressRows, course] = await Promise.all([
            this.prisma.lessonProgress.findMany({ where: { purchase_id: purchase.id } }),
            this.prisma.course.findUnique({
                where: { id: courseId },
                include: {
                    sections: { orderBy: { position: 'asc' } },
                    lessons: {
                        orderBy: { position: 'asc' },
                        where: { is_published: true },
                        include: { materials: true },
                    },
                },
            }),
        ]);
        const progressMap = Object.fromEntries(lessonProgressRows.map((lp) => [
            lp.lesson_id,
            { completed: lp.completed, pct: lp.min_watch_pct ?? 0, watchedS: lp.watched_s },
        ]));
        const publishedLessons = course?.lessons ?? [];
        const completedCount = publishedLessons.filter((l) => progressMap[l.id]?.completed).length;
        const completionPct = publishedLessons.length === 0
            ? 0
            : Math.floor((completedCount / publishedLessons.length) * 100);
        return {
            purchaseId: purchase.id,
            completionPct,
            completedLessons: completedCount,
            totalLessons: publishedLessons.length,
            courseCompleted: !!purchase.completed_at,
            sections: course?.sections ?? [],
            lessons: publishedLessons,
            progressMap,
        };
    }
    async toggleWishlist(userId, courseId) {
        const existing = await this.prisma.wishlist.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (existing) {
            await this.prisma.wishlist.delete({ where: { id: existing.id } });
            return { wishlisted: false };
        }
        await this.prisma.wishlist.create({ data: { user_id: userId, course_id: courseId } });
        return { wishlisted: true };
    }
    async getUserWishlist(userId) {
        const items = await this.prisma.wishlist.findMany({
            where: { user_id: userId },
            include: {
                course: {
                    include: {
                        instructor: { include: { user: { select: { first_name: true, last_name: true } } } },
                        category: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return items.map((i) => i.course);
    }
    async validateCoupon(code) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: code.toUpperCase() },
        });
        if (!coupon || !coupon.is_active)
            throw new common_1.NotFoundException('Invalid or expired coupon code');
        if (coupon.expires_at && new Date() > coupon.expires_at) {
            throw new common_1.ForbiddenException('Coupon code has expired');
        }
        if (coupon.used_count >= coupon.max_uses) {
            throw new common_1.ForbiddenException('Coupon usage limit reached');
        }
        return {
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: Number(coupon.discount_value),
            valid: true,
        };
    }
    async recalculateCourseCompletion(purchaseId) {
        const purchase = await this.prisma.coursePurchase.findUnique({
            where: { id: purchaseId },
            include: { course: { include: { lessons: { select: { id: true, is_published: true } } } } },
        });
        if (!purchase)
            return;
        const publishedLessons = purchase.course.lessons.filter((l) => l.is_published !== false);
        const completedCount = await this.prisma.lessonProgress.count({
            where: { purchase_id: purchaseId, completed: true },
        });
        const pct = publishedLessons.length === 0
            ? 0
            : Math.floor((completedCount / publishedLessons.length) * 100);
        const isFullyComplete = pct >= 100;
        await this.prisma.coursePurchase.update({
            where: { id: purchaseId },
            data: {
                completion_pct: pct,
                ...(!purchase.completed_at && isFullyComplete ? { completed_at: new Date() } : {}),
            },
        });
    }
};
exports.EnrollmentService = EnrollmentService;
exports.EnrollmentService = EnrollmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EnrollmentService);
//# sourceMappingURL=enrollment.service.js.map