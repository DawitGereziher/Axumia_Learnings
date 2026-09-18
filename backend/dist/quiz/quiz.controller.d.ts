import { AuthUser } from '../common/decorators/current-user.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
export declare class QuizController {
    private quiz;
    constructor(quiz: QuizService);
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
    submitAttempt(quizId: string, dto: SubmitAttemptDto, user: AuthUser): Promise<{
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
    getMyAttempts(quizId: string, user: AuthUser): Promise<({
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
    createQuiz(dto: CreateQuizDto, user: AuthUser): Promise<{
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
    updateQuiz(quizId: string, dto: UpdateQuizDto, user: AuthUser): Promise<{
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
    deleteQuiz(quizId: string, user: AuthUser): Promise<{
        message: string;
    }>;
    addQuestion(quizId: string, dto: CreateQuestionDto, user: AuthUser): Promise<{
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
    updateQuestion(quizId: string, questionId: string, dto: UpdateQuestionDto, user: AuthUser): Promise<{
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
    deleteQuestion(quizId: string, questionId: string, user: AuthUser): Promise<{
        message: string;
    }>;
    reorderQuestion(quizId: string, questionId: string, direction: 'up' | 'down', user: AuthUser): Promise<{
        message: string;
    }>;
    getAllAttempts(quizId: string, user: AuthUser): Promise<({
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
