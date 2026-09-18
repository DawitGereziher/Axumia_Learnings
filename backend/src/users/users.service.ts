import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  SubmitInstructorProfileDto,
  UpdateRichInstructorProfileDto,
  CreateInstructorReviewDto,
} from './dto/instructor-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ── Identity sync ──────────────────────────────────────────────────────────

  /** Sync user from D-auth JWT into our business DB on first API call */
  async syncUser(jwtPayload: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  }) {
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

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { instructorProfile: true },
    });
  }

  /** Safe explicit-field profile update — cannot mass-assign role or email */
  async updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        image: dto.image,
        // phone stored if schema has it
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
    });
  }

  // ── Instructor KYC ────────────────────────────────────────────────────────

  /** Create or update instructor profile (KYC submission) */
  async submitInstructorProfile(userId: string, dto: SubmitInstructorProfileDto) {
    return this.prisma.instructorProfile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...dto, kyc_status: 'submitted' },
      update: { ...dto, kyc_status: 'submitted' },
    });
  }

  /**
   * Update rich instructor profile (bio, skills, social links, etc.).
   * kyc_status and is_active are NOT accepted here — admin-only via updateKycStatus().
   */
  async updateRichInstructorProfile(
    userId: string,
    dto: UpdateRichInstructorProfileDto,
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');

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
        // kyc_status and is_active are intentionally excluded here
      },
    });
  }

  // ── Instructor Public Profile ──────────────────────────────────────────────

  /** Get full public instructor profile (includes courses + reviews + stats) */
  async getPublicInstructorProfile(profileId: string) {
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
            // email intentionally excluded from public profile
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
    if (!profile) throw new NotFoundException('Instructor not found');

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

    const allReviews = [...formattedCourseReviews, ...formattedSessionReviews].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const totalRatingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating =
      allReviews.length > 0
        ? (totalRatingSum / allReviews.length).toFixed(1)
        : profile.avg_rating && Number(profile.avg_rating) > 0
          ? Number(profile.avg_rating).toFixed(1)
          : '5.0';

    const formattedCourses = profile.courses.map((c: any) => {
      const ratings = c.courseReviews?.map((cr: any) => cr.overall_rating) || [];
      const totalScore = ratings.reduce((acc: number, r: number) => acc + r, 0);
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

  // ── Instructor Review ─────────────────────────────────────────────────────

  async createInstructorReview(
    userId: string,
    instructorId: string,
    dto: CreateInstructorReviewDto,
  ) {
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }

    const profile = await this.prisma.instructorProfile.findFirst({
      where: { OR: [{ id: instructorId }, { user_id: instructorId }] },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    if (profile.user_id === userId) {
      throw new BadRequestException('You cannot review your own instructor profile');
    }

    let courseId = dto.course_id;
    if (!courseId) {
      const course = await this.prisma.course.findFirst({
        where: { instructor_id: profile.id, status: 'published' },
        select: { id: true },
        orderBy: { created_at: 'desc' },
      });
      if (!course) {
        throw new BadRequestException('Instructor has no published courses to review');
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

    // Update denormalized avg_rating
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

  // ── Admin ────────────────────────────────────────────────────────────────

  /** Admin: approve / reject instructor KYC — the ONLY place kyc_status is changed */
  async updateKycStatus(userId: string, status: 'approved' | 'rejected') {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    return this.prisma.instructorProfile.update({
      where: { user_id: userId },
      data: { kyc_status: status, is_active: status === 'approved' },
    });
  }

  // ── Directory ────────────────────────────────────────────────────────────

  /** Browse public instructor directory — only approved, active instructors */
  async listInstructors(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      kyc_status: 'approved',
      is_active: true,
      ...(search
        ? {
            OR: [
              { user: { first_name: { contains: search, mode: 'insensitive' as const } } },
              { user: { last_name:  { contains: search, mode: 'insensitive' as const } } },
              { headline: { contains: search, mode: 'insensitive' as const } },
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

  // ── Student Purchases ────────────────────────────────────────────────────

  async getPurchases(userId: string) {
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

  // ── Student Dashboard ────────────────────────────────────────────────────

  /** Aggregate dashboard data for the student home screen */
  async getStudentDashboard(userId: string) {
    const [user, enrolledCourses, upcomingBookings, certificates] =
      await Promise.all([
        // Basic profile
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

        // Enrolled courses with inline completion percentage
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

        // Upcoming bookings (via slot.starts_at)
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

        // Earned certificates (no course relation — use course_id directly)
        this.prisma.certificate.findMany({
          where: { user_id: userId },
          orderBy: { issued_at: 'desc' },
          take: 5,
        }),
      ]);

    // XP total via raw query (xp_logs may not always be present)
    let totalXp = 0;
    try {
      const xpResult = await this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM xp_logs WHERE user_id = ${userId}::uuid`;
      totalXp = Number(xpResult[0]?.total ?? 0);
    } catch {
      // table doesn't exist yet in this environment — skip gracefully
    }

    // Badges via raw query (user_badges table)
    let badges: { badge_id: string; earned_at: Date }[] = [];
    try {
      badges = await this.prisma.$queryRaw`
        SELECT badge_id, earned_at FROM user_badges
        WHERE user_id = ${userId}::uuid
        ORDER BY earned_at DESC`;
    } catch {
      // skip gracefully
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

  // ── Instructor Follow ────────────────────────────────────────────────────

  async toggleFollowInstructor(userId: string, profileId: string) {
    const existing = await this.prisma.instructorFollow.findUnique({
      where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
    });

    if (existing) {
      await this.prisma.instructorFollow.delete({ where: { id: existing.id } });
      const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
      return { following: false, followerCount: count };
    } else {
      await this.prisma.instructorFollow.create({
        data: { user_id: userId, instructor_id: profileId },
      });
      const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
      return { following: true, followerCount: count };
    }
  }

  async getFollowStatus(userId: string | null, profileId: string) {
    const count = await this.prisma.instructorFollow.count({ where: { instructor_id: profileId } });
    if (!userId) return { following: false, followerCount: count };

    const existing = await this.prisma.instructorFollow.findUnique({
      where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
    });
    return { following: !!existing, followerCount: count };
  }
}
