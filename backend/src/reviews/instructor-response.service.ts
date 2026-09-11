import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstructorResponseService {
  private readonly logger = new Logger(InstructorResponseService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create instructor response to a review
   */
  async createInstructorResponse(instructorId: string, courseId: string, reviewId: string, response: string) {
    try {
      // Verify instructor owns this course
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.instructor_id !== instructorId) {
        throw new ForbiddenException('You can only respond to reviews of your own courses');
      }

      // Verify review belongs to this course
      const review = await this.prisma.courseReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.course_id !== courseId) {
        throw new ForbiddenException('Review does not belong to this course');
      }

      // Check if response already exists
      const existingResponse = await this.prisma.instructorResponse.findUnique({
        where: { courseReviewId: reviewId },
      });

      if (existingResponse) {
        // Update existing response
        const updatedResponse = await this.prisma.instructorResponse.update({
          where: { id: existingResponse.id },
          data: { response },
        });

        this.logger.log(`Updated instructor response for review ${reviewId}`);
        return updatedResponse;
      }

      // Create new response
      const newResponse = await this.prisma.instructorResponse.create({
        data: {
          courseReviewId: reviewId,
          instructor_id: instructorId,
          response,
        },
      });

      this.logger.log(`Created instructor response for review ${reviewId}`);
      return newResponse;
    } catch (error) {
      this.logger.error('Error creating instructor response:', error);
      throw new Error('Failed to create instructor response');
    }
  }

  /**
   * Update instructor response
   */
  async updateInstructorResponse(responseId: string, instructorId: string, response: string) {
    try {
      const existingResponse = await this.prisma.instructorResponse.findUnique({
        where: { id: responseId },
      });

      if (!existingResponse) {
        throw new NotFoundException('Response not found');
      }

      if (existingResponse.instructor_id !== instructorId) {
        throw new ForbiddenException('You can only update your own responses');
      }

      const updatedResponse = await this.prisma.instructorResponse.update({
        where: { id: responseId },
        data: { response },
      });

      this.logger.log(`Updated instructor response ${responseId}`);
      return updatedResponse;
    } catch (error) {
      this.logger.error('Error updating instructor response:', error);
      throw new Error('Failed to update instructor response');
    }
  }

  /**
   * Delete instructor response
   */
  async deleteInstructorResponse(responseId: string, instructorId: string) {
    try {
      const existingResponse = await this.prisma.instructorResponse.findUnique({
        where: { id: responseId },
      });

      if (!existingResponse) {
        throw new NotFoundException('Response not found');
      }

      if (existingResponse.instructor_id !== instructorId) {
        throw new ForbiddenException('You can only delete your own responses');
      }

      await this.prisma.instructorResponse.delete({
        where: { id: responseId },
      });

      this.logger.log(`Deleted instructor response ${responseId}`);
    } catch (error) {
      this.logger.error('Error deleting instructor response:', error);
      throw new Error('Failed to delete instructor response');
    }
  }

  /**
   * Toggle response visibility
   */
  async toggleResponseVisibility(responseId: string, instructorId: string) {
    try {
      const existingResponse = await this.prisma.instructorResponse.findUnique({
        where: { id: responseId },
      });

      if (!existingResponse) {
        throw new NotFoundException('Response not found');
      }

      if (existingResponse.instructor_id !== instructorId) {
        throw new ForbiddenException('You can only manage your own responses');
      }

      const updatedResponse = await this.prisma.instructorResponse.update({
        where: { id: responseId },
        data: {
          is_public: !existingResponse.is_public,
        },
      });

      this.logger.log(`Toggled visibility for instructor response ${responseId}`);
      return updatedResponse;
    } catch (error) {
      this.logger.error('Error toggling response visibility:', error);
      throw new Error('Failed to toggle response visibility');
    }
  }

  /**
   * Get instructor's responses for their courses
   */
  async getInstructorResponses(instructorId: string, courseId?: string) {
    try {
      const where: any = {
        instructor_id: instructorId,
      };

      if (courseId) {
        where.courseReview = {
          course_id: courseId,
        };
      }

      const responses = await this.prisma.instructorResponse.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      return responses;
    } catch (error) {
      this.logger.error('Error getting instructor responses:', error);
      throw new Error('Failed to get instructor responses');
    }
  }
}