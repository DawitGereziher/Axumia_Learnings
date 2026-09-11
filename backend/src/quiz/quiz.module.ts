import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

// Self-contained module — imports only PrismaModule.
// To remove the quiz feature, delete this folder and
// remove the two UI touchpoints in the frontend.
@Module({
  imports: [PrismaModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
