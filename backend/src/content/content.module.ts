import { Module } from '@nestjs/common';
import { YouTubeService } from './youtube.service';
import { ContentService } from './content.service';
import { ContentSecurityService } from './content-security.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [StorageModule, PrismaModule],
  providers: [YouTubeService, ContentService, ContentSecurityService],
  exports: [YouTubeService, ContentService, ContentSecurityService],
})
export class ContentModule {}