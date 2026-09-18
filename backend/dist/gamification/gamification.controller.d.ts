import { AuthUser } from '../common/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';
import { AwardXPDto } from './dto/award-xp.dto';
export declare class GamificationController {
    private gamification;
    constructor(gamification: GamificationService);
    getMyStats(user: AuthUser): Promise<{
        total_xp: number;
        level: number;
        current_streak: number;
        longest_streak: number;
        last_active: Date | null;
        next_level_xp: number;
        badges: {
            earned: boolean;
            earned_at: Date | null;
            id: string;
            label: string;
            description: string;
            icon: string;
        }[];
        recent_xp: {
            id: string;
            created_at: Date;
            user_id: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            amount: number;
            reason: string;
        }[];
    }>;
    getLeaderboard(): Promise<{
        rank: number;
        user_id: string;
        name: string;
        avatar: string | null;
        total_xp: number;
        level: number;
        current_streak: number;
    }[]>;
    awardXP(dto: AwardXPDto, user: AuthUser): Promise<{
        awarded: number;
        message: string;
        total_xp?: undefined;
        level?: undefined;
        current_streak?: undefined;
        streak_bonus?: undefined;
        new_badges?: undefined;
    } | {
        awarded: number;
        total_xp: number;
        level: number;
        current_streak: number;
        streak_bonus: boolean;
        new_badges: string[];
        message?: undefined;
    }>;
}
