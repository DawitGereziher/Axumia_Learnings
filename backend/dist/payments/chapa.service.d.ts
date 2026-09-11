import { ConfigService } from '@nestjs/config';
export interface ChapaInitResponse {
    status: string;
    message: string;
    data: {
        checkout_url: string;
        tx_ref: string;
    };
}
export declare class ChapaService {
    private config;
    private readonly logger;
    private readonly baseUrl;
    private readonly secretKey;
    constructor(config: ConfigService);
    initiatePayment(dto: {
        amount: number;
        currency?: string;
        email: string;
        first_name: string;
        last_name: string;
        tx_ref: string;
        callback_url: string;
        return_url: string;
        description?: string;
    }): Promise<ChapaInitResponse>;
    verifyTransaction(txRef: string): Promise<{
        status: string;
        data: any;
    }>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
}
