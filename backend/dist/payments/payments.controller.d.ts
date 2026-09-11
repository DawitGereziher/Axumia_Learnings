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
    verifyPaymentStatus(txRef: string): Promise<{
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
        status?: undefined;
    } | {
        received: boolean;
        status: string;
    }>;
    myTransactions(user: AuthUser): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string;
        booking_id: string | null;
        status: string;
        currency: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        purchase_id: string | null;
        help_session_id: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        platform_fee: import("@prisma/client-runtime-utils").Decimal;
        provider: string;
        provider_tx_ref: string | null;
    }[]>;
    getInstructorEarnings(user: AuthUser): Promise<{
        grossEarned: number;
        platformFees: number;
        netEarned: number;
        totalPaidOut: number;
        totalPendingPayouts: number;
        availableBalance: number;
        payouts: {
            id: string;
            created_at: Date;
            instructor_id: string;
            status: string;
            notes: string | null;
            currency: string;
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
        created_at: Date;
        instructor_id: string;
        status: string;
        notes: string | null;
        currency: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        transaction_id: string | null;
        account_details: string | null;
        paid_at: Date | null;
    }>;
    requestPayout(txId: string, user: AuthUser): Promise<{
        grossEarned: number;
        platformFees: number;
        netEarned: number;
        totalPaidOut: number;
        totalPendingPayouts: number;
        availableBalance: number;
        payouts: {
            id: string;
            created_at: Date;
            instructor_id: string;
            status: string;
            notes: string | null;
            currency: string;
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
    cleanupAbandoned(): Promise<{
        cleaned: number;
    }>;
}
