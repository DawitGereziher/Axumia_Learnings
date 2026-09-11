import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSessionReviewDto {
  overall_rating: number; // 1-5
  teaching_style_rating?: number; // 1-5
  communication_rating?: number; // 1-5
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Review teacher learning style for a completed 1-on-1 session */
  async createBookingSessionReview(
    userId: string,
    bookingId: string,
    dto: CreateSessionReviewDto,
  ) {
    if (!dto.overall_rating || dto.overall_rating < 1 || dto.overall_rating > 5) {
      throw new BadRequestException('Overall rating must be between 1 and 5');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { instructor: true },
    });

    if (!booking) throw new NotFoundException('Booking session not found');
    if (booking.student_id !== userId) {
      throw new ForbiddenException('Only the student who attended can review this session');
    }

    const review = await this.prisma.sessionReview.upsert({
      where: { booking_id: bookingId },
      update: {
        overall_rating: Math.round(dto.overall_rating),
        teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
        communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
        comment: dto.comment?.trim() || null,
      },
      create: {
        student_id: userId,
        instructor_id: booking.instructor_id,
        booking_id: bookingId,
        overall_rating: Math.round(dto.overall_rating),
        teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
        communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
        comment: dto.comment?.trim() || null,
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true, image: true } },
        instructor: { include: { user: true } },
      },
    });

    await this.updateInstructorRating(booking.instructor_id);
    return review;
  }

  /** Review teacher help & style for a completed Help Request session */
  async createHelpSessionReview(
    userId: string,
    helpSessionId: string,
    dto: CreateSessionReviewDto,
  ) {
    if (!dto.overall_rating || dto.overall_rating < 1 || dto.overall_rating > 5) {
      throw new BadRequestException('Overall rating must be between 1 and 5');
    }

    const helpSession = await this.prisma.helpSession.findUnique({
      where: { id: helpSessionId },
      include: { helper: true },
    });

    if (!helpSession) throw new NotFoundException('Help session not found');
    if (helpSession.student_id !== userId) {
      throw new ForbiddenException('Only the student who requested help can review this session');
    }

    const review = await this.prisma.sessionReview.upsert({
      where: { help_session_id: helpSessionId },
      update: {
        overall_rating: Math.round(dto.overall_rating),
        teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
        communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
        comment: dto.comment?.trim() || null,
      },
      create: {
        student_id: userId,
        instructor_id: helpSession.helper_id,
        help_session_id: helpSessionId,
        overall_rating: Math.round(dto.overall_rating),
        teaching_style_rating: dto.teaching_style_rating ? Math.round(dto.teaching_style_rating) : undefined,
        communication_rating: dto.communication_rating ? Math.round(dto.communication_rating) : undefined,
        comment: dto.comment?.trim() || null,
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true, image: true } },
        instructor: { include: { user: true } },
      },
    });

    await this.updateInstructorRating(helpSession.helper_id);
    return review;
  }

  /** Recalculate instructor's combined rating from courses and 1-on-1/help sessions */
  private async updateInstructorRating(instructorId: string) {
    const [courseReviews, sessionReviews] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: { course: { instructor_id: instructorId }, is_hidden: false },
        select: { overall_rating: true },
      }),
      this.prisma.sessionReview.findMany({
        where: { instructor_id: instructorId },
        select: { overall_rating: true },
      }),
    ]);

    const allScores = [
      ...courseReviews.map((r) => r.overall_rating),
      ...sessionReviews.map((r) => r.overall_rating),
    ];

    if (allScores.length > 0) {
      const avg = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
      await this.prisma.instructorProfile.update({
        where: { id: instructorId },
        data: { avg_rating: avg },
      });
    }
  }

  /** Get session review by booking ID */
  async getBookingSessionReview(bookingId: string) {
    return this.prisma.sessionReview.findUnique({
      where: { booking_id: bookingId },
      include: {
        student: { select: { id: true, first_name: true, last_name: true, image: true } },
      },
    });
  }

  /** Get session review by help session ID */
  async getHelpSessionReview(helpSessionId: string) {
    return this.prisma.sessionReview.findUnique({
      where: { help_session_id: helpSessionId },
      include: {
        student: { select: { id: true, first_name: true, last_name: true, image: true } },
      },
    });
  }
}
