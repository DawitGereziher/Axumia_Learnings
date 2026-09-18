import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QaService {
  constructor(private prisma: PrismaService) {}

  async getLessonQuestions(lessonId: string) {
    return this.prisma.lessonQuestion.findMany({
      where: { lesson_id: lessonId },
      include: {
        user: { select: { first_name: true, last_name: true, role: true } },
        answers: {
          include: {
            user: { select: { first_name: true, last_name: true, role: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { upvotes: 'desc' },
    });
  }

  async addLessonQuestion(userId: string, lessonId: string, title: string, details: string) {
    return this.prisma.lessonQuestion.create({
      data: { user_id: userId, lesson_id: lessonId, title, details },
      include: {
        user: { select: { first_name: true, last_name: true, role: true } },
        answers: true,
      },
    });
  }

  async addLessonAnswer(userId: string, questionId: string, answer: string) {
    return this.prisma.lessonAnswer.create({
      data: { user_id: userId, question_id: questionId, answer },
      include: { user: { select: { first_name: true, last_name: true, role: true } } },
    });
  }

  async acceptLessonAnswer(userId: string, answerId: string) {
    const ans = await this.prisma.lessonAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: { include: { lesson: { include: { course: { include: { instructor: true } } } } } },
      },
    });
    if (!ans) throw new NotFoundException('Answer not found');

    const isQuestionAuthor = ans.question.user_id === userId;
    const isInstructor = ans.question.lesson.course.instructor.user_id === userId;
    if (!isQuestionAuthor && !isInstructor) {
      throw new ForbiddenException('Only question author or instructor can mark best answer');
    }

    return this.prisma.lessonAnswer.update({
      where: { id: answerId },
      data: { is_accepted: true },
    });
  }

  async upvoteLessonQuestion(questionId: string) {
    return this.prisma.lessonQuestion.update({
      where: { id: questionId },
      data: { upvotes: { increment: 1 } },
    });
  }
}
