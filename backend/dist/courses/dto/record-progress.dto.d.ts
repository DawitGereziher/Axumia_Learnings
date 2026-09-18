export declare class RecordProgressDto {
    purchaseId: string;
    watchedSeconds: number;
    totalSeconds?: number;
}
export declare class AddQuestionDto {
    title: string;
    details: string;
}
export declare class AddAnswerDto {
    answer: string;
}
export declare class ValidateCouponDto {
    code: string;
}
export declare class ToggleCompleteDto {
    purchaseId?: string;
}
