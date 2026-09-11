// DTO for editing quiz settings (all fields optional — send only what changes)
export class UpdateQuizDto {
  title?: string;
  description?: string;
  pass_score?: number;
  time_limit?: number | null;  // null clears the limit
  max_attempts?: number;
  is_gating?: boolean;
}
