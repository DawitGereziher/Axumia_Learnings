import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageBucket = 'public' | 'private';

/**
 * StorageService — Cloudflare R2 object storage (S3-compatible).
 *
 * Two separate clients / buckets:
 *  - publicClient  → axumia-public  (thumbnails, profile photos, cover images)
 *  - privateClient → axumia-private (KYC docs, lesson PDFs, certificates)
 *
 * Public files are served directly via R2's public domain (no signed URL needed).
 * Private files always use short-lived signed GET URLs — never expose raw keys.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private publicClient: S3Client;
  private privateClient: S3Client;
  private publicBucket: string;
  private privateBucket: string;
  private r2Endpoint: string;
  private signedUrlExpiry: number;

  constructor(private config: ConfigService) {
    this.r2Endpoint = config.get('R2_ENDPOINT') || '';
    this.publicBucket = config.get('R2_PUBLIC_BUCKET') || 'axumia-public';
    this.privateBucket = config.get('R2_PRIVATE_BUCKET') || 'axumia-private';
    this.signedUrlExpiry = parseInt(
      config.get('R2_SIGNED_URL_EXPIRY_SECONDS') || '3600',
      10,
    );

    // Public bucket client
    this.publicClient = new S3Client({
      region: 'auto',
      endpoint: this.r2Endpoint,
      credentials: {
        accessKeyId: config.get('R2_PUBLIC_ACCESS_KEY_ID') || '',
        secretAccessKey: config.get('R2_PUBLIC_SECRET_ACCESS_KEY') || '',
      },
    });

    // Private bucket client
    this.privateClient = new S3Client({
      region: 'auto',
      endpoint: this.r2Endpoint,
      credentials: {
        accessKeyId: config.get('R2_PRIVATE_ACCESS_KEY_ID') || '',
        secretAccessKey: config.get('R2_PRIVATE_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private getClient(bucket: StorageBucket): S3Client {
    return bucket === 'public' ? this.publicClient : this.privateClient;
  }

  private getBucketName(bucket: StorageBucket): string {
    return bucket === 'public' ? this.publicBucket : this.privateBucket;
  }

  private isConfigured(bucket: StorageBucket): boolean {
    if (bucket === 'public') {
      return !!(
        this.config.get('R2_PUBLIC_ACCESS_KEY_ID') &&
        this.config.get('R2_PUBLIC_SECRET_ACCESS_KEY') &&
        this.r2Endpoint
      );
    }
    return !!(
      this.config.get('R2_PRIVATE_ACCESS_KEY_ID') &&
      this.config.get('R2_PRIVATE_SECRET_ACCESS_KEY') &&
      this.r2Endpoint
    );
  }

  // ─── Key builder ────────────────────────────────────────────────────────────

  /**
   * Build a consistent R2 object key.
   * Examples:
   *   buildKey('thumbnail', 'course-id', 'image.jpg') → 'thumbnail/course-id/image.jpg'
   *   buildKey('kyc', 'user-id', 'passport.pdf')      → 'kyc/user-id/passport.pdf'
   */
  buildKey(
    type: 'thumbnail' | 'profile' | 'cover' | 'kyc' | 'pdf' | 'certificate' | 'resource',
    ...parts: string[]
  ): string {
    return `${type}/${parts.join('/')}`;
  }

  // ─── Pre-signed upload URL (browser uploads directly to R2) ─────────────────

  /**
   * Returns a pre-signed PUT URL so the frontend can upload a file
   * directly to R2 without routing the bytes through your server.
   * Valid for 10 minutes.
   */
  async getUploadUrl(
    bucket: StorageBucket,
    key: string,
    contentType: string,
  ): Promise<string> {
    if (!this.isConfigured(bucket)) {
      this.logger.warn(`[StorageService] R2 ${bucket} bucket not configured — cannot generate upload URL`);
      throw new Error(`Storage not configured for ${bucket} bucket`);
    }

    const command = new PutObjectCommand({
      Bucket: this.getBucketName(bucket),
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.getClient(bucket), command, { expiresIn: 600 });
  }

  // ─── Direct Buffer Upload (server-generated files e.g. Certificates) ───────

  /**
   * Upload a Buffer directly from the backend server to R2.
   * Useful for server-side PDF certificates or generated documents.
   */
  async uploadBuffer(
    buffer: Buffer,
    bucket: StorageBucket,
    key: string,
    contentType = 'application/octet-stream',
  ): Promise<void> {
    if (!this.isConfigured(bucket)) {
      this.logger.warn(`[StorageService] R2 ${bucket} bucket not configured — skipping direct upload`);
      return;
    }

    const command = new PutObjectCommand({
      Bucket: this.getBucketName(bucket),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.getClient(bucket).send(command);
    this.logger.log(`[StorageService] Direct buffer uploaded to ${bucket}/${key}`);
  }

  // ─── Signed GET URL (private content delivery) ──────────────────────────────

  /**
   * Returns a short-lived signed GET URL for private content.
   * Only use this for the PRIVATE bucket. Public files use getPublicUrl().
   */
  async getSignedUrl(key: string): Promise<string> {
    if (!this.isConfigured('private')) {
      this.logger.warn(`[StorageService] R2 private bucket not configured — mocking signed URL`);
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }

    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });

    return getSignedUrl(this.privateClient, command, {
      expiresIn: this.signedUrlExpiry,
    });
  }

  // ─── Public URL (no signing needed for public bucket) ───────────────────────

  /**
   * Returns the direct public URL for a file in the public bucket.
   * Requires the bucket to have public access enabled in R2 dashboard.
   * Format: https://<bucket>.<account>.r2.dev/<key>
   * OR use a custom domain if you've configured one in R2.
   */
  getPublicUrl(key: string): string {
    const publicDomain = this.config.get('R2_PUBLIC_DOMAIN');
    if (publicDomain) {
      return `${publicDomain}/${key}`;
    }
    // Fallback: derive from endpoint
    // endpoint = https://ACCOUNT_ID.r2.cloudflarestorage.com
    // public url = https://pub-HASH.r2.dev/key (set R2_PUBLIC_DOMAIN manually)
    this.logger.warn('[StorageService] R2_PUBLIC_DOMAIN not set — returning raw key as URL placeholder');
    return key;
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Delete an object from either bucket (e.g. when a course or user is deleted).
   */
  async deleteObject(bucket: StorageBucket, key: string): Promise<void> {
    try {
      await this.getClient(bucket).send(
        new DeleteObjectCommand({
          Bucket: this.getBucketName(bucket),
          Key: key,
        }),
      );
      this.logger.log(`[StorageService] Deleted ${bucket}/${key}`);
    } catch (err) {
      this.logger.error(
        `[StorageService] Failed to delete ${bucket}/${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
