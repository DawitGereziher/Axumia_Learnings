// DTO for editing an existing question (all fields optional)
export class UpdateQuestionDto {
  question?: string;
  type?: 'multiple_choice' | 'true_false' | 'text';
  options?: string[];
  correct?: string;
  explanation?: string;
  points?: number;
}
