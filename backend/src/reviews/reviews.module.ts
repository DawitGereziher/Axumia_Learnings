import { Module } from '@nestjs/common';
import { ReviewValidationService } from './review-validation.service';
import { ReviewManagementService } from './review-management.service';
import { ReviewCommentService } from './review-comment.service';
import { InstructorResponseService } from './instructor-response.service';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [
    ReviewValidationService,
    ReviewManagementService,
    ReviewCommentService,
    InstructorResponseService,
    ReviewsService,
  ],
  exports: [
    ReviewValidationService,
    ReviewManagementService,
    ReviewCommentService,
    InstructorResponseService,
    ReviewsService,
  ],
})
export class CourseReviewsModule {}