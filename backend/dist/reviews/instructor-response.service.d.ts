import { PrismaService } from '../prisma/prisma.service';
export declare class InstructorResponseService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createInstructorResponse(instructorId: string, courseId: string, reviewId: string, response: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    updateInstructorResponse(responseId: string, instructorId: string, response: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    deleteInstructorResponse(responseId: string, instructorId: string): Promise<void>;
    toggleResponseVisibility(responseId: string, instructorId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }>;
    getInstructorResponses(instructorId: string, courseId?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        instructor_id: string;
        courseReviewId: string | null;
        response: string;
        is_public: boolean;
    }[]>;
}
