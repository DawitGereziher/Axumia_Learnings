import { ConfigService } from '@nestjs/config';
export type StorageBucket = 'public' | 'private';
export declare class StorageService {
    private config;
    private readonly logger;
    private publicClient;
    private privateClient;
    private publicBucket;
    private privateBucket;
    private r2Endpoint;
    private signedUrlExpiry;
    constructor(config: ConfigService);
    private getClient;
    private getBucketName;
    private isConfigured;
    buildKey(type: 'thumbnail' | 'profile' | 'cover' | 'kyc' | 'pdf' | 'certificate' | 'resource', ...parts: string[]): string;
    getUploadUrl(bucket: StorageBucket, key: string, contentType: string): Promise<string>;
    uploadBuffer(buffer: Buffer, bucket: StorageBucket, key: string, contentType?: string): Promise<void>;
    getSignedUrl(key: string): Promise<string>;
    getPublicUrl(key: string): string;
    deleteObject(bucket: StorageBucket, key: string): Promise<void>;
}
