import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface SignedUrlOptions {
    userId: string;
    lessonId: string;
    courseId: string;
    expiresAt?: number;
    ip?: string;
}
export interface SignedUrlPayload {
    userId: string;
    lessonId: string;
    courseId: string;
    expiresAt: number;
    ip?: string;
    signature: string;
}
export declare class ContentSecurityService {
    private config;
    private prisma;
    private readonly logger;
    private readonly signatureSecret;
    private readonly defaultTtl;
    constructor(config: ConfigService, prisma: PrismaService);
    generateSignedUrl(baseContentUrl: string, options: SignedUrlOptions): string;
    validateSignedUrlToken(token: string, requestIp?: string): SignedUrlPayload;
    private generateSignature;
    validateContentAccess(userId: string, lessonId: string): Promise<boolean>;
    generateAccessToken(userId: string, lessonId: string): Promise<string>;
    validateAccessToken(token: string, requestIp?: string): Promise<SignedUrlPayload>;
    generateContentFingerprint(userId: string, lessonId: string): string;
    generateEmbedToken(userId: string, lessonId: string, duration?: number): string;
    validateEmbedToken(token: string): boolean;
}
