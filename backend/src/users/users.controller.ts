import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/purchases')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get current user course purchases' })
  async getMyPurchases(@CurrentUser() user: AuthUser) {
    return this.usersService.getPurchases(user.id);
  }

  @Patch('me')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: { first_name?: string; last_name?: string; image?: string },
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Post('me/instructor-profile')
  @UseGuards(DAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Submit / update instructor profile for KYC' })
  async submitInstructorProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: { bio?: string; headline?: string; hourly_rate?: number },
  ) {
    return this.usersService.submitInstructorProfile(user.id, body);
  }

  @Patch('me/instructor-profile/rich')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({
    summary:
      '[Instructor] Update full rich profile (bio, skills, social links, etc.)',
  })
  async updateRichProfile(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      bio?: string;
      headline?: string;
      hourly_rate?: number;
      cover_image?: string;
      profile_image?: string;
      skills?: string[];
      languages?: string[];
      experience_years?: number;
      location?: string;
      website_url?: string;
      linkedin_url?: string;
      twitter_url?: string;
      youtube_url?: string;
      kyc_docs?: string[];
      kyc_status?: string;
    },
  ) {
    return this.usersService.updateRichInstructorProfile(user.id, body);
  }

  @Get('instructors/:profileId/public')
  @ApiOperation({
    summary: 'Get full public instructor profile (courses, reviews, stats)',
  })
  async getPublicProfile(@Param('profileId') profileId: string) {
    return this.usersService.getPublicInstructorProfile(profileId);
  }

  @Post('instructors/:profileId/reviews')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Submit a review for an instructor' })
  async createInstructorReview(
    @Param('profileId') profileId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.usersService.createInstructorReview(user.id, profileId, body);
  }

  @Get('instructors')
  @ApiOperation({ summary: 'Browse active instructors' })
  async listInstructors() {
    return this.usersService.listInstructors();
  }

  @Get('instructors/:id')
  @ApiOperation({ summary: 'Get instructor public profile' })
  async getInstructor(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────
  @Patch('admin/:userId/kyc')
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Approve or reject instructor KYC' })
  async updateKyc(
    @Param('userId') userId: string,
    @Body() body: { status: 'approved' | 'rejected' },
  ) {
    return this.usersService.updateKycStatus(userId, body.status);
  }

  // ── Instructor Follow Endpoints ─────────────────────────────────────────────
  @Post('instructors/:profileId/follow')
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Toggle follow status for an instructor' })
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
    const userId = req.user?.id || null;
    return this.usersService.getFollowStatus(userId, profileId);
  }
}

