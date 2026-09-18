import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { LessonsService } from './lessons.service';
import { EnrollmentService } from './enrollment.service';
import { QaService } from './qa.service';
import { StorageModule } from '../storage/storage.module';
import { ContentModule } from '../content/content.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [StorageModule, ContentModule, CommonModule],
  controllers: [CoursesController],
  providers: [CoursesService, LessonsService, EnrollmentService, QaService],
  exports: [CoursesService, EnrollmentService],
})
export class CoursesModule {}
