import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizController {
  constructor(private quiz: QuizService) {}

  // ─── Student: Read quiz for a lesson ─────────────────────────────────────────
  // Returns the quiz with questions but WITHOUT correct answers (to prevent cheating)

  @Get('lesson/:lessonId')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the quiz for a specific lesson' })
  getQuizForLesson(@Param('lessonId') lessonId: string) {
    return this.quiz.getQuizForLesson(lessonId);
  }

  // ─── Student: Submit an attempt ───────────────────────────────────────────────

  @Post(':id/attempt')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a quiz attempt (auto-graded)' })
  submitAttempt(
    @Param('id') quizId: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.submitAttempt(user.id, quizId, dto);
  }

  // ─── Student: View my past attempts ──────────────────────────────────────────

  @Get(':id/attempts/mine')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current student's attempts for a quiz" })
  getMyAttempts(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quiz.getMyAttempts(user.id, quizId);
  }

  // ─── Instructor: Create a quiz for a lesson ───────────────────────────────────

  @Post()
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a quiz for a lesson (instructor)' })
  createQuiz(@Body() dto: CreateQuizDto, @CurrentUser() user: AuthUser) {
    return this.quiz.createQuiz(user.id, dto);
  }

  // ─── Instructor: Update quiz settings ────────────────────────────────────────

  @Patch(':id')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update quiz settings (instructor)' })
  updateQuiz(
    @Param('id') quizId: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.updateQuiz(user.id, quizId, dto);
  }

  // ─── Instructor: Delete a quiz ────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a quiz and all its questions (instructor)' })
  deleteQuiz(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quiz.deleteQuiz(user.id, quizId);
  }

  // ─── Instructor: Add a question ───────────────────────────────────────────────

  @Post(':id/questions')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a question to a quiz (instructor)' })
  addQuestion(
    @Param('id') quizId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.addQuestion(user.id, quizId, dto);
  }

  // ─── Instructor: Edit a question ─────────────────────────────────────────────

  @Patch(':id/questions/:questionId')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a question (instructor)' })
  updateQuestion(
    @Param('id') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.updateQuestion(user.id, quizId, questionId, dto);
  }

  // ─── Instructor: Delete a question ───────────────────────────────────────────

  @Delete(':id/questions/:questionId')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a question (instructor)' })
  deleteQuestion(
    @Param('id') quizId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.deleteQuestion(user.id, quizId, questionId);
  }

  // ─── Instructor: Reorder a question ──────────────────────────────────────────

  @Patch(':id/questions/:questionId/reorder')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move a question up or down (instructor)' })
  reorderQuestion(
    @Param('id') quizId: string,
    @Param('questionId') questionId: string,
    @Query('direction') direction: 'up' | 'down',
    @CurrentUser() user: AuthUser,
  ) {
    return this.quiz.reorderQuestion(user.id, quizId, questionId, direction);
  }

  // ─── Instructor: View all student attempts ────────────────────────────────────

  @Get(':id/attempts')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all student attempts for a quiz (instructor)' })
  getAllAttempts(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quiz.getAllAttempts(user.id, quizId);
  }
}
