import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  // ── Ownership check ──────────────────────────────────────────────────────────

  async checkOwnership(userId: string, courseId: string) {
    // Fast path: direct CoursePurchase lookup (indexed, O(1))
    const directPurchase = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (directPurchase) return directPurchase;

    // Instructor / Admin auto-ownership
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

    // Slow path: scan paid transactions by metadata (handles missed purchase record)
    const paidTransactions = await this.prisma.transaction.findMany({
      where: { user_id: userId, status: 'paid' },
    });
    const relevant = paidTransactions.find((tx) => {
      const meta = tx.metadata as any;
      return meta?.entity_type === 'course' && meta?.entity_id === courseId;
    });
    if (!relevant) return null;

    const purchase = await this.prisma.coursePurchase.create({
      data: { user_id: userId, course_id: courseId, amount_paid: relevant.amount },
    });
    await this.prisma.transaction.update({
      where: { id: relevant.id },
      data: { purchase_id: purchase.id },
    });
    return purchase;
  }

  // ── Free enroll ──────────────────────────────────────────────────────────────

  async enrollFree(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (Number(course.price) !== 0) {
      throw new ForbiddenException('This course requires payment. Use the checkout flow.');
    }
    const existing = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (existing) return { purchase: existing, alreadyEnrolled: true };

    const purchase = await this.prisma.coursePurchase.create({
      data: { user_id: userId, course_id: courseId, amount_paid: 0 },
    });
    return { purchase, alreadyEnrolled: false };
  }

  // ── Progress tracking ────────────────────────────────────────────────────────

  async updateProgress(
    userId: string,
    purchaseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds?: number,
  ) {
    // ── Ownership gate: ensure this purchase belongs to the caller ────────────
    const purchase = await this.prisma.coursePurchase.findUnique({
      where: { id: purchaseId },
      select: { user_id: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.user_id !== userId) {
      throw new ForbiddenException('This purchase does not belong to you');
    }

    const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Text/reading lessons — complete immediately on first call
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

    // Rate limit: skip if last heartbeat was < 9 seconds ago
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
    });
    if (existing?.last_heartbeat_at) {
      const elapsed = Date.now() - new Date(existing.last_heartbeat_at).getTime();
      if (elapsed < 9000) return existing;
    }

    const storedDuration: number | null = lesson.duration_s ?? null;
    let pct = 0;
    if (storedDuration && storedDuration > 0) {
      const clamped = Math.min(watchedSeconds, storedDuration);
      pct = Math.floor((clamped / storedDuration) * 100);
    } else if (totalSeconds && totalSeconds > 0) {
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

  async toggleLessonComplete(userId: string, lessonId: string, purchaseId?: string) {
    const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    let pid = purchaseId;
    if (!pid) {
      const p = await this.prisma.coursePurchase.findUnique({
        where: { user_id_course_id: { user_id: userId, course_id: lesson.course_id } },
      });
      pid = p?.id;
    }
    if (!pid) throw new ForbiddenException('Not enrolled in course');

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

  async getCourseProgress(userId: string, courseId: string) {
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
    if (!purchase) return null;

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

    const progressMap = Object.fromEntries(
      lessonProgressRows.map((lp) => [
        lp.lesson_id,
        { completed: lp.completed, pct: lp.min_watch_pct ?? 0, watchedS: lp.watched_s },
      ]),
    );

    const publishedLessons = course?.lessons ?? [];
    const completedCount = publishedLessons.filter((l) => progressMap[l.id]?.completed).length;
    const completionPct =
      publishedLessons.length === 0
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

  // ── Wishlist ─────────────────────────────────────────────────────────────────

  async toggleWishlist(userId: string, courseId: string) {
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

  async getUserWishlist(userId: string) {
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

  // ── Coupons ──────────────────────────────────────────────────────────────────

  async validateCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon || !coupon.is_active) throw new NotFoundException('Invalid or expired coupon code');
    if (coupon.expires_at && new Date() > coupon.expires_at) {
      throw new ForbiddenException('Coupon code has expired');
    }
    if (coupon.used_count >= coupon.max_uses) {
      throw new ForbiddenException('Coupon usage limit reached');
    }
    return {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      valid: true,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async recalculateCourseCompletion(purchaseId: string) {
    const purchase = await this.prisma.coursePurchase.findUnique({
      where: { id: purchaseId },
      include: { course: { include: { lessons: { select: { id: true, is_published: true } } } } },
    });
    if (!purchase) return;

    const publishedLessons = purchase.course.lessons.filter((l) => l.is_published !== false);
    const completedCount = await this.prisma.lessonProgress.count({
      where: { purchase_id: purchaseId, completed: true },
    });
    const pct =
      publishedLessons.length === 0
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
}
