export declare class CreateQuizDto {
    lesson_id: string;
    title: string;
    description?: string;
    pass_score?: number;
    time_limit?: number;
    max_attempts?: number;
    is_gating?: boolean;
}
