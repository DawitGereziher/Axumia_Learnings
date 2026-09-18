import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { StorageService } from '../storage/storage.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import {
  CourseStatus,
  KycStatus,
  UserRole,
  SortOrder,
  PriceRange,
} from '../common/enums';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private storage: StorageService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(instructorUserId: string, dto: CreateCourseDto) {
    let profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { role: true },
    });

    if (!profile) {
      if (user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR) {
        profile = await this.prisma.instructorProfile.create({
          data: {
            user_id: instructorUserId,
            kyc_status: KycStatus.APPROVED,
            is_active: true,
          },
        });
      } else {
        throw new ForbiddenException('You must have an approved instructor profile to create courses');
      }
    } else if (!profile.is_active) {
      if (user?.role === UserRole.ADMIN) {
        profile = await this.prisma.instructorProfile.update({
          where: { id: profile.id },
          data: { is_active: true, kyc_status: KycStatus.APPROVED },
        });
      } else {
        throw new ForbiddenException('Your instructor profile must be approved before creating courses');
      }
    }

    const slug =
      dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8); // nanoid-style 6-char suffix

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
        // ← defaults to 'draft' from schema — do NOT hardcode PUBLISHED
        // Instructors must explicitly publish via POST /:id/publish
      },
    });

    // No cache bust needed — new drafts don't appear in public browse
    return course;
  }

  // ── List (browse) ─────────────────────────────────────────────────────────────

  async findAll(query: QueryCoursesDto) {
    // Normalize key so ?page=1&limit=20 and ?limit=20&page=1 hit the same slot
    const sortedQuery = Object.fromEntries(
      Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
    );
    const cacheKey = `courses:list:${JSON.stringify(sortedQuery)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const {
      search,
      category,
      level,
      language,
      priceRange,
      minPrice,
      maxPrice,
      minRating,
      sort = SortOrder.NEWEST,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = { status: CourseStatus.PUBLISHED };

    if (category) {
      where.OR = [{ category: { slug: category } }, { category_id: category }];
    }
    if (level && level !== 'all') where.level = level;
    if (language && language !== 'all') where.language = language;

    // Price range filters
    if (priceRange === PriceRange.FREE) {
      where.price = { equals: 0 } as any;
    } else if (priceRange === PriceRange.UNDER_500) {
      where.price = { lte: 500 } as any;
    } else if (priceRange === PriceRange.BETWEEN_500_2000) {
      where.price = { gte: 500, lte: 2000 } as any;
    } else if (priceRange === PriceRange.OVER_2000) {
      where.price = { gte: 2000 } as any;
    } else if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      } as any;
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

    let orderBy: Prisma.CourseOrderByWithRelationInput = { created_at: 'desc' };
    if (sort === SortOrder.PRICE_ASC) orderBy = { price: 'asc' };
    else if (sort === SortOrder.PRICE_DESC) orderBy = { price: 'desc' };
    else if (sort === SortOrder.POPULAR) orderBy = { purchases: { _count: 'desc' } };

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
      const avgRating =
        ratings.length > 0 ? ratings.reduce((a, r) => a + r, 0) / ratings.length : 0;
      const { courseReviews, ...rest } = c;
      return {
        ...rest,
        avgRating: Math.round(avgRating * 10) / 10,
        _count: { ...c._count, reviews: ratings.length },
      };
    });

    // minRating filter — applied in JS after computing ratings (no stored avg_rating on Course yet)
    const finalData = minRating
      ? formattedData.filter((c) => c.avgRating >= minRating)
      : formattedData;

    const result = {
      data: finalData,
      total: minRating ? finalData.length : total, // total is approximate when minRating used
      page,
      limit,
    };
    await this.cache.set(cacheKey, result, 300); // 5-minute TTL
    return result;
  }

  // ── Detail ────────────────────────────────────────────────────────────────────

  async findOne(slug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const where: Prisma.CourseWhereInput = isUuid ? { OR: [{ slug }, { id: slug }] } : { slug };

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
    if (!course) throw new NotFoundException('Course not found');

    const ratings = course.courseReviews?.map((cr) => cr.overall_rating) ?? [];
    const avgRating = ratings.length > 0 ? ratings.reduce((a, r) => a + r, 0) / ratings.length : 0;

    return {
      ...course,
      avgRating: Math.round(avgRating * 10) / 10,
      _count: { ...course._count, reviews: ratings.length },
    };
  }

  // ── Update (explicit allowlist — no mass assignment) ──────────────────────────

  async update(courseId: string, instructorUserId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { role: true },
    });
    const isOwner = course.instructor.user_id === instructorUserId;
    const isAdmin = user?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this course');

    // Explicit field pick — instructor_id, slug, status cannot be changed here
    // Status changes must go through publish() or archive()
    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.title !== undefined      ? { title: dto.title }                   : {}),
        ...(dto.description !== undefined ? { description: dto.description }       : {}),
        ...(dto.price !== undefined       ? { price: dto.price }                   : {}),
        ...(dto.level !== undefined       ? { level: dto.level }                   : {}),
        ...(dto.language !== undefined    ? { language: dto.language }             : {}),
        ...(dto.tags !== undefined        ? { tags: dto.tags }                     : {}),
        ...(dto.thumbnail !== undefined   ? { thumbnail: dto.thumbnail,
                                              thumbnail_url: dto.thumbnail_url ?? dto.thumbnail } : {}),
        ...(dto.estimated_hours !== undefined   ? { estimated_hours: dto.estimated_hours }   : {}),
        ...(dto.prerequisites !== undefined     ? { prerequisites: dto.prerequisites }       : {}),
        ...(dto.learning_objectives !== undefined ? { learning_objectives: dto.learning_objectives } : {}),
      },
    });

    await this.cache.delPattern('courses:list:*');
    return updated;
  }

  // ── Publish / Archive (explicit status transitions) ───────────────────────────

  async publishCourse(courseId: string, instructorUserId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true, lessons: { where: { is_published: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { role: true },
    });
    const isOwner = course.instructor.user_id === instructorUserId;
    const isAdmin = user?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this course');

    if (course.status === CourseStatus.PUBLISHED) {
      return { message: 'Course is already published', course };
    }

    // Minimum publishability requirements
    if (!course.title || !course.description) {
      throw new BadRequestException('Course must have a title and description before publishing');
    }
    if (course.lessons.length === 0) {
      throw new BadRequestException('Course must have at least one published lesson before publishing');
    }

    const published = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED, last_published_at: new Date() },
    });

    await this.cache.delPattern('courses:list:*');
    return published;
  }

  async archiveCourse(courseId: string, instructorUserId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { role: true },
    });
    const isOwner = course.instructor.user_id === instructorUserId;
    const isAdmin = user?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this course');

    const archived = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'archived' },
    });

    await this.cache.delPattern('courses:list:*');
    return archived;
  }

  // ── Thumbnail upload URL ──────────────────────────────────────────────────────

  async getThumbnailUploadUrl(courseId: string, instructorUserId: string, contentType: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { role: true },
    });
    const isOwner = course.instructor.user_id === instructorUserId;
    const isAdmin = user?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this course');

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException('Only JPEG, PNG, WebP thumbnails are allowed');
    }

    const ext = contentType.split('/')[1];
    const key = this.storage.buildKey('thumbnail', courseId, `thumb.${ext}`);
    const uploadUrl = await this.storage.getUploadUrl('public', key, contentType);

    // Optimistically save the key so it's available immediately after upload
    const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
    const imageUrl = publicDomain ? `${publicDomain}/${key}` : uploadUrl.split('?')[0];
    await this.prisma.course.update({
      where: { id: courseId },
      data: { thumbnail: key, thumbnail_url: imageUrl },
    });

    await this.cache.delPattern('courses:list:*');
    return { uploadUrl, imageUrl, key };
  }

  // ── Instructor courses ────────────────────────────────────────────────────────

  async findInstructorCourses(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return [];
    return this.prisma.course.findMany({
      where: { instructor_id: profile.id },
      include: {
        lessons: true,
        _count: { select: { purchases: true, courseReviews: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── Instructor analytics ──────────────────────────────────────────────────────

  async getInstructorAnalytics(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');

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

      const enrolledThisMonth = c.purchases.filter(
        (p) => new Date(p.created_at) >= thirtyDaysAgo,
      ).length;

      const completed = c.purchases.filter((p) => !!p.completed_at).length;
      const completionRate =
        c.purchases.length > 0 ? Math.round((completed / c.purchases.length) * 100) : 0;

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
        avgRating:
          analyticsPerCourse.length > 0
            ? Math.round(
                (analyticsPerCourse.reduce((sum, c) => sum + c.avgRating, 0) /
                  analyticsPerCourse.length) *
                  10,
              ) / 10
            : 0,
      },
      courses: analyticsPerCourse,
    };
  }

  // ── Categories ────────────────────────────────────────────────────────────────

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
}
