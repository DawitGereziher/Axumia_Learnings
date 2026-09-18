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
exports.QaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QaService = class QaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLessonQuestions(lessonId) {
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
    async addLessonQuestion(userId, lessonId, title, details) {
        return this.prisma.lessonQuestion.create({
            data: { user_id: userId, lesson_id: lessonId, title, details },
            include: {
                user: { select: { first_name: true, last_name: true, role: true } },
                answers: true,
            },
        });
    }
    async addLessonAnswer(userId, questionId, answer) {
        return this.prisma.lessonAnswer.create({
            data: { user_id: userId, question_id: questionId, answer },
            include: { user: { select: { first_name: true, last_name: true, role: true } } },
        });
    }
    async acceptLessonAnswer(userId, answerId) {
        const ans = await this.prisma.lessonAnswer.findUnique({
            where: { id: answerId },
            include: {
                question: { include: { lesson: { include: { course: { include: { instructor: true } } } } } },
            },
        });
        if (!ans)
            throw new common_1.NotFoundException('Answer not found');
        const isQuestionAuthor = ans.question.user_id === userId;
        const isInstructor = ans.question.lesson.course.instructor.user_id === userId;
        if (!isQuestionAuthor && !isInstructor) {
            throw new common_1.ForbiddenException('Only question author or instructor can mark best answer');
        }
        return this.prisma.lessonAnswer.update({
            where: { id: answerId },
            data: { is_accepted: true },
        });
    }
    async upvoteLessonQuestion(questionId) {
        return this.prisma.lessonQuestion.update({
            where: { id: questionId },
            data: { upvotes: { increment: 1 } },
        });
    }
};
exports.QaService = QaService;
exports.QaService = QaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QaService);
//# sourceMappingURL=qa.service.js.map