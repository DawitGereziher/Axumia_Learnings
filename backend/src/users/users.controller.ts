import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  SubmitInstructorProfileDto,
  UpdateRichInstructorProfileDto,
  CreateInstructorReviewDto,
  UpdateKycStatusDto,
} from './dto/instructor-profile.dto';
import { StorageService } from '../storage/storage.service';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private storageService: StorageService,
  ) {}

  // ── Student: My Profile ──────────────────────────────────────────────────

  @Get('me')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get current user profile with instructor profile if applicable' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Update current user profile (name, phone, image URL)' })
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ── Student: Avatar Upload ───────────────────────────────────────────────

  @Post('me/avatar')
  @UseGuards(DAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a new avatar/profile picture directly to R2' })
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be under 5 MB');
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = this.storageService.buildKey('profile', user.id, `avatar.${ext}`);

    // Get a pre-signed PUT URL — return it so the client can upload directly
    const uploadUrl = await this.storageService.getUploadUrl('public', key, file.mimetype);

    // Also persist the public URL to the user record immediately
    const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
    const imageUrl = publicDomain ? `${publicDomain}/${key}` : uploadUrl.split('?')[0];

    await this.usersService.updateProfile(user.id, { image: imageUrl });

    return { uploadUrl, imageUrl, key };
  }

  // ── Student: Dashboard ───────────────────────────────────────────────────

  @Get('me/dashboard')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get student dashboard: enrolled courses with progress, upcoming bookings, certificates, XP' })
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.usersService.getStudentDashboard(user.id);
  }

  // ── Student: Purchases ───────────────────────────────────────────────────

  @Get('me/purchases')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get current user course purchases' })
  async getMyPurchases(@CurrentUser() user: AuthUser) {
    return this.usersService.getPurchases(user.id);
  }

  // ── Instructor: KYC ──────────────────────────────────────────────────────

  @Post('me/instructor-profile')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Submit / update instructor KYC profile (triggers admin review)' })
  async submitInstructorProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitInstructorProfileDto,
  ) {
    return this.usersService.submitInstructorProfile(user.id, dto);
  }

  @Patch('me/instructor-profile/rich')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: '[Instructor] Update rich profile — bio, skills, social links, etc.' })
  async updateRichProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRichInstructorProfileDto,
  ) {
    return this.usersService.updateRichInstructorProfile(user.id, dto);
  }

  // ── Public: Instructor Directory ─────────────────────────────────────────

  @Get('instructors')
  @ApiOperation({ summary: 'Browse approved instructors (paginated, optional search)' })
  async listInstructors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.listInstructors(page, limit, search);
  }

  @Get('instructors/:profileId/public')
  @ApiOperation({ summary: 'Get full public instructor profile — courses, reviews, stats' })
  async getPublicProfile(@Param('profileId') profileId: string) {
    return this.usersService.getPublicInstructorProfile(profileId);
  }

  /**
   * @deprecated Use GET /instructors/:profileId/public for full public data.
   * This kept for backward compatibility.
   */
  @Get('instructors/:id')
  @ApiOperation({ summary: 'Get instructor public profile (alias for /public endpoint)' })
  async getInstructor(@Param('id') id: string) {
    return this.usersService.getPublicInstructorProfile(id);
  }

  // ── Public: Instructor Reviews ────────────────────────────────────────────

  @Post('instructors/:profileId/reviews')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a review for an instructor (must be enrolled in one of their courses)' })
  async createInstructorReview(
    @Param('profileId') profileId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInstructorReviewDto,
  ) {
    return this.usersService.createInstructorReview(user.id, profileId, dto);
  }

  // ── Public: Instructor Follow ─────────────────────────────────────────────

  @Post('instructors/:profileId/follow')
  @UseGuards(DAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle follow/unfollow for an instructor' })
  async toggleFollow(
    @Param('profileId') profileId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.toggleFollowInstructor(user.id, profileId);
  }

  @Get('instructors/:profileId/follow-status')
  @ApiOperation({ summary: 'Get follow status and follower count for an instructor' })
  async getFollowStatus(
    @Param('profileId') profileId: string,
    @Req() req: any,
  ) {
    const userId: string | null = req.user?.id ?? null;
    return this.usersService.getFollowStatus(userId, profileId);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Patch('admin/:userId/kyc')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Approve or reject instructor KYC' })
  async updateKyc(
    @Param('userId') userId: string,
    @Body() dto: UpdateKycStatusDto,
  ) {
    return this.usersService.updateKycStatus(userId, dto.status);
  }
}
