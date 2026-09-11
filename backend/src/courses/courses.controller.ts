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
} from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Browse published courses' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'priceRange', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query()
    query: {
      search?: string;
      category?: string;
      level?: string;
      language?: string;
      priceRange?: string;
      minPrice?: string;
      maxPrice?: string;
      sort?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.courses.findAll({
      ...query,
      minPrice: query.minPrice ? +query.minPrice : undefined,
      maxPrice: query.maxPrice ? +query.maxPrice : undefined,
      minRating: (query as any).rating ? +(query as any).rating : (query as any).minRating ? +(query as any).minRating : undefined,
      page: query.page ? +query.page : 1,
      limit: query.limit ? +query.limit : 20,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'List course categories' })
  listCategories() {
    return this.courses.listCategories();
  }

  @Get('instructor/mine')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] List my created courses' })
  findMyCourses(@CurrentUser() user: AuthUser) {
    return this.courses.findInstructorCourses(user.id);
  }

  @Get(':id/check-purchase')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Check if user has purchased this course' })
  async checkPurchase(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const p = await this.courses.checkOwnership(user.id, courseId);
    return { purchased: !!p, purchaseId: p?.id ?? null };
  }

  @Post(':id/enroll-free')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Enroll in a free (price=0) course without payment' })
  async enrollFree(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.enrollFree(user.id, courseId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get course details by slug' })
  findOne(@Param('slug') slug: string) {
    return this.courses.findOne(slug);
  }

  // ── Authenticated routes ────────────────────────────────────────────────────
  @Post()
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Create a new course' })
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      title: string;
      description?: string;
      price: number;
      category_id?: string;
      level?: string;
      language?: string;
      tags?: string[];
      thumbnail?: string;
      thumbnail_url?: string;
      estimated_hours?: number;
      prerequisites?: string[];
      learning_objectives?: string[];
    },
  ) {
    return this.courses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Update course' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: any,
  ) {
    return this.courses.update(id, user.id, dto);
  }

  @Post(':id/lessons')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add lesson to course' })
  addLesson(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      title: string;
      description?: string;
      position?: number;
      is_free_preview?: boolean;
      content_type?: any;
      storage_type?: string;
      youtube_url?: string;
      video_key?: string;
      external_url?: string;
      embed_code?: string;
      section_id?: string;
      duration_s?: number;
      requires_progress?: boolean;
    },
  ) {
    return this.courses.addLesson(courseId, user.id, dto);
  }

  @Patch('lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Update lesson' })
  updateLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: any,
  ) {
    return this.courses.updateLesson(lessonId, user.id, dto);
  }

  @Delete('lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Delete lesson' })
  deleteLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.deleteLesson(lessonId, user.id);
  }

  // ── Section Management ────────────────────────────────────────────────────
  @Post(':id/sections')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add section to course' })
  addSection(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      title: string;
      description?: string;
      position?: number;
    },
  ) {
    return this.courses.addSection(courseId, user.id, dto);
  }

  @Delete('sections/:sectionId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Delete section' })
  deleteSection(
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.deleteSection(sectionId, user.id);
  }

  // ── Material Management ────────────────────────────────────────────────────
  @Post('lessons/:lessonId/materials')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Add material to lesson' })
  addMaterial(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      title: string;
      description?: string;
      material_type: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      is_downloadable?: boolean;
      is_free_preview?: boolean;
    },
  ) {
    return this.courses.addMaterial(lessonId, user.id, dto);
  }

  @Delete('materials/:materialId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Delete material' })
  deleteMaterial(
    @Param('materialId') materialId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.deleteMaterial(materialId, user.id);
  }

  @Get('materials/:id/download-url')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get signed download URL for lesson material' })
  async getMaterialDownloadUrl(
    @Param('id') materialId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.courses.getMaterialDownloadUrl(materialId, user.id);
  }

  @Get('lessons/:lessonId/video-url')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get signed video URL for a lesson' })
  async getLessonVideoUrl(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: any,
  ) {
    const requestIp = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const referrer = request.headers.referer || request.headers.referrer;
    return await this.courses.getLessonVideoUrl(lessonId, user.id, requestIp, userAgent, referrer);
  }

  // ── Progress Tracking ─────────────────────────────────────────────────────
  @Post('lessons/:lessonId/progress')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Record lesson watch progress (anti-cheat, 80% threshold)' })
  async recordProgress(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { watchedSeconds: number; totalSeconds?: number; purchaseId: string },
  ) {
    return this.courses.updateProgress(body.purchaseId, lessonId, body.watchedSeconds, body.totalSeconds);
  }

  @Post('lessons/:lessonId/toggle-complete')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Toggle completion status for any lesson (video, pdf, reading)' })
  async toggleLessonComplete(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { purchaseId?: string },
  ) {
    return this.courses.toggleLessonComplete(user.id, lessonId, body?.purchaseId);
  }

  @Get(':id/progress')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get full course progress for the authenticated student' })
  async getCourseProgress(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.getCourseProgress(user.id, courseId);
  }

  @Get(':id/sections')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get sections for a course' })
  async getSections(@Param('id') courseId: string) {
    return this.courses.getCourseSections(courseId);
  }

  // ── Wishlist ───────────────────────────────────────────────────────────────
  @Post(':id/wishlist')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Toggle wishlist status for a course' })
  async toggleWishlist(@Param('id') courseId: string, @CurrentUser() user: AuthUser) {
    return this.courses.toggleWishlist(user.id, courseId);
  }

  @Get('wishlist/mine')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get current user wishlist' })
  async getMyWishlist(@CurrentUser() user: AuthUser) {
    return this.courses.getUserWishlist(user.id);
  }

  // ── Coupon Validation ──────────────────────────────────────────────────────
  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate promotional coupon code' })
  async validateCoupon(@Body() body: { code: string }) {
    return this.courses.validateCoupon(body.code);
  }

  // ── Q&A System ─────────────────────────────────────────────────────────────
  @Get('lessons/:lessonId/questions')
  @ApiOperation({ summary: 'List Q&A questions for a lesson' })
  async getLessonQuestions(@Param('lessonId') lessonId: string) {
    return this.courses.getLessonQuestions(lessonId);
  }

  @Post('lessons/:lessonId/questions')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Post a question for a lesson' })
  async postLessonQuestion(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { title: string; details: string },
  ) {
    return this.courses.addLessonQuestion(user.id, lessonId, body.title, body.details);
  }

  @Post('questions/:questionId/answers')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Answer a lesson question' })
  async postLessonAnswer(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { answer: string },
  ) {
    return this.courses.addLessonAnswer(user.id, questionId, body.answer);
  }

  @Patch('answers/:answerId/accept')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Accept best answer for a question' })
  async acceptAnswer(@Param('answerId') answerId: string, @CurrentUser() user: AuthUser) {
    return this.courses.acceptLessonAnswer(user.id, answerId);
  }

  @Post('questions/:questionId/upvote')
  @ApiOperation({ summary: 'Upvote a question' })
  async upvoteQuestion(@Param('questionId') questionId: string) {
    return this.courses.upvoteLessonQuestion(questionId);
  }
}

