import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class PaymentsService implements OnModuleInit {
    private prisma;
    private chapa;
    private config;
    private notificationsQueue;
    private payoutsQueue;
    private readonly logger;
    private readonly commissionPct;
    constructor(prisma: PrismaService, chapa: ChapaService, config: ConfigService, notificationsQueue: Queue, payoutsQueue: Queue);
    onModuleInit(): Promise<void>;
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
    handleChapaWebhook(rawBody: string, signature: string): Promise<{
        received: boolean;
        status?: string;
    }>;
    verifyPaymentStatus(txRef: string, userId: string): Promise<{
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
    private linkTransactionToEntity;
    private updateTransactionStatus;
    cleanupAbandonedTransactions(): Promise<{
        abandoned: number;
    }>;
    refundTransaction(txRef: string, requestedByUserId: string, amount?: number, reason?: string): Promise<{
        status: string;
        message: string;
        txRef: string;
        amount: number;
    }>;
    getMyTransactions(userId: string, page?: number, limit?: number): Promise<{
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
    getInstructorEarnings(instructorUserId: string): Promise<{
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
    requestInstructorPayout(instructorUserId: string, dto: {
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
}
