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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async syncUser(jwtPayload) {
        return this.prisma.user.upsert({
            where: { id: jwtPayload.id },
            create: {
                id: jwtPayload.id,
                email: jwtPayload.email,
                first_name: jwtPayload.name?.split(' ')[0] || '',
                last_name: jwtPayload.name?.split(' ').slice(1).join(' ') || '',
                role: jwtPayload.role || 'student',
            },
            update: {
                email: jwtPayload.email,
                role: jwtPayload.role || 'student',
            },
        });
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async getProfile(id) {
        return this.prisma.user.findUnique({
            where: { id },
            include: { instructorProfile: true },
        });
    }
    async updateProfile(id, dto) {
        return this.prisma.user.update({
            where: { id },
            data: {
                first_name: dto.first_name,
                last_name: dto.last_name,
                image: dto.image,
                ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            },
        });
    }
    async submitInstructorProfile(userId, dto) {
        return this.prisma.instructorProfile.upsert({
            where: { user_id: userId },
            create: { user_id: userId, ...dto, kyc_status: 'submitted' },
            update: { ...dto, kyc_status: 'submitted' },
        });
    }
    async updateRichInstructorProfile(userId, dto) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        return this.prisma.instructorProfile.update({
            where: { user_id: userId },
            data: {
                bio: dto.bio,
                headline: dto.headline,
                hourly_rate: dto.hourly_rate,
                cover_image: dto.cover_image,
                profile_image: dto.profile_image,
                skills: dto.skills,
                languages: dto.languages,
                experience_years: dto.experience_years,
                location: dto.location,
                website_url: dto.website_url,
                linkedin_url: dto.linkedin_url,
                twitter_url: dto.twitter_url,
                youtube_url: dto.youtube_url,
                ...(dto.kyc_docs !== undefined ? { kyc_docs: dto.kyc_docs } : {}),
            },
        });
    }
    async getPublicInstructorProfile(profileId) {
        const profile = await this.prisma.instructorProfile.findFirst({
            where: {
                OR: [{ id: profileId }, { user_id: profileId }],
            },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        image: true,
                    },
                },
                courses: {
                    where: { status: 'published' },
                    include: {
                        _count: { select: { purchases: true, courseReviews: true } },
                        courseReviews: { where: { is_hidden: false }, select: { overall_rating: true } },
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor not found');
        const [courseReviews, sessionReviews] = await Promise.all([
            this.prisma.courseReview.findMany({
                where: { course: { instructor_id: profile.id }, is_hidden: false },
                include: {
                    user: { select: { id: true, first_name: true, last_name: true, image: true } },
                    course: { select: { id: true, title: true } },
                },
                orderBy: { created_at: 'desc' },
                take: 30,
            }),
            this.prisma.sessionReview.findMany({
                where: { instructor_id: profile.id },
                include: {
                    student: { select: { id: true, first_name: true, last_name: true, image: true } },
                    booking: { select: { id: true, session_type: true } },
                    helpSession: { include: { request: { select: { title: true, subject_area: true } } } },
                },
                orderBy: { created_at: 'desc' },
                take: 30,
            }),
        ]);
        const formattedCourseReviews = courseReviews.map((cr) => ({
            id: cr.id,
            rating: cr.overall_rating,
            comment: cr.comment || cr.title || '',
            created_at: cr.created_at,
            user: cr.user,
            course_title: cr.course?.title,
            course_id: cr.course?.id,
            type: 'course',
        }));
        const formattedSessionReviews = sessionReviews.map((sr) => ({
            id: sr.id,
            rating: sr.overall_rating,
            teaching_style_rating: sr.teaching_style_rating,
            communication_rating: sr.communication_rating,
            comment: sr.comment || '',
            created_at: sr.created_at,
            user: sr.student,
            type: sr.booking_id ? 'booking' : 'help',
            session_title: sr.booking_id
                ? '1-on-1 Mentorship Session'
                : (sr.helpSession?.request?.title || 'Help Request Session'),
        }));
        const allReviews = [...formattedCourseReviews, ...formattedSessionReviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const totalRatingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = allReviews.length > 0
            ? (totalRatingSum / allReviews.length).toFixed(1)
            : profile.avg_rating && Number(profile.avg_rating) > 0
                ? Number(profile.avg_rating).toFixed(1)
                : '5.0';
        const formattedCourses = profile.courses.map((c) => {
            const ratings = c.courseReviews?.map((cr) => cr.overall_rating) || [];
            const totalScore = ratings.reduce((acc, r) => acc + r, 0);
            const cAvg = ratings.length > 0 ? totalScore / ratings.length : 0;
            const { courseReviews: _, ...rest } = c;
            return {
                ...rest,
                avgRating: Math.round(cAvg * 10) / 10,
                _count: { ...c._count, reviews: ratings.length },
            };
        });
        return {
            ...profile,
            courses: formattedCourses,
            reviews: allReviews,
            rating: avgRating,
            avg_rating: avgRating,
            total_reviews: allReviews.length,
        };
    }
    async createInstructorReview(userId, instructorId, dto) {
        if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
            throw new common_1.BadRequestException('Rating must be between 1 and 5 stars');
        }
        const profile = await this.prisma.instructorProfile.findFirst({
            where: { OR: [{ id: instructorId }, { user_id: instructorId }] },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        if (profile.user_id === userId) {
            throw new common_1.BadRequestException('You cannot review your own instructor profile');
        }
        let courseId = dto.course_id;
        if (!courseId) {
            const course = await this.prisma.course.findFirst({
                where: { instructor_id: profile.id, status: 'published' },
                select: { id: true },
                orderBy: { created_at: 'desc' },
            });
            if (!course) {
                throw new common_1.BadRequestException('Instructor has no published courses to review');
            }
            courseId = course.id;
        }
        const ratingVal = Math.round(dto.rating);
        const review = await this.prisma.courseReview.upsert({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
            update: {
                overall_rating: ratingVal,
                content_quality: ratingVal,
                instructor_quality: ratingVal,
                course_structure: ratingVal,
                value_for_money: ratingVal,
                comment: dto.comment?.trim() || null,
            },
            create: {
                user_id: userId,
                course_id: courseId,
                overall_rating: ratingVal,
                content_quality: ratingVal,
                instructor_quality: ratingVal,
                course_structure: ratingVal,
                value_for_money: ratingVal,
                comment: dto.comment?.trim() || null,
                is_verified: true,
            },
            include: {
                user: { select: { id: true, first_name: true, last_name: true, image: true } },
                course: { select: { id: true, title: true } },
            },
        });
        const allCourseReviews = await this.prisma.courseReview.findMany({
            where: { course: { instructor_id: profile.id }, is_hidden: false },
            select: { overall_rating: true },
        });
        if (allCourseReviews.length > 0) {
            const avg = allCourseReviews.reduce((s, r) => s + r.overall_rating, 0) / allCourseReviews.length;
            await this.prisma.instructorProfile.update({
                where: { id: profile.id },
                data: { avg_rating: avg },
            });
        }
        return {
            id: review.id,
            rating: review.overall_rating,
            comment: review.comment || '',
            created_at: review.created_at,
            user: review.user,
            course_title: review.course?.title,
        };
    }
    async updateKycStatus(userId, status) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        return this.prisma.instructorProfile.update({
            where: { user_id: userId },
            data: { kyc_status: status, is_active: status === 'approved' },
        });
    }
    async listInstructors(page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const where = {
            kyc_status: 'approved',
            is_active: true,
            ...(search
                ? {
                    OR: [
                        { user: { first_name: { contains: search, mode: 'insensitive' } } },
                        { user: { last_name: { contains: search, mode: 'insensitive' } } },
                        { headline: { contains: search, mode: 'insensitive' } },
                        { skills: { has: search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.instructorProfile.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, first_name: true, last_name: true, image: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { avg_rating: 'desc' },
            }),
            this.prisma.instructorProfile.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async getPurchases(userId) {
        return this.prisma.coursePurchase.findMany({
            where: { user_id: userId },
            include: {
                course: {
                    include: { instructor: { include: { user: true } } },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getStudentDashboard(userId) {
        const [user, enrolledCourses, upcomingBookings, certificates] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    image: true,
                    role: true,
                },
            }),
            this.prisma.coursePurchase.findMany({
                where: { user_id: userId },
                select: {
                    id: true,
                    course_id: true,
                    completion_pct: true,
                    completed_at: true,
                    created_at: true,
                    course: {
                        select: {
                            id: true,
                            slug: true,
                            title: true,
                            thumbnail_url: true,
                            total_lessons: true,
                            instructor: {
                                select: {
                                    user: { select: { first_name: true, last_name: true } },
                                },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 8,
            }),
            this.prisma.booking.findMany({
                where: {
                    student_id: userId,
                    status: { in: ['confirmed', 'pending'] },
                    slot: { starts_at: { gte: new Date() } },
                },
                include: {
                    slot: { select: { starts_at: true, ends_at: true } },
                    instructor: {
                        include: {
                            user: {
                                select: { first_name: true, last_name: true, image: true },
                            },
                        },
                    },
                },
                orderBy: { slot: { starts_at: 'asc' } },
                take: 5,
            }),
            this.prisma.certificate.findMany({
                where: { user_id: userId },
                orderBy: { issued_at: 'desc' },
                take: 5,
            }),
        ]);
        let totalXp = 0;
        try {
            const xpResult = await this.prisma.$queryRaw `
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM xp_logs WHERE user_id = ${userId}::uuid`;
            totalXp = Number(xpResult[0]?.total ?? 0);
        }
        catch {
        }
        let badges = [];
        try {
            badges = await this.prisma.$queryRaw `
        SELECT badge_id, earned_at FROM user_badges
        WHERE user_id = ${userId}::uuid
        ORDER BY earned_at DESC`;
        }
        catch {
        }
        const coursesWithProgress = enrolledCourses.map((p) => ({
            ...p.course,
            purchase_id: p.id,
            progress: p.completion_pct,
            completed: !!p.completed_at,
        }));
        return {
            user,
            enrolled_count: coursesWithProgress.length,
            courses: coursesWithProgress,
            upcoming_bookings: upcomingBookings,
            certificates,
            gamification: { xp: totalXp, badges },
        };
    }
    async toggleFollowInstructor(userId, profileId) {
        const existing = await this.prisma.instructorFollow.findUnique({
            where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
        });
        if (existing) {
            await this.prisma.instructorFollow.delete({ where: { id: existing.id } });
            const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
            return { following: false, followerCount: count };
        }
        else {
            await this.prisma.instructorFollow.create({
                data: { user_id: userId, instructor_id: profileId },
            });
            const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
            return { following: true, followerCount: count };
        }
    }
    async getFollowStatus(userId, profileId) {
        const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
        if (!userId)
            return { following: false, followerCount: count };
        const existing = await this.prisma.instructorFollow.findUnique({
            where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
        });
        return { following: !!existing, followerCount: count };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map