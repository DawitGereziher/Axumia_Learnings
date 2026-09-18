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
const cache_service_1 = require("../common/services/cache.service");
const storage_service_1 = require("../storage/storage.service");
const enums_1 = require("../common/enums");
let CoursesService = class CoursesService {
    prisma;
    cache;
    storage;
    constructor(prisma, cache, storage) {
        this.prisma = prisma;
        this.cache = cache;
        this.storage = storage;
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
            if (user?.role === enums_1.UserRole.ADMIN || user?.role === enums_1.UserRole.INSTRUCTOR) {
                profile = await this.prisma.instructorProfile.create({
                    data: {
                        user_id: instructorUserId,
                        kyc_status: enums_1.KycStatus.APPROVED,
                        is_active: true,
                    },
                });
            }
            else {
                throw new common_1.ForbiddenException('You must have an approved instructor profile to create courses');
            }
        }
        else if (!profile.is_active) {
            if (user?.role === enums_1.UserRole.ADMIN) {
                profile = await this.prisma.instructorProfile.update({
                    where: { id: profile.id },
                    data: { is_active: true, kyc_status: enums_1.KycStatus.APPROVED },
                });
            }
            else {
                throw new common_1.ForbiddenException('Your instructor profile must be approved before creating courses');
            }
        }
        const slug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') +
            '-' +
            Math.random().toString(36).slice(2, 8);
        const course = await this.prisma.course.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                category_id: dto.category_id,
                level: dto.level,
                language: dto.language,
                tags: dto.tags ?? [],
                thumbnail: dto.thumbnail,
                thumbnail_url: dto.thumbnail_url ?? dto.thumbnail,
                estimated_hours: dto.estimated_hours,
                prerequisites: dto.prerequisites ?? [],
                learning_objectives: dto.learning_objectives ?? [],
                instructor_id: profile.id,
                slug,
            },
        });
        return course;
    }
    async findAll(query) {
        const sortedQuery = Object.fromEntries(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)));
        const cacheKey = `courses:list:${JSON.stringify(sortedQuery)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const { search, category, level, language, priceRange, minPrice, maxPrice, minRating, sort = enums_1.SortOrder.NEWEST, page = 1, limit = 20, } = query;
        const skip = (page - 1) * limit;
        const where = { status: enums_1.CourseStatus.PUBLISHED };
        if (category) {
            where.OR = [{ category: { slug: category } }, { category_id: category }];
        }
        if (level && level !== 'all')
            where.level = level;
        if (language && language !== 'all')
            where.language = language;
        if (priceRange === enums_1.PriceRange.FREE) {
            where.price = { equals: 0 };
        }
        else if (priceRange === enums_1.PriceRange.UNDER_500) {
            where.price = { lte: 500 };
        }
        else if (priceRange === enums_1.PriceRange.BETWEEN_500_2000) {
            where.price = { gte: 500, lte: 2000 };
        }
        else if (priceRange === enums_1.PriceRange.OVER_2000) {
            where.price = { gte: 2000 };
        }
        else if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            };
        }
        if (search) {
            where.AND = [
                ...(Array.isArray(where.AND) ? where.AND : []),
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
        if (sort === enums_1.SortOrder.PRICE_ASC)
            orderBy = { price: 'asc' };
        else if (sort === enums_1.SortOrder.PRICE_DESC)
            orderBy = { price: 'desc' };
        else if (sort === enums_1.SortOrder.POPULAR)
            orderBy = { purchases: { _count: 'desc' } };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.course.findMany({
                where,
                include: {
                    instructor: { include: { user: true } },
                    category: true,
                    _count: { select: { purchases: true, courseReviews: true } },
                    courseReviews: { where: { is_hidden: false }, select: { overall_rating: true } },
                },
                skip,
                take: limit,
                orderBy,
            }),
            this.prisma.course.count({ where }),
        ]);
        const formattedData = data.map((c) => {
            const ratings = c.courseReviews?.map((cr) => cr.overall_rating) ?? [];
            const avgRating = ratings.length > 0 ? ratings.reduce((a, r) => a + r, 0) / ratings.length : 0;
            const { courseReviews, ...rest } = c;
            return {
                ...rest,
                avgRating: Math.round(avgRating * 10) / 10,
                _count: { ...c._count, reviews: ratings.length },
            };
        });
        const finalData = minRating
            ? formattedData.filter((c) => c.avgRating >= minRating)
            : formattedData;
        const result = {
            data: finalData,
            total: minRating ? finalData.length : total,
            page,
            limit,
        };
        await this.cache.set(cacheKey, result, 300);
        return result;
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
                lessons: { orderBy: { position: 'asc' }, include: { materials: true } },
                courseReviews: {
                    where: { is_hidden: false },
                    include: { user: { select: { id: true, first_name: true, last_name: true, image: true } } },
                    orderBy: { created_at: 'desc' },
                    take: 10,
                },
                _count: { select: { purchases: true, courseReviews: true } },
            },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const ratings = course.courseReviews?.map((cr) => cr.overall_rating) ?? [];
        const avgRating = ratings.length > 0 ? ratings.reduce((a, r) => a + r, 0) / ratings.length : 0;
        return {
            ...course,
            avgRating: Math.round(avgRating * 10) / 10,
            _count: { ...course._count, reviews: ratings.length },
        };
    }
    async update(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        const isOwner = course.instructor.user_id === instructorUserId;
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('You do not own this course');
        const updated = await this.prisma.course.update({
            where: { id: courseId },
            data: {
                ...(dto.title !== undefined ? { title: dto.title } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.price !== undefined ? { price: dto.price } : {}),
                ...(dto.level !== undefined ? { level: dto.level } : {}),
                ...(dto.language !== undefined ? { language: dto.language } : {}),
                ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
                ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail,
                    thumbnail_url: dto.thumbnail_url ?? dto.thumbnail } : {}),
                ...(dto.estimated_hours !== undefined ? { estimated_hours: dto.estimated_hours } : {}),
                ...(dto.prerequisites !== undefined ? { prerequisites: dto.prerequisites } : {}),
                ...(dto.learning_objectives !== undefined ? { learning_objectives: dto.learning_objectives } : {}),
            },
        });
        await this.cache.delPattern('courses:list:*');
        return updated;
    }
    async publishCourse(courseId, instructorUserId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true, lessons: { where: { is_published: true } } },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        const isOwner = course.instructor.user_id === instructorUserId;
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('You do not own this course');
        if (course.status === enums_1.CourseStatus.PUBLISHED) {
            return { message: 'Course is already published', course };
        }
        if (!course.title || !course.description) {
            throw new common_1.BadRequestException('Course must have a title and description before publishing');
        }
        if (course.lessons.length === 0) {
            throw new common_1.BadRequestException('Course must have at least one published lesson before publishing');
        }
        const published = await this.prisma.course.update({
            where: { id: courseId },
            data: { status: enums_1.CourseStatus.PUBLISHED, last_published_at: new Date() },
        });
        await this.cache.delPattern('courses:list:*');
        return published;
    }
    async archiveCourse(courseId, instructorUserId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        const isOwner = course.instructor.user_id === instructorUserId;
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('You do not own this course');
        const archived = await this.prisma.course.update({
            where: { id: courseId },
            data: { status: 'archived' },
        });
        await this.cache.delPattern('courses:list:*');
        return archived;
    }
    async getThumbnailUploadUrl(courseId, instructorUserId, contentType) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        const isOwner = course.instructor.user_id === instructorUserId;
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('You do not own this course');
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(contentType)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, WebP thumbnails are allowed');
        }
        const ext = contentType.split('/')[1];
        const key = this.storage.buildKey('thumbnail', courseId, `thumb.${ext}`);
        const uploadUrl = await this.storage.getUploadUrl('public', key, contentType);
        const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
        const imageUrl = publicDomain ? `${publicDomain}/${key}` : uploadUrl.split('?')[0];
        await this.prisma.course.update({
            where: { id: courseId },
            data: { thumbnail: key, thumbnail_url: imageUrl },
        });
        await this.cache.delPattern('courses:list:*');
        return { uploadUrl, imageUrl, key };
    }
    async findInstructorCourses(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return [];
        return this.prisma.course.findMany({
            where: { instructor_id: profile.id },
            include: {
                lessons: true,
                _count: { select: { purchases: true, courseReviews: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getInstructorAnalytics(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        const courses = await this.prisma.course.findMany({
            where: { instructor_id: profile.id },
            include: {
                _count: { select: { purchases: true, courseReviews: true } },
                courseReviews: { where: { is_hidden: false }, select: { overall_rating: true } },
                purchases: {
                    select: {
                        amount_paid: true,
                        completion_pct: true,
                        completed_at: true,
                        created_at: true,
                    },
                },
            },
        });
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const analyticsPerCourse = courses.map((c) => {
            const ratings = c.courseReviews.map((r) => r.overall_rating);
            const avgRating = ratings.length > 0 ? ratings.reduce((a, r) => a + r, 0) / ratings.length : 0;
            const totalRevenue = c.purchases.reduce((sum, p) => sum + Number(p.amount_paid), 0);
            const revenueThisMonth = c.purchases
                .filter((p) => new Date(p.created_at) >= thirtyDaysAgo)
                .reduce((sum, p) => sum + Number(p.amount_paid), 0);
            const enrolledThisMonth = c.purchases.filter((p) => new Date(p.created_at) >= thirtyDaysAgo).length;
            const completed = c.purchases.filter((p) => !!p.completed_at).length;
            const completionRate = c.purchases.length > 0 ? Math.round((completed / c.purchases.length) * 100) : 0;
            const { purchases, courseReviews, ...courseRest } = c;
            return {
                ...courseRest,
                avgRating: Math.round(avgRating * 10) / 10,
                totalEnrollments: c.purchases.length,
                enrolledThisMonth,
                totalRevenue,
                revenueThisMonth,
                completionRate,
            };
        });
        const totalRevenue = analyticsPerCourse.reduce((sum, c) => sum + c.totalRevenue, 0);
        const totalEnrollments = analyticsPerCourse.reduce((sum, c) => sum + c.totalEnrollments, 0);
        const revenueThisMonth = analyticsPerCourse.reduce((sum, c) => sum + c.revenueThisMonth, 0);
        const enrolledThisMonth = analyticsPerCourse.reduce((sum, c) => sum + c.enrolledThisMonth, 0);
        return {
            summary: {
                totalCourses: courses.length,
                publishedCourses: courses.filter((c) => c.status === 'published').length,
                totalEnrollments,
                enrolledThisMonth,
                totalRevenue,
                revenueThisMonth,
                avgRating: analyticsPerCourse.length > 0
                    ? Math.round((analyticsPerCourse.reduce((sum, c) => sum + c.avgRating, 0) /
                        analyticsPerCourse.length) *
                        10) / 10
                    : 0,
            },
            courses: analyticsPerCourse,
        };
    }
    async listCategories() {
        return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        storage_service_1.StorageService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map