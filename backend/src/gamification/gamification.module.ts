import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

// Self-contained gamification module.
// Only imports PrismaModule — no coupling to courses, quizzes, or users modules.
@Module({
  imports:     [PrismaModule],
  controllers: [GamificationController],
  providers:   [GamificationService],
})
export class GamificationModule {}
