import { PrismaService } from '../prisma/prisma.service';
export declare class QaService {
    private prisma;
    constructor(prisma: PrismaService);
    getLessonQuestions(lessonId: string): Promise<({
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
        answers: ({
            user: {
                role: string;
                first_name: string | null;
                last_name: string | null;
            };
        } & {
            id: string;
            created_at: Date;
            user_id: string;
            answer: string;
            is_accepted: boolean;
            question_id: string;
        })[];
    } & {
        id: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    })[]>;
    addLessonQuestion(userId: string, lessonId: string, title: string, details: string): Promise<{
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
        answers: {
            id: string;
            created_at: Date;
            user_id: string;
            answer: string;
            is_accepted: boolean;
            question_id: string;
        }[];
    } & {
        id: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    }>;
    addLessonAnswer(userId: string, questionId: string, answer: string): Promise<{
        user: {
            role: string;
            first_name: string | null;
            last_name: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        user_id: string;
        answer: string;
        is_accepted: boolean;
        question_id: string;
    }>;
    acceptLessonAnswer(userId: string, answerId: string): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        answer: string;
        is_accepted: boolean;
        question_id: string;
    }>;
    upvoteLessonQuestion(questionId: string): Promise<{
        id: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        lesson_id: string;
        details: string;
        upvotes: number;
    }>;
}
