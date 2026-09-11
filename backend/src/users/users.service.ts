import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async updateProfile(
    id: string,
    dto: {
      first_name?: string;
      last_name?: string;
      image?: string;
      phone?: string;
    },
  ) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  /** Create or update instructor profile (KYC submission) */
  async submitInstructorProfile(
    userId: string,
    dto: {
      bio?: string;
      headline?: string;
      hourly_rate?: number;
      kyc_docs?: string[];
    },
  ) {
    return this.prisma.instructorProfile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...dto, kyc_status: 'submitted' },
      update: { ...dto, kyc_status: 'submitted' },
    });
  }

  /** Update full rich instructor profile (bio, skills, social links, etc.) */
  async updateRichInstructorProfile(
    userId: string,
    dto: {
      bio?: string;
      headline?: string;
      hourly_rate?: number;
      cover_image?: string;
      profile_image?: string;
      skills?: string[];
      languages?: string[];
      experience_years?: number;
      location?: string;
      website_url?: string;
      linkedin_url?: string;
      twitter_url?: string;
      youtube_url?: string;
      kyc_docs?: string[];
      kyc_status?: string;
    },
  ) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    return this.prisma.instructorProfile.update({
      where: { user_id: userId },
      data: dto,
    });
  }

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
            email: false,
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
    if (!profile) throw new NotFoundException('Instructor not found');

    // Fetch student reviews from both courses and 1-on-1 / help sessions
    const [courseReviews, sessionReviews] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: {
          course: { instructor_id: profile.id },
          is_hidden: false,
        },
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
      session_title: sr.booking_id ? '1-on-1 Mentorship Session' : (sr.helpSession?.request?.title || 'Help Request Session'),
    }));

    const allReviews = [...formattedCourseReviews, ...formattedSessionReviews].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate instructor average rating from real reviews
    const totalRatingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = allReviews.length > 0
      ? (totalRatingSum / allReviews.length).toFixed(1)
      : profile.avg_rating && Number(profile.avg_rating) > 0
      ? Number(profile.avg_rating).toFixed(1)
      : '5.0';

    // Format courses with real average ratings from courseReviews
    const formattedCourses = profile.courses.map((c: any) => {
      const ratings = c.courseReviews?.map((cr: any) => cr.overall_rating) || [];
      const totalScore = ratings.reduce((acc: number, r: number) => acc + r, 0);
      const cAvg = ratings.length > 0 ? totalScore / ratings.length : 0;
      const { courseReviews: _, ...rest } = c;
      return {
        ...rest,
        avgRating: Math.round(cAvg * 10) / 10,
        _count: {
          ...c._count,
          reviews: ratings.length,
        },
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

  /** Create a review for an instructor */
  async createInstructorReview(
    userId: string,
    instructorId: string,
    dto: { rating: number; comment?: string; course_id?: string },
  ) {
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }

    const profile = await this.prisma.instructorProfile.findFirst({
      where: {
        OR: [{ id: instructorId }, { user_id: instructorId }],
      },
    });
    if (!profile) throw new NotFoundException('Instructor profile not found');
    if (profile.user_id === userId) {
      throw new BadRequestException('You cannot review your own instructor profile');
    }

    // Determine which course by this instructor to review
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
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId,
        },
      },
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

    // Update instructor's denormalized avg_rating
    const allCourseReviews = await this.prisma.courseReview.findMany({
      where: {
        course: { instructor_id: profile.id },
        is_hidden: false,
      },
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

  /** Admin: approve / reject instructor KYC */
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

  async getPurchases(userId: string) {
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

  // ── Instructor Follow ───────────────────────────────────────────────────────
  async toggleFollowInstructor(userId: string, profileId: string) {
    const prisma = this.prisma as any;
    const existing = await prisma.instructorFollow.findUnique({
      where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
    });

    if (existing) {
      await prisma.instructorFollow.delete({ where: { id: existing.id } });
      const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
      return { following: false, followerCount: count };
    } else {
      await prisma.instructorFollow.create({
        data: { user_id: userId, instructor_id: profileId },
      });
      const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
      return { following: true, followerCount: count };
    }
  }

  async getFollowStatus(userId: string | null, profileId: string) {
    const prisma = this.prisma as any;
    const count = await prisma.instructorFollow.count({ where: { instructor_id: profileId } });
    if (!userId) return { following: false, followerCount: count };

    const existing = await prisma.instructorFollow.findUnique({
      where: { user_id_instructor_id: { user_id: userId, instructor_id: profileId } },
    });

    return { following: !!existing, followerCount: count };
  }
}

