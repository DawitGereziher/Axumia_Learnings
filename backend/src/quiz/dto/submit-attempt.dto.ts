// DTO for submitting a quiz attempt
// The student sends all their answers in one request; the server grades everything.
export class SubmitAttemptDto {
  answers!: {
    question_id: string;
    answer: string;  // index string for MC/TF, free text for text questions
  }[];
  time_taken?: number;  // seconds spent (for analytics; not enforced here)
}
