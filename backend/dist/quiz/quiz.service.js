"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QuizService = class QuizService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertOwnsQuiz(quizId, userId) {
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
        if (!quiz)
            throw new common_1.NotFoundException('Quiz not found');
        const instructorUserId = quiz.lesson.course.instructor.user_id;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.role === 'admin')
            return;
        if (instructorUserId !== userId) {
            throw new common_1.ForbiddenException('You do not own this quiz');
        }
    }
    isCorrect(question, studentAnswer) {
        if (question.type === 'text') {
            return studentAnswer.trim().toLowerCase().includes(question.correct.trim().toLowerCase());
        }
        return question.correct === studentAnswer;
    }
    async createQuiz(userId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: dto.lesson_id },
            include: { course: { include: { instructor: true } } },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'admin' && lesson.course.instructor.user_id !== userId) {
            throw new common_1.ForbiddenException('You do not own this lesson');
        }
        const existing = await this.prisma.quiz.findUnique({ where: { lesson_id: dto.lesson_id } });
        if (existing)
            throw new common_1.ConflictException('This lesson already has a quiz');
        return this.prisma.quiz.create({
            data: {
                lesson_id: dto.lesson_id,
                title: dto.title,
                description: dto.description,
                pass_score: dto.pass_score ?? 70,
                time_limit: dto.time_limit ?? null,
                max_attempts: dto.max_attempts ?? 3,
                is_gating: dto.is_gating ?? true,
            },
            include: { questions: { orderBy: { position: 'asc' } } },
        });
    }
    async updateQuiz(userId, quizId, dto) {
        await this.assertOwnsQuiz(quizId, userId);
        return this.prisma.quiz.update({
            where: { id: quizId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.pass_score !== undefined && { pass_score: dto.pass_score }),
                ...(dto.time_limit !== undefined && { time_limit: dto.time_limit }),
                ...(dto.max_attempts !== undefined && { max_attempts: dto.max_attempts }),
                ...(dto.is_gating !== undefined && { is_gating: dto.is_gating }),
            },
            include: { questions: { orderBy: { position: 'asc' } } },
        });
    }
    async deleteQuiz(userId, quizId) {
        await this.assertOwnsQuiz(quizId, userId);
        await this.prisma.quiz.delete({ where: { id: quizId } });
        return { message: 'Quiz deleted' };
    }
    async addQuestion(userId, quizId, dto) {
        await this.assertOwnsQuiz(quizId, userId);
        const lastQuestion = await this.prisma.quizQuestion.findFirst({
            where: { quiz_id: quizId },
            orderBy: { position: 'desc' },
        });
        const nextPosition = (lastQuestion?.position ?? -1) + 1;
        return this.prisma.quizQuestion.create({
            data: {
                quiz_id: quizId,
                question: dto.question,
                type: dto.type,
                options: dto.options ?? [],
                correct: dto.correct,
                explanation: dto.explanation,
                points: dto.points ?? 1,
                position: nextPosition,
            },
        });
    }
    async updateQuestion(userId, quizId, questionId, dto) {
        await this.assertOwnsQuiz(quizId, userId);
        const question = await this.prisma.quizQuestion.findFirst({
            where: { id: questionId, quiz_id: quizId },
        });
        if (!question)
            throw new common_1.NotFoundException('Question not found in this quiz');
        return this.prisma.quizQuestion.update({
            where: { id: questionId },
            data: {
                ...(dto.question !== undefined && { question: dto.question }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.options !== undefined && { options: dto.options }),
                ...(dto.correct !== undefined && { correct: dto.correct }),
                ...(dto.explanation !== undefined && { explanation: dto.explanation }),
                ...(dto.points !== undefined && { points: dto.points }),
            },
        });
    }
    async deleteQuestion(userId, quizId, questionId) {
        await this.assertOwnsQuiz(quizId, userId);
        const question = await this.prisma.quizQuestion.findFirst({
            where: { id: questionId, quiz_id: quizId },
        });
        if (!question)
            throw new common_1.NotFoundException('Question not found in this quiz');
        await this.prisma.quizQuestion.delete({ where: { id: questionId } });
        return { message: 'Question deleted' };
    }
    async reorderQuestion(userId, quizId, questionId, direction) {
        await this.assertOwnsQuiz(quizId, userId);
        const questions = await this.prisma.quizQuestion.findMany({
            where: { quiz_id: quizId },
            orderBy: { position: 'asc' },
        });
        const index = questions.findIndex((q) => q.id === questionId);
        if (index === -1)
            throw new common_1.NotFoundException('Question not found');
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= questions.length) {
            throw new common_1.BadRequestException('Cannot move question in that direction');
        }
        const [current, swap] = [questions[index], questions[swapIndex]];
        await this.prisma.$transaction([
            this.prisma.quizQuestion.update({ where: { id: current.id }, data: { position: swap.position } }),
            this.prisma.quizQuestion.update({ where: { id: swap.id }, data: { position: current.position } }),
        ]);
        return { message: 'Order updated' };
    }
    async getAllAttempts(userId, quizId) {
        await this.assertOwnsQuiz(quizId, userId);
        return this.prisma.quizAttempt.findMany({
            where: { quiz_id: quizId },
            orderBy: { completed_at: 'desc' },
            include: { answers: true },
        });
    }
    async getQuizForLesson(lessonId) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { lesson_id: lessonId },
            include: {
                questions: {
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        question: true,
                        type: true,
                        options: true,
                        points: true,
                        position: true,
                    },
                },
            },
        });
        if (!quiz)
            throw new common_1.NotFoundException('No quiz for this lesson');
        return quiz;
    }
    async submitAttempt(userId, quizId, dto) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
            include: { questions: true },
        });
        if (!quiz)
            throw new common_1.NotFoundException('Quiz not found');
        if (quiz.max_attempts > 0) {
            const attemptCount = await this.prisma.quizAttempt.count({
                where: { quiz_id: quizId, user_id: userId },
            });
            if (attemptCount >= quiz.max_attempts) {
                throw new common_1.BadRequestException(`You have reached the maximum of ${quiz.max_attempts} attempt(s) for this quiz`);
            }
        }
        let totalPoints = 0;
        let earnedPoints = 0;
        const gradedAnswers = [];
        for (const question of quiz.questions) {
            totalPoints += question.points;
            const submitted = dto.answers.find((a) => a.question_id === question.id);
            const studentAnswer = submitted?.answer ?? '';
            const correct = this.isCorrect(question, studentAnswer);
            if (correct)
                earnedPoints += question.points;
            gradedAnswers.push({
                question_id: question.id,
                answer: studentAnswer,
                is_correct: correct,
                explanation: question.explanation,
            });
        }
        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = score >= quiz.pass_score;
        const attempt = await this.prisma.$transaction(async (tx) => {
            const newAttempt = await tx.quizAttempt.create({
                data: {
                    quiz_id: quizId,
                    user_id: userId,
                    score,
                    passed,
                    time_taken: dto.time_taken,
                },
            });
            await tx.quizAnswer.createMany({
                data: gradedAnswers.map((a) => ({
                    attempt_id: newAttempt.id,
                    question_id: a.question_id,
                    answer: a.answer,
                    is_correct: a.is_correct,
                })),
            });
            return newAttempt;
        });
        return {
            attempt_id: attempt.id,
            score,
            passed,
            pass_score: quiz.pass_score,
            earned: earnedPoints,
            total: totalPoints,
            time_taken: dto.time_taken,
            answers: gradedAnswers,
        };
    }
    async getMyAttempts(userId, quizId) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz)
            throw new common_1.NotFoundException('Quiz not found');
        return this.prisma.quizAttempt.findMany({
            where: { quiz_id: quizId, user_id: userId },
            orderBy: { completed_at: 'desc' },
            include: { answers: true },
        });
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuizService);
//# sourceMappingURL=quiz.service.js.map