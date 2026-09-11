import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { CourseReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ResourcesModule } from './resources/resources.module';
import { SessionMonitoringModule } from './session-monitoring/session-monitoring.module';
import { HelpRequestsModule } from './help-requests/help-requests.module';
import { ContentModule } from './content/content.module';
import { CommonModule } from './common/common.module';
import { CertificatesModule } from './certificates/certificates.module';
import { QuizModule } from './quiz/quiz.module';
import { GamificationModule } from './gamification/gamification.module';



import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 30,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    // Infrastructure
    QueueModule, // Global BullMQ — must be before modules that use queues
    PrismaModule,
    CommonModule,
    // Feature modules
    UsersModule,
    CoursesModule,
    BookingsModule,
    PaymentsModule,
    CourseReviewsModule,
    NotificationsModule,
    StorageModule,
    ContentModule,
    CertificatesModule,
    // Platform modules
    AdminModule,
    ResourcesModule,
    HelpRequestsModule,
    SessionMonitoringModule,
    HealthModule,
    QuizModule,
    GamificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
