import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContentService, ContentType } from '../content/content.service';
import { ContentSecurityService } from '../content/content-security.service';
import { RateLimitService } from '../common/services/rate-limit.service';
import { AccessLogService } from '../common/services/access-log.service';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private contentService: ContentService,
    private contentSecurity: ContentSecurityService,
    private rateLimit: RateLimitService,
    private accessLog: AccessLogService,
  ) {}

  async create(
    instructorUserId: string,
    dto: {
      title: string;
      description?: string;
      price: number;
      category_id?: string;
      level?: string;
      language?: string;
      tags?: string[];
      thumbnail?: string;
      thumbnail_url?: string;
      estimated_hours?: number;
      prerequisites?: string[];
      learning_objectives?: string[];
    },
  ) {
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
      } else {
        throw new ForbiddenException(
          'You must have an approved instructor profile to create courses',
        );
      }
    } else if (!profile.is_active) {
      if (user?.role === 'admin') {
        profile = await this.prisma.instructorProfile.update({
          where: { id: profile.id },
          data: { is_active: true, kyc_status: 'approved' },
        });
      } else {
        throw new ForbiddenException(
          'You must have an approved instructor profile to create courses',
        );
      }
    }

    const thumb = dto.thumbnail || dto.thumbnail_url;
    const thumbUrl = dto.thumbnail_url || dto.thumbnail;

    const slug =
      dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    return this.prisma.course.create({
      data: {
        ...dto,
        thumbnail: thumb,
        thumbnail_url: thumbUrl,
        instructor_id: profile.id,
        slug,
        status: 'published',
      },
    });
  }

  async findAll(query: {
    search?: string;
    category?: string;
    level?: string;
    language?: string;
    priceRange?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      category,
      level,
      language,
      priceRange,
      minPrice,
      maxPrice,
      minRating,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: 'published' };

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

    // Price range filters
    if (priceRange === 'free') {
      where.price = 0;
    } else if (priceRange === 'under500') {
      where.price = { lte: 500 };
    } else if (priceRange === '500to2000') {
      where.price = { gte: 500, lte: 2000 };
    } else if (priceRange === 'over2000') {
      where.price = { gte: 2000 };
    } else if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
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

    // Sorting
    let orderBy: any = { created_at: 'desc' };
    if (sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (sort === 'popular') {
      orderBy = { purchases: { _count: 'desc' } };
    }

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

    // Calculate average rating and total reviews directly from courseReviews
    const formattedData = data.map((c: any) => {
      const ratings = c.courseReviews?.map((cr: any) => cr.overall_rating) || [];
      const totalRatings = ratings.reduce((acc: number, r: number) => acc + r, 0);
      const avgRating = ratings.length > 0 ? totalRatings / ratings.length : 0;
      const { courseReviews, ...rest } = c;
      return {
        ...rest,
        avgRating: Math.round(avgRating * 10) / 10,
        _count: {
          ...c._count,
          reviews: ratings.length,
        },
      };
    });

    const finalData = minRating
      ? formattedData.filter((c: any) => c.avgRating >= minRating)
      : formattedData;

    return { data: finalData, total: minRating ? finalData.length : total, page, limit };
  }

  async findOne(slug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );
    const where: any = isUuid ? { OR: [{ slug }, { id: slug }] } : { slug };

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
        courseReviews: {
          where: { is_hidden: false },
          include: { user: { select: { id: true, first_name: true, last_name: true, image: true } } },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        _count: { select: { purchases: true, courseReviews: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const ratings = course.courseReviews?.map((cr: any) => cr.overall_rating) || [];
    const totalRatings = ratings.reduce((acc: number, r: number) => acc + r, 0);
    const avgRating = ratings.length > 0 ? totalRatings / ratings.length : 0;

    return {
      ...course,
      avgRating: Math.round(avgRating * 10) / 10,
      _count: {
        ...course._count,
        reviews: ratings.length,
      },
    };
  }

  async update(
    courseId: string,
    instructorUserId: string,
    dto: Partial<{
      title: string;
      description: string;
      price: number;
      status: string;
      level: string;
      tags: string[];
      thumbnail: string;
      thumbnail_url: string;
      estimated_hours: number;
      prerequisites: string[];
      learning_objectives: string[];
    }>,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructor.user_id !== instructorUserId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (dto.thumbnail || dto.thumbnail_url) {
      const thumb = dto.thumbnail || dto.thumbnail_url;
      const thumbUrl = dto.thumbnail_url || dto.thumbnail;
      dto.thumbnail = thumb;
      dto.thumbnail_url = thumbUrl;
    }

    return this.prisma.course.update({ where: { id: courseId }, data: dto });
  }

  async addLesson(
    courseId: string,
    instructorUserId: string,
    dto: {
      title: string;
      description?: string;
      position?: number;
      is_free_preview?: boolean;
      content_type?: ContentType;
      storage_type?: string;
      youtube_url?: string;
      video_key?: string;
      external_url?: string;
      embed_code?: string;
      sectionId?: string;
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    const user = await this.prisma.user.findUnique({ where: { id: instructorUserId }, select: { role: true } });
    if (!course || (course.instructor.user_id !== instructorUserId && user?.role !== 'admin')) {
      throw new ForbiddenException('Not authorised');
    }

    const sectionId = (dto as any).section_id || dto.sectionId || undefined;

    // Process content based on type
    let lessonData: any = {
      course_id: courseId,
      title: dto.title,
      description: dto.description,
      position: dto.position || 1,
      is_free_preview: dto.is_free_preview || false,
      content_type: dto.content_type || ContentType.YOUTUBE,
      storage_type: dto.storage_type || 'youtube',
      section_id: sectionId,
      duration_s: (dto as any).duration_s ?? null,
      is_published: true,
    };

    // Handle YouTube content
    if (dto.youtube_url) {
      lessonData.content_type = ContentType.YOUTUBE;
      lessonData.storage_type = 'youtube';
      lessonData.external_url = dto.youtube_url;
      if (this.contentService['youtubeService'].isValidYouTubeUrl(dto.youtube_url)) {
        const processed = this.contentService['youtubeService'].processYouTubeUrl(dto.youtube_url);
        if (processed) {
          lessonData.youtube_video_id = processed.encryptedId;
        }
      }
    }

    // Handle other content types
    if (dto.video_key) {
      lessonData.video_key = dto.video_key;
      lessonData.content_type = ContentType.VIDEO;
      lessonData.storage_type = 's3';
    }

    if (dto.external_url) {
      lessonData.external_url = dto.external_url;
      if (dto.content_type === 'pdf') {
        lessonData.content_type = ContentType.PDF;
        lessonData.storage_type = 's3';
      } else if ((dto.content_type as any) === 'reading' || dto.content_type === ContentType.TEXT) {
        lessonData.content_type = ContentType.TEXT;
        lessonData.storage_type = 'external';
      } else if (!lessonData.storage_type) {
        lessonData.storage_type = 'external';
      }
    }

    if (dto.embed_code) {
      lessonData.embed_code = dto.embed_code;
      lessonData.content_type = ContentType.EMBEDDED;
      lessonData.storage_type = 'embedded';
    }

    const lesson = await this.prisma.courseLesson.create({
      data: lessonData,
    });

    // Update course lesson count
    await this.prisma.course.update({
      where: { id: courseId },
      data: { total_lessons: { increment: 1 } },
    });

    return lesson;
  }

  /** Generate a short-lived signed URL for a lesson content (authenticated + purchased users only) */
  async getLessonVideoUrl(lessonId: string, userId: string, requestIp?: string, userAgent?: string, referrer?: string): Promise<{ url: string; content_type: string }> {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Check rate limiting
    await this.rateLimit.checkRateLimit({
      userId,
      ip: requestIp,
      resourceType: 'video',
    });

    let accessSuccess = true;
    try {
      if (!lesson.is_free_preview) {
        const isInstructor = lesson.course?.instructor_id && (await this.prisma.instructorProfile.findUnique({
          where: { id: lesson.course.instructor_id },
          select: { user_id: true },
        }))?.user_id === userId;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        const isAdmin = user?.role === 'admin';

        if (!isInstructor && !isAdmin) {
          const purchase = await this.prisma.coursePurchase.findUnique({
            where: {
              user_id_course_id: { user_id: userId, course_id: lesson.course_id },
            },
          });
          if (!purchase) {
            accessSuccess = false;
            throw new ForbiddenException('Purchase this course to watch');
          }
        }
      }

      // Use content service to generate appropriate URL based on content type
      const contentUrl = await this.contentService.generateContentUrl(lesson, userId);

      // If contentUrl is empty or already an S3/R2 signed URL (contains X-Amz-Signature),
      // do not append extra HMAC query param as it invalidates Cloudflare R2 SigV4 signature!
      let signedUrl = contentUrl;
      if (contentUrl && !contentUrl.includes('X-Amz-Signature')) {
        signedUrl = this.contentSecurity.generateSignedUrl(contentUrl, {
          userId,
          lessonId,
          courseId: lesson.course_id,
          ip: requestIp,
        });
      }

      // Log successful access
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

      return { url: signedUrl, content_type: (lesson as any).content_type || 'youtube' };
    } catch (error) {
      // Log failed access
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

  async checkOwnership(userId: string, courseId: string) {
    // ── Fast path: direct CoursePurchase lookup (indexed, O(1)) ──────────────
    const directPurchase = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (directPurchase) return directPurchase;

    // ── Instructor / Admin auto-ownership for previewing & testing ────────────
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (course?.instructor?.user_id === userId || user?.role === 'admin') {
      return await this.prisma.coursePurchase.upsert({
        where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        create: { user_id: userId, course_id: courseId, amount_paid: 0 },
        update: {},
      });
    }

    // ── Slow path: scan paid transactions by metadata ─────────────────────────
    // Handles the case where a purchase record wasn't created yet but payment went through
    const paidTransactions = await this.prisma.transaction.findMany({
      where: { user_id: userId, status: 'paid' },
    });

    const relevantTransaction = paidTransactions.find((tx) => {
      const metadata = tx.metadata as any;
      return (
        metadata?.entity_type === 'course' && metadata?.entity_id === courseId
      );
    });

    if (!relevantTransaction) return null;

    // Create the missing purchase record and link it
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

  /** Enroll in a free course (price = 0) without going through payment */
  async enrollFree(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (Number(course.price) !== 0) {
      throw new ForbiddenException('This course requires payment. Use the checkout flow.');
    }

    // Idempotent — return existing purchase if already enrolled
    const existing = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (existing) return { purchase: existing, alreadyEnrolled: true };

    const purchase = await this.prisma.coursePurchase.create({
      data: { user_id: userId, course_id: courseId, amount_paid: 0 },
    });
    return { purchase, alreadyEnrolled: false };
  }

  /**
   * Record lesson watch progress — tamper-proof
   * - Server validates watchedSeconds against stored duration_s
   * - 80% threshold required to mark lesson complete
   * - Rate-limited via last_heartbeat_at (1 write per 9s)
   * - text/reading lessons (requires_progress=false) complete on first call
   */
  async updateProgress(purchaseId: string, lessonId: string, watchedSeconds: number, totalSeconds?: number) {
    const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Text/reading lessons — complete immediately on first call
    if (!(lesson as any).requires_progress) {
      return this.prisma.lessonProgress.upsert({
        where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
        create: { purchase_id: purchaseId, lesson_id: lessonId, watched_s: 0, completed: true, min_watch_pct: 100, completed_at: new Date() } as any,
        update: {},
      });
    }

    // Rate limit: skip if last heartbeat was < 9 seconds ago
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { purchase_id_lesson_id: { purchase_id: purchaseId, lesson_id: lessonId } },
    });
    if (existing) {
      const lastBeat = (existing as any).last_heartbeat_at;
      if (lastBeat && Date.now() - new Date(lastBeat).getTime() < 9000) {
        return existing; // silently skip — too soon
      }
    }

    // Determine authoritative duration
    const storedDuration: number | null = (lesson as any).duration_s ?? null;
    let pct = 0;

    if (storedDuration && storedDuration > 0) {
      // Anti-cheat: clamp watchedSeconds to storedDuration (can't claim more than full length)
      const clamped = Math.min(watchedSeconds, storedDuration);
      pct = Math.floor((clamped / storedDuration) * 100);
    } else if (totalSeconds && totalSeconds > 0) {
      // No stored duration — use client-reported but cap at 100
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
      } as any,
      update: {
        watched_s: watchedSeconds,
        min_watch_pct: pct,
        last_heartbeat_at: now,
        // Only update completed/completed_at once — never un-complete
        ...(!existing?.completed && isCompleted ? { completed: true, completed_at: now } : {}),
      } as any,
    });

    // Recalculate course completion_pct and update CoursePurchase
    if (isCompleted && !existing?.completed) {
      await this.recalculateCourseCompletion(purchaseId);
    }

    return progress;
  }

  async toggleLessonComplete(userId: string, lessonId: string, purchaseId?: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });
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
        watched_s: lesson.duration_s || 300,
      },
      update: {
        completed: newCompleted,
      },
    });

    await this.recalculateCourseCompletion(pid);

    return { completed: newCompleted, lessonId };
  }

  private async recalculateCourseCompletion(purchaseId: string) {
    const purchase = await this.prisma.coursePurchase.findUnique({
      where: { id: purchaseId },
      include: { course: { include: { lessons: { select: { id: true, is_published: true } } } } },
    });
    if (!purchase) return;

    const publishedLessons = purchase.course.lessons.filter((l: any) => l.is_published !== false);
    const completedCount = await this.prisma.lessonProgress.count({
      where: { purchase_id: purchaseId, completed: true },
    });
    const pct = publishedLessons.length === 0 ? 0 : Math.floor((completedCount / publishedLessons.length) * 100);
    const isFullyComplete = pct >= 100;

    await this.prisma.coursePurchase.update({
      where: { id: purchaseId },
      data: {
        completion_pct: pct,
        ...(isFullyComplete && !(purchase as any).completed_at ? { completed_at: new Date() } : {}),
      } as any,
    });
  }

  /** Get full course progress for the player sidebar */
  async getCourseProgress(userId: string, courseId: string) {
    let purchase = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (!purchase) {
      const courseRecord = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: { instructor: true },
      });
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
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
      (this.prisma.course as any).findUnique({
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
      lessonProgressRows.map((lp) => [lp.lesson_id, { completed: lp.completed, pct: (lp as any).min_watch_pct ?? 0, watchedS: lp.watched_s }])
    );

    const publishedLessons = (course?.lessons ?? []) as any[];
    const completedCount = publishedLessons.filter((l: any) => progressMap[l.id]?.completed).length;
    const completionPct = publishedLessons.length === 0 ? 0 : Math.floor((completedCount / publishedLessons.length) * 100);

    return {
      purchaseId: purchase.id,
      completionPct,
      completedLessons: completedCount,
      totalLessons: publishedLessons.length,
      courseCompleted: !!(purchase as any).completed_at,
      sections: (course?.sections ?? []) as any[],
      lessons: publishedLessons,
      progressMap,
    };
  }

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async getCourseSections(courseId: string) {
    return this.prisma.courseSection.findMany({
      where: { course_id: courseId },
      orderBy: { position: 'asc' },
      include: { lessons: { orderBy: { position: 'asc' } } },
    });
  }

  async addSection(
    courseId: string,
    instructorUserId: string,
    dto: {
      title: string;
      description?: string;
      position?: number;
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course || course.instructor.user_id !== instructorUserId) {
      throw new ForbiddenException('Not authorised');
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

  async deleteSection(sectionId: string, instructorUserId: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (section.course.instructor_id !== instructorUserId) {
      throw new ForbiddenException('Not authorised');
    }

    // Move all lessons in this section to course root (remove section_id)
    await this.prisma.courseLesson.updateMany({
      where: { section_id: sectionId },
      data: { section_id: null },
    });

    // Delete the section
    await this.prisma.courseSection.delete({
      where: { id: sectionId },
    });
  }

  async addMaterial(
    lessonId: string,
    instructorUserId: string,
    dto: {
      title: string;
      description?: string;
      material_type: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      is_downloadable?: boolean;
      is_free_preview?: boolean;
    },
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.instructor_id !== instructorUserId) {
      throw new ForbiddenException('Not authorised');
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
        position: 1, // Default position
      },
    });

    // Update course material count
    await this.prisma.course.update({
      where: { id: lesson.course_id },
      data: { total_materials: { increment: 1 } },
    });

    return material;
  }

  async deleteMaterial(materialId: string, instructorUserId: string) {
    const material = await this.prisma.lessonMaterial.findUnique({
      where: { id: materialId },
      include: { lesson: { include: { course: true } } },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.lesson.course.instructor_id !== instructorUserId) {
      throw new ForbiddenException('Not authorised');
    }

    await this.prisma.lessonMaterial.delete({
      where: { id: materialId },
    });

    // Update course material count
    await this.prisma.course.update({
      where: { id: material.lesson.course_id },
      data: { total_materials: { decrement: 1 } },
    });
  }

  async findInstructorCourses(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return [];
    return this.prisma.course.findMany({
      where: { instructor_id: profile.id },
      include: { lessons: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateLesson(lessonId: string, instructorUserId: string, dto: any) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: { include: { instructor: true } } },
    });
    if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
      throw new ForbiddenException('Not authorized to edit this lesson');
    }
    return this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: dto,
    });
  }

  async deleteLesson(lessonId: string, instructorUserId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: { include: { instructor: true } } },
    });
    if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
      throw new ForbiddenException('Not authorized to delete this lesson');
    }
    return this.prisma.courseLesson.delete({ where: { id: lessonId } });
  }

  async getMaterialDownloadUrl(materialId: string, userId: string): Promise<{ url: string; fileName: string }> {
    const material = await this.prisma.lessonMaterial.findUnique({
      where: { id: materialId },
      include: { lesson: { include: { course: { include: { instructor: true } } } } },
    });
    if (!material) throw new NotFoundException('Material not found');

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
          throw new ForbiddenException('Purchase this course to download materials');
        }
      }
    }

    if (!material.file_url) throw new NotFoundException('No file key found for material');

    // If it's an external HTTP URL, return directly
    if (material.file_url.startsWith('http://') || material.file_url.startsWith('https://')) {
      return { url: material.file_url, fileName: material.file_name || material.title };
    }

    // Generate signed GET URL from R2 private bucket
    const signedUrl = await this.storage.getSignedUrl(material.file_url);
    return { url: signedUrl, fileName: material.file_name || material.title };
  }

  // ── Wishlist ───────────────────────────────────────────────────────────────
  async toggleWishlist(userId: string, courseId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    } else {
      await this.prisma.wishlist.create({
        data: { user_id: userId, course_id: courseId },
      });
      return { wishlisted: true };
    }
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

  // ── Coupons ────────────────────────────────────────────────────────────────
  async validateCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.is_active) {
      throw new NotFoundException('Invalid or expired coupon code');
    }

    if (coupon.expires_at && new Date() > coupon.expires_at) {
      throw new BadRequestException('Coupon code has expired');
    }

    if (coupon.used_count >= coupon.max_uses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    return {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      valid: true,
    };
  }

  // ── Q&A System ─────────────────────────────────────────────────────────────
  async getLessonQuestions(lessonId: string) {
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

  async addLessonQuestion(userId: string, lessonId: string, title: string, details: string) {
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

  async addLessonAnswer(userId: string, questionId: string, answer: string) {
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

  async acceptLessonAnswer(userId: string, answerId: string) {
    const ans = await this.prisma.lessonAnswer.findUnique({
      where: { id: answerId },
      include: { question: { include: { lesson: { include: { course: { include: { instructor: true } } } } } } },
    });

    if (!ans) throw new NotFoundException('Answer not found');

    const isQuestionAuthor = ans.question.user_id === userId;
    const isInstructor = ans.question.lesson.course.instructor.user_id === userId;

    if (!isQuestionAuthor && !isInstructor) {
      throw new ForbiddenException('Only question author or instructor can mark best answer');
    }

    return this.prisma.lessonAnswer.update({
      where: { id: answerId },
      data: { is_accepted: true },
    });
  }

  async upvoteLessonQuestion(questionId: string) {
    return this.prisma.lessonQuestion.update({
      where: { id: questionId },
      data: { upvotes: { increment: 1 } },
    });
  }
}

