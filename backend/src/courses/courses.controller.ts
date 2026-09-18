import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

import { CoursesService } from './courses.service';
import { LessonsService } from './lessons.service';
import { EnrollmentService } from './enrollment.service';
import { QaService } from './qa.service';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { AddLessonDto } from './dto/add-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AddSectionDto } from './dto/add-section.dto';
import { AddMaterialDto } from './dto/add-material.dto';
import {
  RecordProgressDto,
  AddQuestionDto,
  AddAnswerDto,
  ValidateCouponDto,
  ToggleCompleteDto,
} from './dto/record-progress.dto';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private courses: CoursesService,
    private lessons: LessonsService,
    private enrollment: EnrollmentService,
    private qa: QaService,
  ) {}

  // ── Public browsing ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Browse published courses (paginated, filterable, cached 5min)' })
  findAll(@Query() query: QueryCoursesDto) {
    return this.courses.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List course categories' })
  listCategories() {
    return this.courses.listCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get course details by slug or ID' })
  findOne(@Param('slug') slug: string) {
    return this.courses.findOne(slug);
  }

  // ── Instructor management ─────────────────────────────────────────────────────

  @Get('instructor/mine')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] List my courses (all statuses)' })
  findMyCourses(@CurrentUser() user: AuthUser) {
    return this.courses.findInstructorCourses(user.id);
  }

  @Get('instructor/analytics')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Get revenue, enrollment, and completion analytics' })
  getAnalytics(@CurrentUser() user: AuthUser) {
    return this.courses.getInstructorAnalytics(user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Create a new course (starts as draft)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.courses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Update course content/metadata (cannot change status here)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(id, user.id, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Publish course (must have title, description, and ≥1 lesson)' })
  publishCourse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.courses.publishCourse(id, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Archive (soft-delete) a course — hides from browse, preserves data' })
  archiveCourse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.courses.archiveCourse(id, user.id);
  }

  @Post(':id/thumbnail-upload-url')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Get pre-signed R2 PUT URL for course thumbnail upload' })
  @ApiBody({ schema: { type: 'object', properties: { contentType: { type: 'string', example: 'image/jpeg' } } } })
  getThumbnailUploadUrl(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body('contentType') contentType: string,
  ) {
    return this.courses.getThumbnailUploadUrl(id, user.id, contentType);
  }

  // ── Lessons ──────────────────────────────────────────────────────────────────

  @Post(':id/lessons')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add lesson to course' })
  addLesson(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddLessonDto,
  ) {
    return this.lessons.addLesson(courseId, user.id, dto);
  }

  @Patch('lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Update lesson' })
  updateLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessons.updateLesson(lessonId, user.id, dto);
  }

  @Delete('lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Delete lesson' })
  deleteLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.deleteLesson(lessonId, user.id);
  }

  @Get('lessons/:lessonId/video-url')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get signed video URL for a lesson (rate-limited, logged)' })
  async getLessonVideoUrl(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: any,
  ) {
    const requestIp = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const referrer = request.headers.referer || request.headers.referrer;
    return this.lessons.getLessonVideoUrl(lessonId, user.id, requestIp, userAgent, referrer);
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  @Get(':id/sections')
  @ApiOperation({ summary: 'Get sections for a course (public)' })
  getSections(@Param('id') courseId: string) {
    return this.lessons.getCourseSections(courseId);
  }

  @Post(':id/sections')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add section to course' })
  addSection(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddSectionDto,
  ) {
    return this.lessons.addSection(courseId, user.id, dto);
  }

  @Delete('sections/:sectionId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Delete section (lessons moved to course root)' })
  deleteSection(@Param('sectionId') sectionId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.deleteSection(sectionId, user.id);
  }

  // ── Materials ─────────────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/materials')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add material to lesson' })
  addMaterial(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddMaterialDto,
  ) {
    return this.lessons.addMaterial(lessonId, user.id, dto);
  }

  @Delete('materials/:materialId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Instructor] Delete material' })
  deleteMaterial(@Param('materialId') materialId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.deleteMaterial(materialId, user.id);
  }

  @Get('materials/:id/download-url')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get signed download URL for lesson material (purchase required for paid)' })
  getMaterialDownloadUrl(@Param('id') materialId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.getMaterialDownloadUrl(materialId, user.id);
  }

  // ── Enrollment & Ownership ────────────────────────────────────────────────────

  @Get(':id/check-purchase')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Check if current user has purchased this course' })
  async checkPurchase(@Param('id') courseId: string, @CurrentUser() user: AuthUser) {
    const p = await this.enrollment.checkOwnership(user.id, courseId);
    return { purchased: !!p, purchaseId: p?.id ?? null };
  }

  @Post(':id/enroll-free')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Enroll in a free (price=0) course without payment' })
  enrollFree(@Param('id') courseId: string, @CurrentUser() user: AuthUser) {
    return this.enrollment.enrollFree(user.id, courseId);
  }

  // ── Progress Tracking ─────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/progress')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Record lesson watch progress (anti-cheat, 80% threshold, user-ownership verified)' })
  recordProgress(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: RecordProgressDto,
  ) {
    // Pass user.id so EnrollmentService can verify the purchaseId belongs to this user
    return this.enrollment.updateProgress(
      user.id,
      body.purchaseId,
      lessonId,
      body.watchedSeconds,
      body.totalSeconds,
    );
  }

  @Post('lessons/:lessonId/toggle-complete')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Toggle completion status for any lesson (video, pdf, reading)' })
  toggleLessonComplete(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ToggleCompleteDto,
  ) {
    return this.enrollment.toggleLessonComplete(user.id, lessonId, body?.purchaseId);
  }

  @Get(':id/progress')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get full course progress for authenticated student' })
  getCourseProgress(@Param('id') courseId: string, @CurrentUser() user: AuthUser) {
    return this.enrollment.getCourseProgress(user.id, courseId);
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────────

  @Post(':id/wishlist')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle wishlist status for a course' })
  toggleWishlist(@Param('id') courseId: string, @CurrentUser() user: AuthUser) {
    return this.enrollment.toggleWishlist(user.id, courseId);
  }

  @Get('wishlist/mine')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get current user wishlist' })
  getMyWishlist(@CurrentUser() user: AuthUser) {
    return this.enrollment.getUserWishlist(user.id);
  }

  // ── Coupons ───────────────────────────────────────────────────────────────────

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate a promotional coupon code' })
  validateCoupon(@Body() body: ValidateCouponDto) {
    return this.enrollment.validateCoupon(body.code);
  }

  // ── Q&A ───────────────────────────────────────────────────────────────────────

  @Get('lessons/:lessonId/questions')
  @ApiOperation({ summary: 'List Q&A questions for a lesson' })
  getLessonQuestions(@Param('lessonId') lessonId: string) {
    return this.qa.getLessonQuestions(lessonId);
  }

  @Post('lessons/:lessonId/questions')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Post a question for a lesson' })
  postLessonQuestion(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: AddQuestionDto,
  ) {
    return this.qa.addLessonQuestion(user.id, lessonId, body.title, body.details);
  }

  @Post('questions/:questionId/answers')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Answer a lesson question' })
  postLessonAnswer(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: AddAnswerDto,
  ) {
    return this.qa.addLessonAnswer(user.id, questionId, body.answer);
  }

  @Patch('answers/:answerId/accept')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Accept best answer for a question (question owner only)' })
  acceptAnswer(@Param('answerId') answerId: string, @CurrentUser() user: AuthUser) {
    return this.qa.acceptLessonAnswer(user.id, answerId);
  }

  @Post('questions/:questionId/upvote')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upvote a question (auth required to prevent manipulation)' })
  upvoteQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.qa.upvoteLessonQuestion(questionId);
  }
}
