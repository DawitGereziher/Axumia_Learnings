// DTO for creating a new quiz attached to a lesson
export class CreateQuizDto {
  lesson_id!: string;           // which lesson this quiz belongs to
  title!: string;
  description?: string;
  pass_score?: number;          // 0-100, default 70
  time_limit?: number;          // minutes, omit for no limit
  max_attempts?: number;        // 0 = unlimited, default 3
  is_gating?: boolean;          // default true = block next lesson until passed
}
