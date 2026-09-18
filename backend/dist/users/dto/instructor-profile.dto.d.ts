export declare class SubmitInstructorProfileDto {
    bio?: string;
    headline?: string;
    hourly_rate?: number;
    kyc_docs?: string[];
}
export declare class UpdateRichInstructorProfileDto {
    bio?: string;
    headline?: string;
    hourly_rate?: number;
    cover_image?: string;
    profile_image?: string;
    skills?: string[];
    languages?: string[];
    experience_years?: number;
    location?: string;
    website_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    kyc_docs?: string[];
}
export declare class CreateInstructorReviewDto {
    rating: number;
    comment?: string;
    course_id?: string;
}
export declare class UpdateKycStatusDto {
    status: 'approved' | 'rejected';
}
