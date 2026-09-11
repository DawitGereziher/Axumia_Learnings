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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const queue_constants_1 = require("../queue/queue.constants");
let AdminService = class AdminService {
    prisma;
    storage;
    notificationsQueue;
    transcodingQueue;
    payoutsQueue;
    constructor(prisma, storage, notificationsQueue, transcodingQueue, payoutsQueue) {
        this.prisma = prisma;
        this.storage = storage;
        this.notificationsQueue = notificationsQueue;
        this.transcodingQueue = transcodingQueue;
        this.payoutsQueue = payoutsQueue;
    }
    async listUsers(opts) {
        const { page, limit, role, search } = opts;
        const skip = (page - 1) * limit;
        const where = {};
        if (role)
            where.role = role;
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                    is_email_verified: true,
                    created_at: true,
                    instructorProfile: { select: { kyc_status: true, is_active: true } },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async updateUserRole(userId, role) {
        const allowed = ['student', 'instructor', 'admin'];
        if (!allowed.includes(role)) {
            throw new common_1.BadRequestException(`Role must be one of: ${allowed.join(', ')}`);
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { role },
        });
        if (role === 'instructor') {
            const existingProfile = await this.prisma.instructorProfile.findUnique({
                where: { user_id: userId },
            });
            if (!existingProfile) {
                await this.prisma.instructorProfile.create({
                    data: {
                        user_id: userId,
                        kyc_status: 'submitted',
                        is_active: true,
                    },
                });
            }
        }
        return updatedUser;
    }
    async verifyUserEmail(userId, isVerified) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { is_email_verified: isVerified },
        });
    }
    async getPendingKyc() {
        const profiles = await this.prisma.instructorProfile.findMany({
            where: { kyc_status: { in: ['submitted', 'pending'] } },
            include: {
                user: { select: { email: true, first_name: true, last_name: true } },
            },
            orderBy: { updated_at: 'asc' },
        });
        return await Promise.all(profiles.map(async (p) => {
            const signedKycDocs = await Promise.all((p.kyc_docs || []).map(async (docKey) => {
                if (docKey.startsWith('http://') || docKey.startsWith('https://')) {
                    return { key: docKey, url: docKey };
                }
                try {
                    const url = await this.storage.getSignedUrl(docKey);
                    return { key: docKey, url };
                }
                catch (err) {
                    return { key: docKey, url: null };
                }
            }));
            return { ...p, signedKycDocs };
        }));
    }
    async updateKycStatus(profileId, status, notes) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Instructor profile not found');
        const data = { kyc_status: status };
        if (status === 'approved')
            data.is_active = true;
        if (notes)
            data.bio = profile.bio
                ? `${profile.bio}\n\n[Admin note: ${notes}]`
                : notes;
        return this.prisma.instructorProfile.update({
            where: { id: profileId },
            data,
        });
    }
    async getPendingPayouts() {
        return this.prisma.payout.findMany({
            where: { status: 'pending' },
            include: {
                transaction: {
                    select: { amount: true, currency: true, created_at: true },
                },
            },
            orderBy: { created_at: 'asc' },
        });
    }
    async updatePayoutStatus(payoutId, status, notes) {
        const payout = await this.prisma.payout.findUnique({
            where: { id: payoutId },
        });
        if (!payout)
            throw new common_1.NotFoundException('Payout not found');
        const data = { status };
        if (status === 'paid')
            data.paid_at = new Date();
        if (notes)
            data.notes = notes;
        return this.prisma.payout.update({ where: { id: payoutId }, data });
    }
    async getPlatformStats() {
        const [totalUsers, totalStudents, totalInstructors, pendingKyc, publishedCourses, totalRevenue, pendingPayouts,] = await this.prisma.$transaction([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: 'student' } }),
            this.prisma.user.count({ where: { role: 'instructor' } }),
            this.prisma.instructorProfile.count({
                where: { kyc_status: 'submitted' },
            }),
            this.prisma.course.count({ where: { status: 'published' } }),
            this.prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { status: 'paid' },
            }),
            this.prisma.payout.count({ where: { status: 'pending' } }),
        ]);
        return {
            users: {
                total: totalUsers,
                students: totalStudents,
                instructors: totalInstructors,
            },
            content: { publishedCourses },
            finance: {
                totalRevenue: totalRevenue._sum.amount ?? 0,
                pendingPayouts,
                pendingKycApprovals: pendingKyc,
            },
        };
    }
    async getQueueStatus() {
        const getCounts = async (q) => {
            try {
                const counts = await q.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
                return counts;
            }
            catch {
                return { active: 0, completed: 0, failed: 0, delayed: 0, waiting: 0 };
            }
        };
        const [notifications, transcoding, payouts] = await Promise.all([
            getCounts(this.notificationsQueue),
            getCounts(this.transcodingQueue),
            getCounts(this.payoutsQueue),
        ]);
        return {
            queues: {
                [queue_constants_1.QUEUE_NOTIFICATIONS]: notifications,
                [queue_constants_1.QUEUE_TRANSCODING]: transcoding,
                [queue_constants_1.QUEUE_PAYOUTS]: payouts,
            },
        };
    }
    async retryFailedJobs(queueName) {
        let q = null;
        if (queueName === queue_constants_1.QUEUE_NOTIFICATIONS)
            q = this.notificationsQueue;
        if (queueName === queue_constants_1.QUEUE_TRANSCODING)
            q = this.transcodingQueue;
        if (queueName === queue_constants_1.QUEUE_PAYOUTS)
            q = this.payoutsQueue;
        if (!q)
            throw new common_1.BadRequestException('Invalid queue name');
        const failed = await q.getFailed();
        for (const job of failed) {
            await job.retry();
        }
        return { retried: failed.length };
    }
    async listCourses(opts) {
        const { page, limit, status, search } = opts;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.course.findMany({
                where,
                skip,
                take: limit,
                include: {
                    instructor: {
                        include: { user: { select: { first_name: true, last_name: true, email: true } } },
                    },
                    category: true,
                    _count: { select: { purchases: true, lessons: true } },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.course.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async updateCourseStatus(courseId, status) {
        const valid = ['draft', 'published', 'archived'];
        if (!valid.includes(status))
            throw new common_1.BadRequestException('Invalid course status');
        return this.prisma.course.update({
            where: { id: courseId },
            data: { status },
        });
    }
    async deleteCourse(courseId) {
        return this.prisma.course.delete({ where: { id: courseId } });
    }
    async listTransactions(opts) {
        const { page, limit, search } = opts;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { provider_tx_ref: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { email: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.transaction.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async exportTransactionsCsv() {
        const transactions = await this.prisma.transaction.findMany({
            include: {
                user: { select: { email: true, first_name: true, last_name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        const header = 'ID,TxRef,UserEmail,Amount,PlatformFee,Currency,Status,CreatedAt\n';
        const rows = transactions
            .map((t) => `"${t.id}","${t.provider_tx_ref || ''}","${t.user?.email || ''}",${t.amount},${t.platform_fee},"${t.currency}","${t.status}","${t.created_at.toISOString()}"`)
            .join('\n');
        return header + rows;
    }
    async listCategories() {
        return this.prisma.category.findMany({
            include: { _count: { select: { courses: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(dto) {
        const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return this.prisma.category.create({
            data: { name: dto.name, slug, icon: dto.icon },
        });
    }
    async updateCategory(id, dto) {
        return this.prisma.category.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(id) {
        return this.prisma.category.delete({ where: { id } });
    }
    async getAllPayouts() {
        return this.prisma.payout.findMany({
            include: {
                transaction: { select: { amount: true, currency: true, created_at: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NOTIFICATIONS)),
    __param(3, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_TRANSCODING)),
    __param(4, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_PAYOUTS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], AdminService);
//# sourceMappingURL=admin.service.js.map