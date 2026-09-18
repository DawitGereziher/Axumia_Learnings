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
exports.GamificationService = exports.BADGE_CATALOG = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const XP_TABLE = {
    lesson_complete: 20,
    quiz_passed: 50,
    quiz_perfect: 100,
    course_complete: 200,
    session_booked: 30,
    daily_checkin: 5,
    streak_bonus: 100,
};
const LEVEL_THRESHOLDS = [
    0,
    100,
    250,
    500,
    1000,
    2000,
    4000,
    8000,
];
function computeLevel(totalXp) {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (totalXp >= LEVEL_THRESHOLDS[i])
            level = i + 1;
        else
            break;
    }
    return level;
}
exports.BADGE_CATALOG = [
    { id: 'first_lesson', label: 'First Step', description: 'Completed your first lesson', icon: '🎯' },
    { id: 'first_quiz', label: 'Quiz Taker', description: 'Passed your first quiz', icon: '📝' },
    { id: 'perfect_score', label: 'Perfect Score', description: 'Scored 100% on a quiz', icon: '💯' },
    { id: 'first_course', label: 'Graduate', description: 'Completed your first course', icon: '🎓' },
    { id: 'five_courses', label: 'Scholar', description: 'Completed 5 courses', icon: '📚' },
    { id: 'bookworm', label: 'Bookworm', description: 'Completed 10 lessons', icon: '📖' },
    { id: 'week_streak', label: '7-Day Streak', description: 'Studied 7 days in a row', icon: '🔥' },
    { id: 'month_streak', label: '30-Day Streak', description: 'Studied 30 days in a row', icon: '⚡' },
    { id: 'session_goer', label: 'Live Learner', description: 'Booked a live tutoring session', icon: '🎙️' },
    { id: 'speed_learner', label: 'Speed Learner', description: 'Completed 3 lessons in one day', icon: '⚡' },
];
let GamificationService = class GamificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyStats(userId) {
        const stats = await this.prisma.userStats.upsert({
            where: { user_id: userId },
            create: { user_id: userId },
            update: {},
        });
        const badges = await this.prisma.userBadge.findMany({
            where: { user_id: userId },
            orderBy: { earned_at: 'desc' },
        });
        const recentXP = await this.prisma.xPLog.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 10,
        });
        const enrichedBadges = exports.BADGE_CATALOG.map((def) => ({
            ...def,
            earned: badges.some((b) => b.badge_id === def.id),
            earned_at: badges.find((b) => b.badge_id === def.id)?.earned_at ?? null,
        }));
        const nextLevelXP = LEVEL_THRESHOLDS[stats.level] ?? null;
        return {
            total_xp: stats.total_xp,
            level: stats.level,
            current_streak: stats.current_streak,
            longest_streak: stats.longest_streak,
            last_active: stats.last_active,
            next_level_xp: nextLevelXP,
            badges: enrichedBadges,
            recent_xp: recentXP,
        };
    }
    async getLeaderboard() {
        const top = await this.prisma.userStats.findMany({
            orderBy: { total_xp: 'desc' },
            take: 10,
        });
        const enriched = await Promise.all(top.map(async (s, i) => {
            const user = await this.prisma.user.findUnique({
                where: { id: s.user_id },
                select: { first_name: true, last_name: true, image: true },
            });
            return {
                rank: i + 1,
                user_id: s.user_id,
                name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Anonymous',
                avatar: user?.image ?? null,
                total_xp: s.total_xp,
                level: s.level,
                current_streak: s.current_streak,
            };
        }));
        return enriched;
    }
    async awardXP(userId, dto) {
        const baseXP = XP_TABLE[dto.reason] ?? 0;
        if (baseXP === 0)
            return { awarded: 0, message: 'Unknown reason — no XP awarded' };
        if (dto.metadata?.lesson_id && dto.reason === 'lesson_complete') {
            const already = await this.prisma.xPLog.findFirst({
                where: { user_id: userId, reason: 'lesson_complete', metadata: { path: ['lesson_id'], equals: dto.metadata.lesson_id } },
            });
            if (already)
                return { awarded: 0, message: 'XP already awarded for this lesson' };
        }
        if (dto.metadata?.quiz_id && (dto.reason === 'quiz_passed' || dto.reason === 'quiz_perfect')) {
            const already = await this.prisma.xPLog.findFirst({
                where: { user_id: userId, reason: { in: ['quiz_passed', 'quiz_perfect'] }, metadata: { path: ['quiz_id'], equals: dto.metadata.quiz_id } },
            });
            if (already)
                return { awarded: 0, message: 'XP already awarded for this quiz' };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.xPLog.create({
                data: { user_id: userId, reason: dto.reason, amount: baseXP, metadata: dto.metadata ?? {} },
            });
            let stats = await tx.userStats.upsert({
                where: { user_id: userId },
                create: { user_id: userId },
                update: {},
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { streakDelta, streakBonusEarned } = this.computeStreakUpdate(stats, today);
            const newStreak = Math.max(0, stats.current_streak + streakDelta);
            let totalAwarded = baseXP;
            if (streakBonusEarned) {
                totalAwarded += XP_TABLE['streak_bonus'];
                await tx.xPLog.create({
                    data: { user_id: userId, reason: 'streak_bonus', amount: XP_TABLE['streak_bonus'], metadata: { streak: newStreak } },
                });
            }
            const newTotalXP = stats.total_xp + totalAwarded;
            const newLevel = computeLevel(newTotalXP);
            stats = await tx.userStats.update({
                where: { user_id: userId },
                data: {
                    total_xp: newTotalXP,
                    level: newLevel,
                    current_streak: newStreak,
                    longest_streak: Math.max(stats.longest_streak, newStreak),
                    last_active: today,
                },
            });
            return { stats, totalAwarded, streakBonusEarned, newStreak };
        });
        const newBadges = await this.checkAndAwardBadges(userId, dto, result.stats, result.newStreak);
        return {
            awarded: result.totalAwarded,
            total_xp: result.stats.total_xp,
            level: result.stats.level,
            current_streak: result.newStreak,
            streak_bonus: result.streakBonusEarned,
            new_badges: newBadges,
        };
    }
    computeStreakUpdate(stats, today) {
        if (!stats.last_active)
            return { streakDelta: 1, streakBonusEarned: false };
        const lastActive = new Date(stats.last_active);
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / 86_400_000);
        if (diffDays === 0)
            return { streakDelta: 0, streakBonusEarned: false };
        if (diffDays === 1) {
            const newStreak = stats.current_streak + 1;
            const streakBonusEarned = newStreak === 7 || newStreak === 30;
            return { streakDelta: 1, streakBonusEarned };
        }
        return { streakDelta: -(stats.current_streak - 1), streakBonusEarned: false };
    }
    async checkAndAwardBadges(userId, dto, stats, streak) {
        const alreadyEarned = (await this.prisma.userBadge.findMany({ where: { user_id: userId } })).map((b) => b.badge_id);
        const toAward = [];
        const lessonCount = await this.prisma.xPLog.count({ where: { user_id: userId, reason: 'lesson_complete' } });
        const courseCount = await this.prisma.xPLog.count({ where: { user_id: userId, reason: 'course_complete' } });
        const quizCount = await this.prisma.xPLog.count({ where: { user_id: userId, reason: { in: ['quiz_passed', 'quiz_perfect'] } } });
        const checks = [
            ['first_lesson', lessonCount >= 1],
            ['bookworm', lessonCount >= 10],
            ['first_quiz', quizCount >= 1],
            ['perfect_score', dto.reason === 'quiz_perfect'],
            ['first_course', courseCount >= 1],
            ['five_courses', courseCount >= 5],
            ['session_goer', dto.reason === 'session_booked'],
            ['week_streak', streak >= 7],
            ['month_streak', streak >= 30],
        ];
        for (const [badgeId, condition] of checks) {
            if (condition && !alreadyEarned.includes(badgeId)) {
                toAward.push(badgeId);
            }
        }
        if (toAward.length > 0) {
            await this.prisma.userBadge.createMany({
                data: toAward.map((badge_id) => ({ user_id: userId, badge_id })),
                skipDuplicates: true,
            });
        }
        return toAward;
    }
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamificationService);
//# sourceMappingURL=gamification.service.js.map