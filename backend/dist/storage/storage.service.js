"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let StorageService = StorageService_1 = class StorageService {
    config;
    logger = new common_1.Logger(StorageService_1.name);
    publicClient;
    privateClient;
    publicBucket;
    privateBucket;
    r2Endpoint;
    signedUrlExpiry;
    constructor(config) {
        this.config = config;
        this.r2Endpoint = config.get('R2_ENDPOINT') || '';
        this.publicBucket = config.get('R2_PUBLIC_BUCKET') || 'axumia-public';
        this.privateBucket = config.get('R2_PRIVATE_BUCKET') || 'axumia-private';
        this.signedUrlExpiry = parseInt(config.get('R2_SIGNED_URL_EXPIRY_SECONDS') || '3600', 10);
        this.publicClient = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: this.r2Endpoint,
            credentials: {
                accessKeyId: config.get('R2_PUBLIC_ACCESS_KEY_ID') || '',
                secretAccessKey: config.get('R2_PUBLIC_SECRET_ACCESS_KEY') || '',
            },
        });
        this.privateClient = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: this.r2Endpoint,
            credentials: {
                accessKeyId: config.get('R2_PRIVATE_ACCESS_KEY_ID') || '',
                secretAccessKey: config.get('R2_PRIVATE_SECRET_ACCESS_KEY') || '',
            },
        });
    }
    getClient(bucket) {
        return bucket === 'public' ? this.publicClient : this.privateClient;
    }
    getBucketName(bucket) {
        return bucket === 'public' ? this.publicBucket : this.privateBucket;
    }
    isConfigured(bucket) {
        if (bucket === 'public') {
            return !!(this.config.get('R2_PUBLIC_ACCESS_KEY_ID') &&
                this.config.get('R2_PUBLIC_SECRET_ACCESS_KEY') &&
                this.r2Endpoint);
        }
        return !!(this.config.get('R2_PRIVATE_ACCESS_KEY_ID') &&
            this.config.get('R2_PRIVATE_SECRET_ACCESS_KEY') &&
            this.r2Endpoint);
    }
    buildKey(type, ...parts) {
        return `${type}/${parts.join('/')}`;
    }
    async getUploadUrl(bucket, key, contentType) {
        if (!this.isConfigured(bucket)) {
            this.logger.warn(`[StorageService] R2 ${bucket} bucket not configured — cannot generate upload URL`);
            throw new Error(`Storage not configured for ${bucket} bucket`);
        }
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.getBucketName(bucket),
            Key: key,
            ContentType: contentType,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.getClient(bucket), command, { expiresIn: 600 });
    }
    async uploadBuffer(buffer, bucket, key, contentType = 'application/octet-stream') {
        if (!this.isConfigured(bucket)) {
            this.logger.warn(`[StorageService] R2 ${bucket} bucket not configured — skipping direct upload`);
            return;
        }
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.getBucketName(bucket),
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });
        await this.getClient(bucket).send(command);
        this.logger.log(`[StorageService] Direct buffer uploaded to ${bucket}/${key}`);
    }
    async getSignedUrl(key) {
        if (!this.isConfigured('private')) {
            this.logger.warn(`[StorageService] R2 private bucket not configured — mocking signed URL`);
            return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.privateBucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.privateClient, command, {
            expiresIn: this.signedUrlExpiry,
        });
    }
    getPublicUrl(key) {
        const publicDomain = this.config.get('R2_PUBLIC_DOMAIN');
        if (publicDomain) {
            return `${publicDomain}/${key}`;
        }
        this.logger.warn('[StorageService] R2_PUBLIC_DOMAIN not set — returning raw key as URL placeholder');
        return key;
    }
    async deleteObject(bucket, key) {
        try {
            await this.getClient(bucket).send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.getBucketName(bucket),
                Key: key,
            }));
            this.logger.log(`[StorageService] Deleted ${bucket}/${key}`);
        }
        catch (err) {
            this.logger.error(`[StorageService] Failed to delete ${bucket}/${key}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map