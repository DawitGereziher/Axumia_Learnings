import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  // ─── Ownership helper ────────────────────────────────────────────────────────
  // Confirms the quiz belongs to a lesson in a course owned by the given user.
  // Throws ForbiddenException if the user doesn't own the course.
  private async assertOwnsQuiz(quizId: string, userId: string): Promise<void> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            course: {
              include: { instructor: true },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    const instructorUserId = quiz.lesson.course.instructor.user_id;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Admins can manage any quiz
    if (user?.role === 'admin') return;

    if (instructorUserId !== userId) {
      throw new ForbiddenException('You do not own this quiz');
    }
  }

  // ─── Grading helper ──────────────────────────────────────────────────────────
  // Returns true if the student's answer is correct for the given question.
  private isCorrect(question: { type: string; correct: string }, studentAnswer: string): boolean {
    if (question.type === 'text') {
      // Case-insensitive substring match
      return studentAnswer.trim().toLowerCase().includes(question.correct.trim().toLowerCase());
    }
    // multiple_choice and true_false: compare index strings exactly
    return question.correct === studentAnswer;
  }

  // ─── Instructor: Quiz CRUD ────────────────────────────────────────────────────

  async createQuiz(userId: string, dto: CreateQuizDto) {
    // Verify the lesson exists and the user owns its course
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: dto.lesson_id },
      include: { course: { include: { instructor: true } } },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin' && lesson.course.instructor.user_id !== userId) {
      throw new ForbiddenException('You do not own this lesson');
    }

    // A lesson can only have one quiz
    const existing = await this.prisma.quiz.findUnique({ where: { lesson_id: dto.lesson_id } });
    if (existing) throw new ConflictException('This lesson already has a quiz');

    return this.prisma.quiz.create({
      data: {
        lesson_id:    dto.lesson_id,
        title:        dto.title,
        description:  dto.description,
        pass_score:   dto.pass_score   ?? 70,
        time_limit:   dto.time_limit   ?? null,
        max_attempts: dto.max_attempts ?? 3,
        is_gating:    dto.is_gating    ?? true,
      },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async updateQuiz(userId: string, quizId: string, dto: UpdateQuizDto) {
    await this.assertOwnsQuiz(quizId, userId);

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(dto.title        !== undefined && { title: dto.title }),
        ...(dto.description  !== undefined && { description: dto.description }),
        ...(dto.pass_score   !== undefined && { pass_score: dto.pass_score }),
        ...(dto.time_limit   !== undefined && { time_limit: dto.time_limit }),
        ...(dto.max_attempts !== undefined && { max_attempts: dto.max_attempts }),
        ...(dto.is_gating    !== undefined && { is_gating: dto.is_gating }),
      },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async deleteQuiz(userId: string, quizId: string) {
    await this.assertOwnsQuiz(quizId, userId);
    // Cascade in schema deletes questions, attempts, and answers automatically
    await this.prisma.quiz.delete({ where: { id: quizId } });
    return { message: 'Quiz deleted' };
  }

  // ─── Instructor: Question CRUD ────────────────────────────────────────────────

  async addQuestion(userId: string, quizId: string, dto: CreateQuestionDto) {
    await this.assertOwnsQuiz(quizId, userId);

    // Set position = last question + 1
    const lastQuestion = await this.prisma.quizQuestion.findFirst({
      where: { quiz_id: quizId },
      orderBy: { position: 'desc' },
    });
    const nextPosition = (lastQuestion?.position ?? -1) + 1;

    return this.prisma.quizQuestion.create({
      data: {
        quiz_id:     quizId,
        question:    dto.question,
        type:        dto.type,
        options:     dto.options ?? [],
        correct:     dto.correct,
        explanation: dto.explanation,
        points:      dto.points ?? 1,
        position:    nextPosition,
      },
    });
  }

  async updateQuestion(userId: string, quizId: string, questionId: string, dto: UpdateQuestionDto) {
    await this.assertOwnsQuiz(quizId, userId);

    // Ensure the question belongs to this quiz
    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: questionId, quiz_id: quizId },
    });
    if (!question) throw new NotFoundException('Question not found in this quiz');

    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.question    !== undefined && { question: dto.question }),
        ...(dto.type        !== undefined && { type: dto.type }),
        ...(dto.options     !== undefined && { options: dto.options }),
        ...(dto.correct     !== undefined && { correct: dto.correct }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        ...(dto.points      !== undefined && { points: dto.points }),
      },
    });
  }

  async deleteQuestion(userId: string, quizId: string, questionId: string) {
    await this.assertOwnsQuiz(quizId, userId);

    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: questionId, quiz_id: quizId },
    });
    if (!question) throw new NotFoundException('Question not found in this quiz');

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted' };
  }

  // Move a question up or down by swapping positions with its neighbour
  async reorderQuestion(userId: string, quizId: string, questionId: string, direction: 'up' | 'down') {
    await this.assertOwnsQuiz(quizId, userId);

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      orderBy: { position: 'asc' },
    });

    const index = questions.findIndex((q) => q.id === questionId);
    if (index === -1) throw new NotFoundException('Question not found');

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= questions.length) {
      throw new BadRequestException('Cannot move question in that direction');
    }

    const [current, swap] = [questions[index], questions[swapIndex]];

    // Swap the position values
    await this.prisma.$transaction([
      this.prisma.quizQuestion.update({ where: { id: current.id }, data: { position: swap.position } }),
      this.prisma.quizQuestion.update({ where: { id: swap.id },    data: { position: current.position } }),
    ]);

    return { message: 'Order updated' };
  }

  // ─── Instructor: View all attempts ───────────────────────────────────────────

  async getAllAttempts(userId: string, quizId: string) {
    await this.assertOwnsQuiz(quizId, userId);

    return this.prisma.quizAttempt.findMany({
      where: { quiz_id: quizId },
      orderBy: { completed_at: 'desc' },
      include: { answers: true },
    });
  }

  // ─── Student: Get quiz for a lesson ──────────────────────────────────────────
  // Returns the quiz and questions but NOT the correct answers (so students can't cheat).

  async getQuizForLesson(lessonId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { lesson_id: lessonId },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id:          true,
            question:    true,
            type:        true,
            options:     true,
            points:      true,
            position:    true,
            // explanation is NOT included here — shown only after submitting
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('No quiz for this lesson');
    return quiz;
  }

  // ─── Student: Submit attempt ──────────────────────────────────────────────────

  async submitAttempt(userId: string, quizId: string, dto: SubmitAttemptDto) {
    // Load quiz with full questions (including correct answers for grading)
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Check attempt limit
    if (quiz.max_attempts > 0) {
      const attemptCount = await this.prisma.quizAttempt.count({
        where: { quiz_id: quizId, user_id: userId },
      });
      if (attemptCount >= quiz.max_attempts) {
        throw new BadRequestException(
          `You have reached the maximum of ${quiz.max_attempts} attempt(s) for this quiz`,
        );
      }
    }

    // Grade each answer
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers: { question_id: string; answer: string; is_correct: boolean; explanation?: string | null }[] = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;
      const submitted = dto.answers.find((a) => a.question_id === question.id);
      const studentAnswer = submitted?.answer ?? '';
      const correct = this.isCorrect(question, studentAnswer);

      if (correct) earnedPoints += question.points;

      gradedAnswers.push({
        question_id: question.id,
        answer:      studentAnswer,
        is_correct:  correct,
        explanation: question.explanation, // include now that quiz is submitted
      });
    }

    // Calculate score (0–100 percentage)
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.pass_score;

    // Persist the attempt and all answers in one transaction
    const attempt = await this.prisma.$transaction(async (tx) => {
      const newAttempt = await tx.quizAttempt.create({
        data: {
          quiz_id:    quizId,
          user_id:    userId,
          score,
          passed,
          time_taken: dto.time_taken,
        },
      });

      await tx.quizAnswer.createMany({
        data: gradedAnswers.map((a) => ({
          attempt_id:  newAttempt.id,
          question_id: a.question_id,
          answer:      a.answer,
          is_correct:  a.is_correct,
        })),
      });

      return newAttempt;
    });

    // Return results with per-question feedback so the UI can show it immediately
    return {
      attempt_id:  attempt.id,
      score,
      passed,
      pass_score:  quiz.pass_score,
      earned:      earnedPoints,
      total:       totalPoints,
      time_taken:  dto.time_taken,
      answers:     gradedAnswers,
    };
  }

  // ─── Student: View my past attempts ──────────────────────────────────────────

  async getMyAttempts(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    return this.prisma.quizAttempt.findMany({
      where: { quiz_id: quizId, user_id: userId },
      orderBy: { completed_at: 'desc' },
      include: { answers: true },
    });
  }
}
