// DTO for awarding XP to the current user after a learning event.
// The frontend sends this after: lesson completed, quiz passed, course done, etc.
export class AwardXPDto {
  // What triggered this award
  reason!:
    | 'lesson_complete'
    | 'quiz_passed'
    | 'quiz_perfect'
    | 'course_complete'
    | 'session_booked'
    | 'daily_checkin';

  // Optional context — used for duplicate prevention and analytics
  metadata?: {
    lesson_id?: string;
    course_id?: string;
    quiz_id?: string;
    score?: number;      // quiz score percentage (used to detect quiz_perfect)
  };
}
