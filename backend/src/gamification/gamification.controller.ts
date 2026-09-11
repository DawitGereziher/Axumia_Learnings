import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';
import { AwardXPDto } from './dto/award-xp.dto';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private gamification: GamificationService) {}

  // ─── Student: Get my stats ────────────────────────────────────────────────

  @Get('me')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's XP, level, streak, and badges" })
  getMyStats(@CurrentUser() user: AuthUser) {
    return this.gamification.getMyStats(user.id);
  }

  // ─── Public: Leaderboard ─────────────────────────────────────────────────

  @Get('leaderboard')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top 10 learners by XP' })
  getLeaderboard() {
    return this.gamification.getLeaderboard();
  }

  // ─── Student: Award XP for a learning action ─────────────────────────────
  // Called from the frontend after lesson completion, quiz pass, etc.

  @Post('award')
  @UseGuards(DAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Award XP for a learning event (called by frontend)' })
  awardXP(@Body() dto: AwardXPDto, @CurrentUser() user: AuthUser) {
    return this.gamification.awardXP(user.id, dto);
  }
}
