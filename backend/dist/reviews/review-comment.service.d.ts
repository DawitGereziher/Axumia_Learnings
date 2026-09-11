import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewCommentService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    addComment(userId: string, reviewId: string, comment: string, parentId?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    }>;
    updateComment(commentId: string, userId: string, comment: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    }>;
    deleteComment(commentId: string, userId: string): Promise<void>;
    voteCommentHelpful(commentId: string, userId: string): Promise<{
        voted: boolean;
        helpful_count: number;
    }>;
    getReviewComments(reviewId: string, includeReplies?: boolean): Promise<({
        user: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            image: string | null;
        };
        replies: {
            id: string;
            created_at: Date;
            updated_at: Date;
            user_id: string;
            comment: string;
            is_hidden: boolean;
            is_flagged: boolean;
            helpful_count: number;
            review_id: string;
            parent_id: string | null;
            is_instructor_response: boolean;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        comment: string;
        is_hidden: boolean;
        is_flagged: boolean;
        helpful_count: number;
        review_id: string;
        parent_id: string | null;
        is_instructor_response: boolean;
    })[]>;
    moderateComment(commentId: string, action: 'hide' | 'show', moderatorId: string): Promise<void>;
}
