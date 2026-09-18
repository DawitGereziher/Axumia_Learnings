export declare class AwardXPDto {
    reason: 'lesson_complete' | 'quiz_passed' | 'quiz_perfect' | 'course_complete' | 'session_booked' | 'daily_checkin';
    metadata?: {
        lesson_id?: string;
        course_id?: string;
        quiz_id?: string;
        score?: number;
    };
}
