import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, createHash } from 'crypto';
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

@Injectable()
export class ContentSecurityService {
  private readonly logger = new Logger(ContentSecurityService.name);
  private readonly signatureSecret: string;
  private readonly defaultTtl: number; // Time to live in milliseconds

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.signatureSecret = this.config.get('CONTENT_SIGNATURE_SECRET') || 'default-signature-secret-change-in-production';
    this.defaultTtl = parseInt(this.config.get('SIGNED_URL_TTL_MS') || '3600000', 10); // 1 hour default
  }

  /**
   * Generate a signed URL for content access
   */
  generateSignedUrl(baseContentUrl: string, options: SignedUrlOptions): string {
    const expiresAt = options.expiresAt || (Date.now() + this.defaultTtl);
    
    const payload: SignedUrlPayload = {
      userId: options.userId,
      lessonId: options.lessonId,
      courseId: options.courseId,
      expiresAt,
      ip: options.ip,
      signature: '', // Will be calculated
    };

    // Generate signature
    const signature = this.generateSignature(payload);
    payload.signature = signature;

    // Encode payload and append to URL
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const separator = baseContentUrl.includes('?') ? '&' : '?';
    
    return `${baseContentUrl}${separator}token=${encodedPayload}`;
  }

  /**
   * Validate a signed URL token
   */
  validateSignedUrlToken(token: string, requestIp?: string): SignedUrlPayload {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload: SignedUrlPayload = JSON.parse(decoded);

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        throw new ForbiddenException('Signed URL has expired');
      }

      // Check IP if provided
      if (payload.ip && requestIp && payload.ip !== requestIp) {
        this.logger.warn(`IP mismatch for signed URL: expected ${payload.ip}, got ${requestIp}`);
        throw new ForbiddenException('IP address mismatch');
      }

      // Verify signature
      const expectedSignature = this.generateSignature({
        ...payload,
        signature: '', // Don't include signature in signature calculation
      });

      if (payload.signature !== expectedSignature) {
        throw new ForbiddenException('Invalid signature');
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to validate signed URL token:', error);
      throw new BadRequestException('Invalid token format');
    }
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: any): string {
    const { signature, ...payloadToSign } = payload;
    const payloadString = JSON.stringify(payloadToSign, Object.keys(payloadToSign).sort());
    return createHmac('sha256', this.signatureSecret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Check if user has access to content
   */
  async validateContentAccess(userId: string, lessonId: string): Promise<boolean> {
    try {
      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { course: true },
      });

      if (!lesson) {
        return false;
      }

      // Check if lesson is free preview
      if (lesson.is_free_preview) {
        return true;
      }

      // Check if user has purchased the course
      const purchase = await this.prisma.coursePurchase.findUnique({
        where: {
          user_id_course_id: { user_id: userId, course_id: lesson.course_id },
        },
      });

      return !!purchase;
    } catch (error) {
      this.logger.error('Failed to validate content access:', error);
      return false;
    }
  }

  /**
   * Generate access token for content
   */
  async generateAccessToken(userId: string, lessonId: string): Promise<string> {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }

    const hasAccess = await this.validateContentAccess(userId, lessonId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this content');
    }

    const payload: SignedUrlPayload = {
      userId,
      lessonId,
      courseId: lesson.course_id,
      expiresAt: Date.now() + this.defaultTtl,
      signature: '',
    };

    const signature = this.generateSignature(payload);
    payload.signature = signature;

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string, requestIp?: string): Promise<SignedUrlPayload> {
    return this.validateSignedUrlToken(token, requestIp);
  }

  /**
   * Generate content fingerprint for tracking
   */
  generateContentFingerprint(userId: string, lessonId: string): string {
    const data = `${userId}:${lessonId}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate short-lived access token for iframe embedding
   */
  generateEmbedToken(userId: string, lessonId: string, duration: number = 3600000): string {
    const payload = {
      userId,
      lessonId,
      expiresAt: Date.now() + duration,
      type: 'embed',
    };

    const signature = this.generateSignature(payload as any);
    const tokenPayload = { ...payload, signature };
    
    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  }

  /**
   * Validate embed token
   */
  validateEmbedToken(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);

      if (payload.type !== 'embed') {
        return false;
      }

      if (Date.now() > payload.expiresAt) {
        return false;
      }

      const expectedSignature = this.generateSignature({
        ...payload,
        signature: '',
      } as any);

      return payload.signature === expectedSignature;
    } catch {
      return false;
    }
  }
}