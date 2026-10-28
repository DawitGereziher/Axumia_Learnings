import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AwardXPDto } from './dto/award-xp.dto';

// ─── XP amounts per reason ────────────────────────────────────────────────────
// Edit these numbers to tune the economy without touching any other file.
const XP_TABLE: Record<string, number> = {
  lesson_complete:  20,
  quiz_passed:      50,
  quiz_perfect:    100,   // 100% quiz score
  course_complete: 200,
  session_booked:   30,
  daily_checkin:     5,
  streak_bonus:    100,   // awarded when streak hits 7 or 30 days
};

// ─── Level thresholds ─────────────────────────────────────────────────────────
// A user's level is determined by their total XP.
// To add more levels, just extend this array.
const LEVEL_THRESHOLDS = [
  0,     // Level 1
  100,   // Level 2
  250,   // Level 3
  500,   // Level 4
  1000,  // Level 5
  2000,  // Level 6
  4000,  // Level 7
  8000,  // Level 8
];

function computeLevel(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

// ─── Badge definitions ────────────────────────────────────────────────────────
// Each badge has an id, label, description, and icon emoji.
export const BADGE_CATALOG = [
  { id: 'first_lesson',  label: 'First Step',       description: 'Completed your first lesson',     icon: '🎯' },
  { id: 'first_quiz',    label: 'Quiz Taker',        description: 'Passed your first quiz',           icon: '📝' },
  { id: 'perfect_score', label: 'Perfect Score',     description: 'Scored 100% on a quiz',            icon: '💯' },
  { id: 'first_course',  label: 'Graduate',          description: 'Completed your first course',      icon: '🎓' },
  { id: 'five_courses',  label: 'Scholar',           description: 'Completed 5 courses',              icon: '📚' },
  { id: 'bookworm',      label: 'Bookworm',          description: 'Completed 10 lessons',             icon: '📖' },
  { id: 'week_streak',   label: '7-Day Streak',      description: 'Studied 7 days in a row',          icon: '🔥' },
  { id: 'month_streak',  label: '30-Day Streak',     description: 'Studied 30 days in a row',         icon: '⚡' },
  { id: 'session_goer',  label: 'Live Learner',      description: 'Booked a live tutoring session',   icon: '🎙️' },
  { id: 'speed_learner', label: 'Speed Learner',     description: 'Completed 3 lessons in one day',   icon: '⚡' },
];

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  // ─── Get current user's full gamification profile ─────────────────────────

  async getMyStats(userId: string) {
    // Upsert ensures a UserStats row always exists
    const stats = await this.prisma.userStats.upsert({
      where:  { user_id: userId },
      create: { user_id: userId },
      update: {},
    });

    const badges = await this.prisma.userBadge.findMany({
      where: { user_id: userId },
      orderBy: { earned_at: 'desc' },
    });

    const recentXP = await this.prisma.xPLog.findMany({
      where:   { user_id: userId },
      orderBy: { created_at: 'desc' },
      take:    10,
    });

    // Attach catalog metadata to earned badges
    const enrichedBadges = BADGE_CATALOG.map((def) => ({
      ...def,
      earned:    badges.some((b) => b.badge_id === def.id),
      earned_at: badges.find((b) => b.badge_id === def.id)?.earned_at ?? null,
    }));

    // XP needed for next level
    const nextLevelXP = LEVEL_THRESHOLDS[stats.level] ?? null; // null = max level

    return {
      total_xp:       stats.total_xp,
      level:          stats.level,
      current_streak: stats.current_streak,
      longest_streak: stats.longest_streak,
      last_active:    stats.last_active,
      next_level_xp:  nextLevelXP,
      badges:         enrichedBadges,
      recent_xp:      recentXP,
    };
  }

  // ─── Leaderboard (top 10 by XP) ──────────────────────────────────────────

  async getLeaderboard() {
    const top = await this.prisma.userStats.findMany({
      orderBy: { total_xp: 'desc' },
      take:    50,
    });

    // Attach display names from users table
    const enriched = await Promise.all(
      top.map(async (s, i) => {
        const user = await this.prisma.user.findUnique({
          where:  { id: s.user_id },
          select: { first_name: true, last_name: true, image: true },
        });
        return {
          rank:           i + 1,
          user_id:        s.user_id,
          name:           `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Anonymous',
          avatar:         user?.image ?? null,
          total_xp:       s.total_xp,
          level:          s.level,
          current_streak: s.current_streak,
        };
      }),
    );

    return enriched;
  }

  // ─── Award XP (main entry point called from frontend) ─────────────────────

  async awardXP(userId: string, dto: AwardXPDto) {
    const baseXP = XP_TABLE[dto.reason] ?? 0;
    if (baseXP === 0) return { awarded: 0, message: 'Unknown reason — no XP awarded' };

    // Security & Anti-Cheat Validation: Verify every action against actual DB records
    if ((dto.reason as string) === 'streak_bonus') {
      return { awarded: 0, message: 'Streak bonuses are calculated and awarded internally' };
    }

    if (dto.reason === 'lesson_complete') {
      const lessonId = dto.metadata?.lesson_id;
      if (!lessonId) return { awarded: 0, message: 'lesson_id is required' };

      // Verify that the lesson is actually completed by the student in LessonProgress
      const progress = await this.prisma.lessonProgress.findFirst({
        where: {
          lesson_id: lessonId,
          completed: true,
          purchase: { user_id: userId },
        },
      });
      if (!progress) {
        return { awarded: 0, message: 'Lesson has not been completed by the student' };
      }

      // Duplicate prevention: only once per lesson
      const already = await this.prisma.xPLog.findFirst({
        where: { user_id: userId, reason: 'lesson_complete', metadata: { path: ['lesson_id'], equals: lessonId } },
      });
      if (already) return { awarded: 0, message: 'XP already awarded for this lesson' };
    }

    if (dto.reason === 'quiz_passed' || dto.reason === 'quiz_perfect') {
      const quizId = dto.metadata?.quiz_id;
      if (!quizId) return { awarded: 0, message: 'quiz_id is required' };

      // Verify authentic passing quiz attempt
      const attempt = await this.prisma.quizAttempt.findFirst({
        where: {
          quiz_id: quizId,
          user_id: userId,
          ...(dto.reason === 'quiz_perfect' ? { score: 100 } : { passed: true }),
        },
      });
      if (!attempt) {
        return { awarded: 0, message: `No verified ${dto.reason === 'quiz_perfect' ? '100% score' : 'passing'} attempt found` };
      }

      // Duplicate prevention: only once per quiz
      const already = await this.prisma.xPLog.findFirst({
        where: { user_id: userId, reason: { in: ['quiz_passed', 'quiz_perfect'] }, metadata: { path: ['quiz_id'], equals: quizId } },
      });
      if (already) return { awarded: 0, message: 'XP already awarded for this quiz' };
    }

    if (dto.reason === 'course_complete') {
      const courseId = dto.metadata?.course_id;
      if (!courseId) return { awarded: 0, message: 'course_id is required' };

      const purchase = await this.prisma.coursePurchase.findFirst({
        where: {
          user_id: userId,
          course_id: courseId,
          OR: [{ completion_pct: { gte: 100 } }, { completed_at: { not: null } }],
        },
      });
      if (!purchase) {
        return { awarded: 0, message: 'Course completion requirements not yet satisfied' };
      }

      const already = await this.prisma.xPLog.findFirst({
        where: { user_id: userId, reason: 'course_complete', metadata: { path: ['course_id'], equals: courseId } },
      });
      if (already) return { awarded: 0, message: 'XP already awarded for this course' };
    }

    if (dto.reason === 'daily_checkin') {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const already = await this.prisma.xPLog.findFirst({
        where: { user_id: userId, reason: 'daily_checkin', created_at: { gte: startOfToday } },
      });
      if (already) return { awarded: 0, message: 'Daily check-in XP already claimed today' };
    }

    if (dto.reason === 'session_booked') {
      const bookingId = dto.metadata?.booking_id;
      if (!bookingId) return { awarded: 0, message: 'booking_id is required' };

      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, student_id: userId, status: { in: ['pending', 'confirmed', 'completed'] } },
      });
      if (!booking) {
        return { awarded: 0, message: 'No valid booking found' };
      }

      const already = await this.prisma.xPLog.findFirst({
        where: { user_id: userId, reason: 'session_booked', metadata: { path: ['booking_id'], equals: bookingId } },
      });
      if (already) return { awarded: 0, message: 'XP already awarded for this booking' };
    }

    // Run everything in a transaction for consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Log the XP event
      await tx.xPLog.create({
        data: { user_id: userId, reason: dto.reason, amount: baseXP, metadata: dto.metadata ?? {} },
      });

      // 2. Get or create stats row
      let stats = await tx.userStats.upsert({
        where:  { user_id: userId },
        create: { user_id: userId },
        update: {},
      });

      // 3. Update streak
      const today  = new Date();
      today.setHours(0, 0, 0, 0);
      const { streakDelta, streakBonusEarned } = this.computeStreakUpdate(stats, today);
      const newStreak = Math.max(0, stats.current_streak + streakDelta);

      // 4. Compute total XP (including streak bonus if applicable)
      let totalAwarded = baseXP;
      if (streakBonusEarned) {
        totalAwarded += XP_TABLE['streak_bonus'];
        await tx.xPLog.create({
          data: { user_id: userId, reason: 'streak_bonus', amount: XP_TABLE['streak_bonus'], metadata: { streak: newStreak } },
        });
      }

      const newTotalXP = stats.total_xp + totalAwarded;
      const newLevel   = computeLevel(newTotalXP);

      // 5. Save updated stats
      stats = await tx.userStats.update({
        where: { user_id: userId },
        data: {
          total_xp:       newTotalXP,
          level:          newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(stats.longest_streak, newStreak),
          last_active:    today,
        },
      });

      return { stats, totalAwarded, streakBonusEarned, newStreak };
    });

    // 6. Check and award badges (outside transaction — non-critical)
    const newBadges = await this.checkAndAwardBadges(userId, dto, result.stats, result.newStreak);

    return {
      awarded:            result.totalAwarded,
      total_xp:           result.stats.total_xp,
      level:              result.stats.level,
      current_streak:     result.newStreak,
      streak_bonus:       result.streakBonusEarned,
      new_badges:         newBadges,
    };
  }

  // ─── Streak logic ─────────────────────────────────────────────────────────
  // Returns whether the streak increments, resets, or stays the same.

  private computeStreakUpdate(stats: any, today: Date): { streakDelta: number; streakBonusEarned: boolean } {
    if (!stats.last_active) return { streakDelta: 1, streakBonusEarned: false };

    const lastActive = new Date(stats.last_active);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / 86_400_000);

    if (diffDays === 0) return { streakDelta: 0, streakBonusEarned: false };  // same day, no change
    if (diffDays === 1) {
      const newStreak = stats.current_streak + 1;
      const streakBonusEarned = newStreak === 7 || newStreak === 30;
      return { streakDelta: 1, streakBonusEarned };
    }
    // Missed a day — streak resets to 1
    return { streakDelta: -(stats.current_streak - 1), streakBonusEarned: false };
  }

  // ─── Badge checker ────────────────────────────────────────────────────────
  // Called after every XP award. Checks all badge conditions and grants new ones.

  private async checkAndAwardBadges(userId: string, dto: AwardXPDto, stats: any, streak: number): Promise<string[]> {
    const alreadyEarned = (await this.prisma.userBadge.findMany({ where: { user_id: userId } })).map((b) => b.badge_id);
    const toAward: string[] = [];

    // Count totals for badge checks
    const lessonCount  = await this.prisma.xPLog.count({ where: { user_id: userId, reason: 'lesson_complete' } });
    const courseCount  = await this.prisma.xPLog.count({ where: { user_id: userId, reason: 'course_complete' } });
    const quizCount    = await this.prisma.xPLog.count({ where: { user_id: userId, reason: { in: ['quiz_passed', 'quiz_perfect'] } } });

    const checks: [string, boolean][] = [
      ['first_lesson',  lessonCount >= 1],
      ['bookworm',      lessonCount >= 10],
      ['first_quiz',    quizCount   >= 1],
      ['perfect_score', dto.reason === 'quiz_perfect'],
      ['first_course',  courseCount >= 1],
      ['five_courses',  courseCount >= 5],
      ['session_goer',  dto.reason  === 'session_booked'],
      ['week_streak',   streak      >= 7],
      ['month_streak',  streak      >= 30],
    ];

    for (const [badgeId, condition] of checks) {
      if (condition && !alreadyEarned.includes(badgeId)) {
        toAward.push(badgeId);
      }
    }

    if (toAward.length > 0) {
      await this.prisma.userBadge.createMany({
        data:            toAward.map((badge_id) => ({ user_id: userId, badge_id })),
        skipDuplicates: true,
      });
    }

    return toAward;
  }
}
