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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const quiz_service_1 = require("./quiz.service");
const create_quiz_dto_1 = require("./dto/create-quiz.dto");
const update_quiz_dto_1 = require("./dto/update-quiz.dto");
const create_question_dto_1 = require("./dto/create-question.dto");
const update_question_dto_1 = require("./dto/update-question.dto");
const submit_attempt_dto_1 = require("./dto/submit-attempt.dto");
let QuizController = class QuizController {
    quiz;
    constructor(quiz) {
        this.quiz = quiz;
    }
    getQuizForLesson(lessonId) {
        return this.quiz.getQuizForLesson(lessonId);
    }
    submitAttempt(quizId, dto, user) {
        return this.quiz.submitAttempt(user.id, quizId, dto);
    }
    getMyAttempts(quizId, user) {
        return this.quiz.getMyAttempts(user.id, quizId);
    }
    createQuiz(dto, user) {
        return this.quiz.createQuiz(user.id, dto);
    }
    updateQuiz(quizId, dto, user) {
        return this.quiz.updateQuiz(user.id, quizId, dto);
    }
    deleteQuiz(quizId, user) {
        return this.quiz.deleteQuiz(user.id, quizId);
    }
    addQuestion(quizId, dto, user) {
        return this.quiz.addQuestion(user.id, quizId, dto);
    }
    updateQuestion(quizId, questionId, dto, user) {
        return this.quiz.updateQuestion(user.id, quizId, questionId, dto);
    }
    deleteQuestion(quizId, questionId, user) {
        return this.quiz.deleteQuestion(user.id, quizId, questionId);
    }
    reorderQuestion(quizId, questionId, direction, user) {
        return this.quiz.reorderQuestion(user.id, quizId, questionId, direction);
    }
    getAllAttempts(quizId, user) {
        return this.quiz.getAllAttempts(user.id, quizId);
    }
};
exports.QuizController = QuizController;
__decorate([
    (0, common_1.Get)('lesson/:lessonId'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the quiz for a specific lesson' }),
    __param(0, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "getQuizForLesson", null);
__decorate([
    (0, common_1.Post)(':id/attempt'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a quiz attempt (auto-graded)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_attempt_dto_1.SubmitAttemptDto, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "submitAttempt", null);
__decorate([
    (0, common_1.Get)(':id/attempts/mine'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get the current student's attempts for a quiz" }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "getMyAttempts", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a quiz for a lesson (instructor)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_quiz_dto_1.CreateQuizDto, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "createQuiz", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update quiz settings (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_quiz_dto_1.UpdateQuizDto, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "updateQuiz", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a quiz and all its questions (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "deleteQuiz", null);
__decorate([
    (0, common_1.Post)(':id/questions'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a question to a quiz (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_question_dto_1.CreateQuestionDto, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "addQuestion", null);
__decorate([
    (0, common_1.Patch)(':id/questions/:questionId'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a question (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('questionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_question_dto_1.UpdateQuestionDto, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "updateQuestion", null);
__decorate([
    (0, common_1.Delete)(':id/questions/:questionId'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a question (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('questionId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "deleteQuestion", null);
__decorate([
    (0, common_1.Patch)(':id/questions/:questionId/reorder'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Move a question up or down (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('questionId')),
    __param(2, (0, common_1.Query)('direction')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "reorderQuestion", null);
__decorate([
    (0, common_1.Get)(':id/attempts'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all student attempts for a quiz (instructor)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuizController.prototype, "getAllAttempts", null);
exports.QuizController = QuizController = __decorate([
    (0, swagger_1.ApiTags)('Quizzes'),
    (0, common_1.Controller)('quizzes'),
    __metadata("design:paramtypes", [quiz_service_1.QuizService])
], QuizController);
//# sourceMappingURL=quiz.controller.js.map