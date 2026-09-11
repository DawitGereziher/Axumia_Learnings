import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class PaymentsService {
    private prisma;
    private chapa;
    private config;
    private notificationsQueue;
    private readonly logger;
    private readonly commissionPct;
    constructor(prisma: PrismaService, chapa: ChapaService, config: ConfigService, notificationsQueue: Queue);
    private checkExistingPaidTransaction;
    private generateTxRef;
    private parseUserName;
    private isMockMode;
    private getApiUrls;
    private initiatePaymentCommon;
    initiateCoursePayment(userId: string, courseId: string, userEmail: string, userName: string): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    initiateBookingPayment(userId: string, bookingId: string, userEmail: string, userName: string): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    initiateHelpSessionPayment(userId: string, sessionId: string, userEmail: string, userName: string): Promise<{
        checkoutUrl: string;
        txRef: string;
    }>;
    private linkTransactionToEntity;
    private updateTransactionStatus;
    handleChapaWebhook(rawBody: string, signature: string): Promise<{
        received: boolean;
        status?: undefined;
    } | {
        received: boolean;
        status: string;
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
    cleanupAbandonedTransactions(): Promise<{
        cleaned: number;
    }>;
    getMyTransactions(userId: string): Promise<{
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
    getInstructorEarnings(instructorUserId: string): Promise<{
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
    requestInstructorPayout(instructorUserId: string, dto: {
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
}
