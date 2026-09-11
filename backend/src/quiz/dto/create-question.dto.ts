// DTO for adding a question to a quiz
//
// Question types:
//   multiple_choice  →  options = ["A","B","C","D"], correct = "0" | "1" | "2" | "3"
//   true_false       →  options = ["True","False"],  correct = "0" | "1"
//   text             →  options = [],                correct = "expected keyword or phrase"
//
export class CreateQuestionDto {
  question!: string;
  type!: 'multiple_choice' | 'true_false' | 'text';
  options?: string[];    // required for multiple_choice and true_false
  correct!: string;      // index string for MC/TF, expected text for text type
  explanation?: string;  // feedback shown after answering
  points?: number;       // default 1
}
