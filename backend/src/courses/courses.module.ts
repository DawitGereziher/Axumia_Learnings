import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { StorageModule } from '../storage/storage.module';
import { ContentModule } from '../content/content.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [StorageModule, ContentModule, CommonModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
