import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  QUEUE_NOTIFICATIONS,
  QUEUE_TRANSCODING,
  QUEUE_PAYOUTS,
} from '../queue/queue.constants';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QUEUE_TRANSCODING) private transcodingQueue: Queue,
    @InjectQueue(QUEUE_PAYOUTS) private payoutsQueue: Queue,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────────
  async listUsers(opts: {
    page: number;
    limit: number;
    role?: string;
    search?: string;
  }) {
    const { page, limit, role, search } = opts;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
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

  async updateUserRole(userId: string, role: string) {
    const allowed = ['student', 'instructor', 'admin'];
    if (!allowed.includes(role)) {
      throw new BadRequestException(
        `Role must be one of: ${allowed.join(', ')}`,
      );
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

  async verifyUserEmail(userId: string, isVerified: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { is_email_verified: isVerified },
    });
  }

  // ── KYC ───────────────────────────────────────────────────────────────────
  async getPendingKyc() {
    const profiles = await this.prisma.instructorProfile.findMany({
      where: { kyc_status: { in: ['submitted', 'pending'] } },
      include: {
        user: { select: { email: true, first_name: true, last_name: true } },
      },
      orderBy: { updated_at: 'asc' },
    });

    return await Promise.all(
      profiles.map(async (p) => {
        const signedKycDocs = await Promise.all(
          (p.kyc_docs || []).map(async (docKey) => {
            if (docKey.startsWith('http://') || docKey.startsWith('https://')) {
              return { key: docKey, url: docKey };
            }
            try {
              const url = await this.storage.getSignedUrl(docKey);
              return { key: docKey, url };
            } catch (err) {
              return { key: docKey, url: null };
            }
          }),
        );
        return { ...p, signedKycDocs };
      }),
    );
  }

  async updateKycStatus(
    profileId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');

    const data: any = { kyc_status: status };
    if (status === 'approved') data.is_active = true;
    if (notes)
      data.bio = profile.bio
        ? `${profile.bio}\n\n[Admin note: ${notes}]`
        : notes;

    return this.prisma.instructorProfile.update({
      where: { id: profileId },
      data,
    });
  }

  // ── Payouts ───────────────────────────────────────────────────────────────
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

  async updatePayoutStatus(
    payoutId: string,
    status: 'paid' | 'failed',
    notes?: string,
  ) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    const data: any = { status };
    if (status === 'paid') data.paid_at = new Date();
    if (notes) data.notes = notes;

    return this.prisma.payout.update({ where: { id: payoutId }, data });
  }

  // ── Platform Stats ────────────────────────────────────────────────────────
  async getPlatformStats() {
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      pendingKyc,
      publishedCourses,
      totalRevenue,
      pendingPayouts,
    ] = await this.prisma.$transaction([
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

  // ── BullMQ Queue Monitoring ────────────────────────────────────────────────
  async getQueueStatus() {
    const getCounts = async (q: Queue) => {
      try {
        const counts = await q.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
        return counts;
      } catch {
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
        [QUEUE_NOTIFICATIONS]: notifications,
        [QUEUE_TRANSCODING]: transcoding,
        [QUEUE_PAYOUTS]: payouts,
      },
    };
  }

  async retryFailedJobs(queueName: string) {
    let q: Queue | null = null;
    if (queueName === QUEUE_NOTIFICATIONS) q = this.notificationsQueue;
    if (queueName === QUEUE_TRANSCODING) q = this.transcodingQueue;
    if (queueName === QUEUE_PAYOUTS) q = this.payoutsQueue;

    if (!q) throw new BadRequestException('Invalid queue name');

    const failed = await q.getFailed();
    for (const job of failed) {
      await job.retry();
    }
    return { retried: failed.length };
  }

  // ── Course Management ──────────────────────────────────────────────────────
  async listCourses(opts: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = opts;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
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

  async updateCourseStatus(courseId: string, status: string) {
    const valid = ['draft', 'published', 'archived'];
    if (!valid.includes(status)) throw new BadRequestException('Invalid course status');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status },
    });
  }

  async deleteCourse(courseId: string) {
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  // ── Financial Ledger & CSV Export ──────────────────────────────────────────
  async listTransactions(opts: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = opts;
    const skip = (page - 1) * limit;
    const where: any = {};
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
      .map(
        (t) =>
          `"${t.id}","${t.provider_tx_ref || ''}","${t.user?.email || ''}",${t.amount},${t.platform_fee},"${t.currency}","${t.status}","${t.created_at.toISOString()}"`,
      )
      .join('\n');

    return header + rows;
  }

  // ── Categories Management ──────────────────────────────────────────────────
  async listCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: { name: string; slug?: string; icon?: string }) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.prisma.category.create({
      data: { name: dto.name, slug, icon: dto.icon },
    });
  }

  async updateCategory(id: string, dto: { name?: string; slug?: string; icon?: string }) {
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  // ── All Payouts ────────────────────────────────────────────────────────────
  async getAllPayouts() {
    return this.prisma.payout.findMany({
      include: {
        transaction: { select: { amount: true, currency: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
