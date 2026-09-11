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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const content_service_1 = require("../content/content.service");
const content_security_service_1 = require("../content/content-security.service");
const rate_limit_service_1 = require("../common/services/rate-limit.service");
const access_log_service_1 = require("../common/services/access-log.service");
let CoursesService = class CoursesService {
    prisma;
    storage;
    contentService;
    contentSecurity;
    rateLimit;
    accessLog;
    constructor(prisma, storage, contentService, contentSecurity, rateLimit, accessLog) {
        this.prisma = prisma;
        this.storage = storage;
        this.contentService = contentService;
        this.contentSecurity = contentSecurity;
        this.rateLimit = rateLimit;
        this.accessLog = accessLog;
    }
    async create(instructorUserId, dto) {
        let profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        if (!profile) {
            if (user?.role === 'admin' || user?.role === 'instructor') {
                profile = await this.prisma.instructorProfile.create({
                    data: {
                        user_id: instructorUserId,
                        kyc_status: 'approved',
                        is_active: true,
                    },
                });
            }
            else {
                throw new common_1.ForbiddenException('You must have an approved instructor profile to create courses');
            }
        }
        else if (!profile.is_active) {
            if (user?.role === 'admin') {
                profile = await this.prisma.instructorProfile.update({
                    where: { id: profile.id },
                    data: { is_active: true, kyc_status: 'approved' },
                });
            }
            else {
                throw new common_1.ForbiddenException('You must have an approved instructor profile to create courses');
            }
        }
        const slug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        return this.prisma.course.create({
            data: { ...dto, instructor_id: profile.id, slug, status: 'published' },
        });
    }
    async findAll(query) {
        const { search, category, level, language, priceRange, minPrice, maxPrice, minRating, sort = 'newest', page = 1, limit = 20, } = query;
        const skip = (page - 1) * limit;
        const where = { status: 'published' };
        if (category) {
            where.OR = [
                { category: { slug: category } },
                { category_id: category },
            ];
        }
        if (level && level !== 'all') {
            where.level = level;
        }
        if (language && language !== 'all') {
            where.language = language;
        }
        if (priceRange === 'free') {
            where.price = 0;
        }
        else if (priceRange === 'under500') {
            where.price = { lte: 500 };
        }
        else if (priceRange === '500to2000') {
            where.price = { gte: 500, lte: 2000 };
        }
        else if (priceRange === 'over2000') {
            where.price = { gte: 2000 };
        }
        else if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined)
                where.price.gte = minPrice;
            if (maxPrice !== undefined)
                where.price.lte = maxPrice;
        }
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { tags: { has: search.toLowerCase() } },
                    ],
                },
            ];
        }
        let orderBy = { created_at: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        }
        else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }
        else if (sort === 'popular') {
            orderBy = { purchases: { _count: 'desc' } };
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.course.findMany({
                where,
                include: {
                    instructor: { include: { user: true } },
                    category: true,
                    _count: { select: { purchases: true, reviews: true } },
                    reviews: { select: { rating: true } },
                },
                skip,
                take: limit,
                orderBy,
            }),
            this.prisma.course.count({ where }),
        ]);
        const formattedData = data.map((c) => {
            const totalRatings = c.reviews.reduce((acc, r) => acc + r.rating, 0);
            const avgRating = c.reviews.length > 0 ? totalRatings / c.reviews.length : 0;
            const { reviews, ...rest } = c;
            return { ...rest, avgRating: Math.round(avgRating * 10) / 10 };
        });
        const finalData = minRating
            ? formattedData.filter((c) => c.avgRating >= minRating)
            : formattedData;
        return { data: finalData, total: minRating ? finalData.length : total, page, limit };
    }
    async findOne(slug) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        const where = isUuid ? { OR: [{ slug }, { id: slug }] } : { slug };
        const course = await this.prisma.course.findFirst({
            where,
            include: {
                instructor: { include: { user: true } },
                category: true,
                sections: { orderBy: { position: 'asc' } },
                lessons: {
                    orderBy: { position: 'asc' },
                    include: { materials: true }
                },
                reviews: { include: { user: true }, take: 10 },
            },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        return course;
    }
    async update(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        if (course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('You do not own this course');
        }
        return this.prisma.course.update({ where: { id: courseId }, data: dto });
    }
    async addLesson(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course || course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        let lessonData = {
            course_id: courseId,
            title: dto.title,
            description: dto.description,
            position: dto.position,
            is_free_preview: dto.is_free_preview || false,
            content_type: dto.content_type || content_service_1.ContentType.YOUTUBE,
            storage_type: dto.storage_type || 'youtube',
            sectionId: dto.sectionId,
            duration_s: dto.duration_s ?? null,
            requires_progress: dto.requires_progress !== false,
        };
        if (dto.youtube_url && this.contentService['youtubeService'].isValidYouTubeUrl(dto.youtube_url)) {
            const processed = this.contentService['youtubeService'].processYouTubeUrl(dto.youtube_url);
            if (processed) {
                lessonData.youtube_video_id = processed.encryptedId;
                lessonData.content_type = content_service_1.ContentType.YOUTUBE;
                lessonData.storage_type = 'youtube';
            }
        }
        if (dto.video_key) {
            lessonData.video_key = dto.video_key;
            lessonData.content_type = content_service_1.ContentType.VIDEO;
            lessonData.storage_type = 's3';
        }
        if (dto.external_url) {
            lessonData.external_url = dto.external_url;
            lessonData.storage_type = 'external';
        }
        if (dto.embed_code) {
            lessonData.embed_code = dto.embed_code;
            lessonData.content_type = content_service_1.ContentType.EMBEDDED;
            lessonData.storage_type = 'embedded';
        }
        const lesson = await this.prisma.courseLesson.create({
            data: lessonData,
        });
        await this.prisma.course.update({
            where: { id: courseId },
            data: { total_lessons: { increment: 1 } },
        });
        return lesson;
    }
    async getLessonVideoUrl(lessonId, userId, requestIp, userAgent, referrer) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        await this.rateLimit.checkRateLimit({
            userId,
            ip: requestIp,
            resourceType: 'video',
        });
        let accessSuccess = true;
        try {
            if (!lesson.is_free_preview) {
                const purchase = await this.prisma.coursePurchase.findUnique({
                    where: {
                        user_id_course_id: { user_id: userId, course_id: lesson.course_id },
                    },
                });
                if (!purchase) {
                    accessSuccess = false;
                    throw new common_1.ForbiddenException('Purchase this course to watch');
                }
            }
            const contentUrl = await this.contentService.generateContentUrl(lesson, userId);
            const signedUrl = this.contentSecurity.generateSignedUrl(contentUrl, {
                userId,
                lessonId,
                courseId: lesson.course_id,
                ip: requestIp,
            });
            await this.accessLog.logAccess({
                userId,
                lessonId,
                courseId: lesson.course_id,
                accessType: 'video',
                ipAddress: requestIp,
                userAgent,
                referrer,
                success: true,
            });
            return { url: signedUrl, content_type: lesson.content_type || 'youtube' };
        }
        catch (error) {
            await this.accessLog.logAccess({
                userId,
                lessonId,
                courseId: lesson.course_id,
                accessType: 'video',
                ipAddress: requestIp,
                userAgent,
                referrer,
                success: false,
            });
            throw error;
        }
    }
    async checkOwnership(userId, courseId) {
        const directPurchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (directPurchase)
            return directPurchase;
        const paidTransactions = await this.prisma.transaction.findMany({
            where: { user_id: userId, status: 'paid' },
        });
        const relevantTransaction = paidTransactions.find((tx) => {
            const metadata = tx.metadata;
            return (metadata?.entity_type === 'course' && metadata?.entity_id === courseId);
        });
        if (!relevantTransaction)
            return null;
        const purchase = await this.prisma.coursePurchase.create({
            data: {
                user_id: userId,
                course_id: courseId,
                amount_paid: relevantTransaction.amount,
            },
        });
        await this.prisma.transaction.update({
            where: { id: relevantTransaction.id },
            data: { purchase_id: purchase.id },
        });
        return purchase;
    }
    async enrollFree(userId, courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
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
    async updateProgress(purchaseId, lessonId, watchedSeconds, totalSeconds) {
        const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        if (!lesson.requires_progress) {
            return this.prisma.lessonProgress.upsert({
                where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
                create: { purchase_id: purchaseId, lesson_id: lessonId, watched_s: 0, completed: true, min_watch_pct: 100, completed_at: new Date() },
                update: {},
            });
        }
        const existing = await this.prisma.lessonProgress.findUnique({
            where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
        });
        if (existing) {
            const lastBeat = existing.last_heartbeat_at;
            if (lastBeat && Date.now() - new Date(lastBeat).getTime() < 9000) {
                return existing;
            }
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
        const pct = publishedLessons.length === 0 ? 0 : Math.floor((completedCount / publishedLessons.length) * 100);
        const isFullyComplete = pct >= 100;
        await this.prisma.coursePurchase.update({
            where: { id: purchaseId },
            data: {
                completion_pct: pct,
                ...(isFullyComplete && !purchase.completed_at ? { completed_at: new Date() } : {}),
            },
        });
    }
    async getCourseProgress(userId, courseId) {
        const purchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
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
                    },
                },
            }),
        ]);
        const progressMap = Object.fromEntries(lessonProgressRows.map((lp) => [lp.lesson_id, { completed: lp.completed, pct: lp.min_watch_pct ?? 0, watchedS: lp.watched_s }]));
        const publishedLessons = (course?.lessons ?? []);
        const completedCount = publishedLessons.filter((l) => progressMap[l.id]?.completed).length;
        const completionPct = publishedLessons.length === 0 ? 0 : Math.floor((completedCount / publishedLessons.length) * 100);
        return {
            purchaseId: purchase.id,
            completionPct,
            completedLessons: completedCount,
            totalLessons: publishedLessons.length,
            courseCompleted: !!purchase.completed_at,
            sections: (course?.sections ?? []),
            lessons: publishedLessons,
            progressMap,
        };
    }
    async listCategories() {
        return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    }
    async getCourseSections(courseId) {
        return this.prisma.courseSection.findMany({
            where: { course_id: courseId },
            orderBy: { position: 'asc' },
            include: { lessons: { orderBy: { position: 'asc' } } },
        });
    }
    async addSection(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course || course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        const section = await this.prisma.courseSection.create({
            data: {
                course_id: courseId,
                title: dto.title,
                description: dto.description,
                position: dto.position || 1,
            },
        });
        return section;
    }
    async deleteSection(sectionId, instructorUserId) {
        const section = await this.prisma.courseSection.findUnique({
            where: { id: sectionId },
            include: { course: true },
        });
        if (!section) {
            throw new common_1.NotFoundException('Section not found');
        }
        if (section.course.instructor_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        await this.prisma.courseLesson.updateMany({
            where: { section_id: sectionId },
            data: { section_id: null },
        });
        await this.prisma.courseSection.delete({
            where: { id: sectionId },
        });
    }
    async addMaterial(lessonId, instructorUserId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (lesson.course.instructor_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        const material = await this.prisma.lessonMaterial.create({
            data: {
                lesson_id: lessonId,
                title: dto.title,
                description: dto.description,
                material_type: dto.material_type,
                file_url: dto.file_url,
                file_name: dto.file_name,
                file_size: dto.file_size,
                is_downloadable: dto.is_downloadable !== false,
                is_free_preview: dto.is_free_preview || false,
                position: 1,
            },
        });
        await this.prisma.course.update({
            where: { id: lesson.course_id },
            data: { total_materials: { increment: 1 } },
        });
        return material;
    }
    async deleteMaterial(materialId, instructorUserId) {
        const material = await this.prisma.lessonMaterial.findUnique({
            where: { id: materialId },
            include: { lesson: { include: { course: true } } },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        if (material.lesson.course.instructor_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        await this.prisma.lessonMaterial.delete({
            where: { id: materialId },
        });
        await this.prisma.course.update({
            where: { id: material.lesson.course_id },
            data: { total_materials: { decrement: 1 } },
        });
    }
    async findInstructorCourses(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return [];
        return this.prisma.course.findMany({
            where: { instructor_id: profile.id },
            include: { lessons: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async updateLesson(lessonId, instructorUserId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: { include: { instructor: true } } },
        });
        if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorized to edit this lesson');
        }
        return this.prisma.courseLesson.update({
            where: { id: lessonId },
            data: dto,
        });
    }
    async deleteLesson(lessonId, instructorUserId) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: { include: { instructor: true } } },
        });
        if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorized to delete this lesson');
        }
        return this.prisma.courseLesson.delete({ where: { id: lessonId } });
    }
    async getMaterialDownloadUrl(materialId, userId) {
        const material = await this.prisma.lessonMaterial.findUnique({
            where: { id: materialId },
            include: { lesson: { include: { course: { include: { instructor: true } } } } },
        });
        if (!material)
            throw new common_1.NotFoundException('Material not found');
        const lesson = material.lesson;
        const isFree = material.is_free_preview || lesson.is_free_preview;
        if (!isFree) {
            const isInstructor = lesson.course.instructor.user_id === userId;
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
            const isAdmin = user?.role === 'admin';
            if (!isInstructor && !isAdmin) {
                const purchase = await this.prisma.coursePurchase.findUnique({
                    where: {
                        user_id_course_id: { user_id: userId, course_id: lesson.course_id },
                    },
                });
                if (!purchase) {
                    throw new common_1.ForbiddenException('Purchase this course to download materials');
                }
            }
        }
        if (!material.file_url)
            throw new common_1.NotFoundException('No file key found for material');
        if (material.file_url.startsWith('http://') || material.file_url.startsWith('https://')) {
            return { url: material.file_url, fileName: material.file_name || material.title };
        }
        const signedUrl = await this.storage.getSignedUrl(material.file_url);
        return { url: signedUrl, fileName: material.file_name || material.title };
    }
    async toggleWishlist(userId, courseId) {
        const existing = await this.prisma.wishlist.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (existing) {
            await this.prisma.wishlist.delete({ where: { id: existing.id } });
            return { wishlisted: false };
        }
        else {
            await this.prisma.wishlist.create({
                data: { user_id: userId, course_id: courseId },
            });
            return { wishlisted: true };
        }
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
        if (!coupon || !coupon.is_active) {
            throw new common_1.NotFoundException('Invalid or expired coupon code');
        }
        if (coupon.expires_at && new Date() > coupon.expires_at) {
            throw new common_1.BadRequestException('Coupon code has expired');
        }
        if (coupon.used_count >= coupon.max_uses) {
            throw new common_1.BadRequestException('Coupon usage limit reached');
        }
        return {
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: Number(coupon.discount_value),
            valid: true,
        };
    }
    async getLessonQuestions(lessonId) {
        return this.prisma.lessonQuestion.findMany({
            where: { lesson_id: lessonId },
            include: {
                user: { select: { first_name: true, last_name: true, role: true } },
                answers: {
                    include: {
                        user: { select: { first_name: true, last_name: true, role: true } },
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
            orderBy: { upvotes: 'desc' },
        });
    }
    async addLessonQuestion(userId, lessonId, title, details) {
        return this.prisma.lessonQuestion.create({
            data: {
                user_id: userId,
                lesson_id: lessonId,
                title,
                details,
            },
            include: {
                user: { select: { first_name: true, last_name: true, role: true } },
                answers: true,
            },
        });
    }
    async addLessonAnswer(userId, questionId, answer) {
        return this.prisma.lessonAnswer.create({
            data: {
                user_id: userId,
                question_id: questionId,
                answer,
            },
            include: {
                user: { select: { first_name: true, last_name: true, role: true } },
            },
        });
    }
    async acceptLessonAnswer(userId, answerId) {
        const ans = await this.prisma.lessonAnswer.findUnique({
            where: { id: answerId },
            include: { question: { include: { lesson: { include: { course: { include: { instructor: true } } } } } } },
        });
        if (!ans)
            throw new common_1.NotFoundException('Answer not found');
        const isQuestionAuthor = ans.question.user_id === userId;
        const isInstructor = ans.question.lesson.course.instructor.user_id === userId;
        if (!isQuestionAuthor && !isInstructor) {
            throw new common_1.ForbiddenException('Only question author or instructor can mark best answer');
        }
        return this.prisma.lessonAnswer.update({
            where: { id: answerId },
            data: { is_accepted: true },
        });
    }
    async upvoteLessonQuestion(questionId) {
        return this.prisma.lessonQuestion.update({
            where: { id: questionId },
            data: { upvotes: { increment: 1 } },
        });
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        content_service_1.ContentService,
        content_security_service_1.ContentSecurityService,
        rate_limit_service_1.RateLimitService,
        access_log_service_1.AccessLogService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map