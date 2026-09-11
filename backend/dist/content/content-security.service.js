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
var ContentSecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSecurityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let ContentSecurityService = ContentSecurityService_1 = class ContentSecurityService {
    config;
    prisma;
    logger = new common_1.Logger(ContentSecurityService_1.name);
    signatureSecret;
    defaultTtl;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.signatureSecret = this.config.get('CONTENT_SIGNATURE_SECRET') || 'default-signature-secret-change-in-production';
        this.defaultTtl = parseInt(this.config.get('SIGNED_URL_TTL_MS') || '3600000', 10);
    }
    generateSignedUrl(baseContentUrl, options) {
        const expiresAt = options.expiresAt || (Date.now() + this.defaultTtl);
        const payload = {
            userId: options.userId,
            lessonId: options.lessonId,
            courseId: options.courseId,
            expiresAt,
            ip: options.ip,
            signature: '',
        };
        const signature = this.generateSignature(payload);
        payload.signature = signature;
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const separator = baseContentUrl.includes('?') ? '&' : '?';
        return `${baseContentUrl}${separator}token=${encodedPayload}`;
    }
    validateSignedUrlToken(token, requestIp) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const payload = JSON.parse(decoded);
            if (Date.now() > payload.expiresAt) {
                throw new common_1.ForbiddenException('Signed URL has expired');
            }
            if (payload.ip && requestIp && payload.ip !== requestIp) {
                this.logger.warn(`IP mismatch for signed URL: expected ${payload.ip}, got ${requestIp}`);
                throw new common_1.ForbiddenException('IP address mismatch');
            }
            const expectedSignature = this.generateSignature({
                ...payload,
                signature: '',
            });
            if (payload.signature !== expectedSignature) {
                throw new common_1.ForbiddenException('Invalid signature');
            }
            return payload;
        }
        catch (error) {
            this.logger.error('Failed to validate signed URL token:', error);
            throw new common_1.BadRequestException('Invalid token format');
        }
    }
    generateSignature(payload) {
        const { signature, ...payloadToSign } = payload;
        const payloadString = JSON.stringify(payloadToSign, Object.keys(payloadToSign).sort());
        return (0, crypto_1.createHmac)('sha256', this.signatureSecret)
            .update(payloadString)
            .digest('hex');
    }
    async validateContentAccess(userId, lessonId) {
        try {
            const lesson = await this.prisma.courseLesson.findUnique({
                where: { id: lessonId },
                include: { course: true },
            });
            if (!lesson) {
                return false;
            }
            if (lesson.is_free_preview) {
                return true;
            }
            const purchase = await this.prisma.coursePurchase.findUnique({
                where: {
                    user_id_course_id: { user_id: userId, course_id: lesson.course_id },
                },
            });
            return !!purchase;
        }
        catch (error) {
            this.logger.error('Failed to validate content access:', error);
            return false;
        }
    }
    async generateAccessToken(userId, lessonId) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson) {
            throw new common_1.BadRequestException('Lesson not found');
        }
        const hasAccess = await this.validateContentAccess(userId, lessonId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this content');
        }
        const payload = {
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
    async validateAccessToken(token, requestIp) {
        return this.validateSignedUrlToken(token, requestIp);
    }
    generateContentFingerprint(userId, lessonId) {
        const data = `${userId}:${lessonId}:${Date.now()}`;
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    generateEmbedToken(userId, lessonId, duration = 3600000) {
        const payload = {
            userId,
            lessonId,
            expiresAt: Date.now() + duration,
            type: 'embed',
        };
        const signature = this.generateSignature(payload);
        const tokenPayload = { ...payload, signature };
        return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    }
    validateEmbedToken(token) {
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
            });
            return payload.signature === expectedSignature;
        }
        catch {
            return false;
        }
    }
};
exports.ContentSecurityService = ContentSecurityService;
exports.ContentSecurityService = ContentSecurityService = ContentSecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], ContentSecurityService);
//# sourceMappingURL=content-security.service.js.map