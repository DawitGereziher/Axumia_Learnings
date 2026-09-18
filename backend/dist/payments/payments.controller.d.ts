import { AuthUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { Request } from 'express';
export declare class PaymentsController {
    private payments;
    constructor(payments: PaymentsService);
    initiateCoursePayment(courseId: string, user: AuthUser): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    initiateBookingPayment(bookingId: string, user: AuthUser): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    initiateHelpSessionPayment(sessionId: string, user: AuthUser): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    verifyPaymentStatus(txRef: string, user: AuthUser): Promise<{
        status: string;
        txRef: string;
        verified?: undefined;
        entityType?: undefined;
        courseSlug?: undefined;
    } | {
        status: string;
        txRef: string;
        verified: boolean;
        entityType: string | null;
        courseSlug: string | null;
    }>;
    chapaWebhook(req: Request, signature: string): Promise<{
        received: boolean;
        status?: string;
    }>;
    myTransactions(user: AuthUser, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            status: string;
            created_at: Date;
            currency: string;
            booking_id: string | null;
            help_session_id: string | null;
            purchase_id: string | null;
            amount: import("@prisma/client-runtime-utils").Decimal;
            platform_fee: import("@prisma/client-runtime-utils").Decimal;
            provider_tx_ref: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getInstructorEarnings(user: AuthUser): Promise<{
        grossEarned: number;
        platformFees: number;
        netEarned: number;
        totalPaidOut: number;
        totalPendingPayouts: number;
        availableBalance: number;
        payouts: {
            id: string;
            status: string;
            created_at: Date;
            instructor_id: string;
            currency: string;
            notes: string | null;
            amount: import("@prisma/client-runtime-utils").Decimal;
            method: string;
            transaction_id: string | null;
            account_details: string | null;
            paid_at: Date | null;
        }[];
        earningsLedger: {
            id: string;
            type: string;
            title: string;
            student: string;
            amount: number;
            net: number;
            date: Date;
        }[];
    }>;
    requestInstructorPayout(user: AuthUser, body: {
        amount: number;
        method: string;
        account_details: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        instructor_id: string;
        currency: string;
        notes: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        transaction_id: string | null;
        account_details: string | null;
        paid_at: Date | null;
    }>;
    cleanupAbandoned(): Promise<{
        abandoned: number;
    }>;
    refundTransaction(txRef: string, user: AuthUser, body?: {
        amount?: number;
        reason?: string;
    }): Promise<{
        status: string;
        message: string;
        txRef: string;
        amount: number;
    }>;
}
