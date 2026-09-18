import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
export declare class QuizService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertOwnsQuiz;
    private isCorrect;
    createQuiz(userId: string, dto: CreateQuizDto): Promise<{
        questions: {
            id: string;
            type: string;
            created_at: Date;
            updated_at: Date;
            position: number;
            question: string;
            options: string[];
            quiz_id: string;
            correct: string;
            explanation: string | null;
            points: number;
        }[];
    } & {
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        lesson_id: string;
        pass_score: number;
        time_limit: number | null;
        max_attempts: number;
        is_gating: boolean;
    }>;
    updateQuiz(userId: string, quizId: string, dto: UpdateQuizDto): Promise<{
        questions: {
            id: string;
            type: string;
            created_at: Date;
            updated_at: Date;
            position: number;
            question: string;
            options: string[];
            quiz_id: string;
            correct: string;
            explanation: string | null;
            points: number;
        }[];
    } & {
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        lesson_id: string;
        pass_score: number;
        time_limit: number | null;
        max_attempts: number;
        is_gating: boolean;
    }>;
    deleteQuiz(userId: string, quizId: string): Promise<{
        message: string;
    }>;
    addQuestion(userId: string, quizId: string, dto: CreateQuestionDto): Promise<{
        id: string;
        type: string;
        created_at: Date;
        updated_at: Date;
        position: number;
        question: string;
        options: string[];
        quiz_id: string;
        correct: string;
        explanation: string | null;
        points: number;
    }>;
    updateQuestion(userId: string, quizId: string, questionId: string, dto: UpdateQuestionDto): Promise<{
        id: string;
        type: string;
        created_at: Date;
        updated_at: Date;
        position: number;
        question: string;
        options: string[];
        quiz_id: string;
        correct: string;
        explanation: string | null;
        points: number;
    }>;
    deleteQuestion(userId: string, quizId: string, questionId: string): Promise<{
        message: string;
    }>;
    reorderQuestion(userId: string, quizId: string, questionId: string, direction: 'up' | 'down'): Promise<{
        message: string;
    }>;
    getAllAttempts(userId: string, quizId: string): Promise<({
        answers: {
            id: string;
            answer: string;
            question_id: string;
            attempt_id: string;
            is_correct: boolean;
        }[];
    } & {
        id: string;
        user_id: string;
        completed_at: Date;
        quiz_id: string;
        score: number;
        passed: boolean;
        time_taken: number | null;
    })[]>;
    getQuizForLesson(lessonId: string): Promise<{
        questions: {
            id: string;
            type: string;
            position: number;
            question: string;
            options: string[];
            points: number;
        }[];
    } & {
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        lesson_id: string;
        pass_score: number;
        time_limit: number | null;
        max_attempts: number;
        is_gating: boolean;
    }>;
    submitAttempt(userId: string, quizId: string, dto: SubmitAttemptDto): Promise<{
        attempt_id: string;
        score: number;
        passed: boolean;
        pass_score: number;
        earned: number;
        total: number;
        time_taken: number | undefined;
        answers: {
            question_id: string;
            answer: string;
            is_correct: boolean;
            explanation?: string | null;
        }[];
    }>;
    getMyAttempts(userId: string, quizId: string): Promise<({
        answers: {
            id: string;
            answer: string;
            question_id: string;
            attempt_id: string;
            is_correct: boolean;
        }[];
    } & {
        id: string;
        user_id: string;
        completed_at: Date;
        quiz_id: string;
        score: number;
        passed: boolean;
        time_taken: number | null;
    })[]>;
}
