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
        return this.prisma.user.update({ where: { id }, data: dto });
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
            data: dto,
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
                        email: false,
                        image: true,
                    },
                },
                courses: {
                    include: { _count: { select: { purchases: true, reviews: true } } },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor not found');
        const reviews = await this.prisma.review.findMany({
            where: {
                OR: [
                    { booking: { instructor_id: profile.id } },
                    { course: { instructor_id: profile.id } },
                ],
            },
            include: {
                user: { select: { first_name: true, last_name: true, image: true } },
            },
            orderBy: { created_at: 'desc' },
            take: 20,
        });
        return { ...profile, reviews };
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
    async listInstructors(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.instructorProfile.findMany({
                include: { user: true },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.instructorProfile.count(),
        ]);
        return { data, total, page, limit };
    }
    async getPurchases(userId) {
        return this.prisma.coursePurchase.findMany({
            where: { user_id: userId },
            include: {
                course: {
                    include: {
                        instructor: {
                            include: { user: true },
                        },
                    },
                },
            },
        });
    }
    async toggleFollowInstructor(userId, profileId) {
        const prisma = this.prisma;
        const existing = await prisma.instructorFollow.findUnique({
            where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
        });
        if (existing) {
            await prisma.instructorFollow.delete({ where: { id: existing.id } });
            const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
            return { following: false, followerCount: count };
        }
        else {
            await prisma.instructorFollow.create({
                data: { user_id: userId, instructor_id: profileId },
            });
            const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
            return { following: true, followerCount: count };
        }
    }
    async getFollowStatus(userId, profileId) {
        const prisma = this.prisma;
        const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
        if (!userId)
            return { following: false, followerCount: count };
        const existing = await prisma.instructorFollow.findUnique({
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