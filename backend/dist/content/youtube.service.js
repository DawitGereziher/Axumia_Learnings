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
var YouTubeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let YouTubeService = YouTubeService_1 = class YouTubeService {
    config;
    logger = new common_1.Logger(YouTubeService_1.name);
    encryptionKey;
    algorithm = 'aes-256-cbc';
    constructor(config) {
        this.config = config;
        const secret = this.config.get('YOUTUBE_ENCRYPTION_SECRET') || 'default-youtube-encryption-secret-change-in-production';
        const salt = this.config.get('YOUTUBE_ENCRYPTION_SALT') || 'default-salt-change-in-production';
        this.encryptionKey = (0, crypto_1.scryptSync)(secret, salt, 32);
    }
    extractVideoId(url) {
        if (!url)
            return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    encryptVideoId(videoId) {
        try {
            const iv = (0, crypto_1.randomBytes)(16);
            const cipher = (0, crypto_1.createCipheriv)(this.algorithm, this.encryptionKey, iv);
            let encrypted = cipher.update(videoId, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            this.logger.error('Failed to encrypt video ID:', error);
            throw new Error('Encryption failed');
        }
    }
    decryptVideoId(encryptedId) {
        try {
            const [ivHex, encrypted] = encryptedId.split(':');
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted format');
            }
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = (0, crypto_1.createDecipheriv)(this.algorithm, this.encryptionKey, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            this.logger.error('Failed to decrypt video ID:', error);
            throw new Error('Decryption failed');
        }
    }
    isValidYouTubeUrl(url) {
        return this.extractVideoId(url) !== null;
    }
    generateEmbedUrl(encryptedVideoId, options = {}) {
        try {
            const videoId = this.decryptVideoId(encryptedVideoId);
            const params = new URLSearchParams({
                autoplay: options.autoplay ? '1' : '0',
                controls: options.controls !== false ? '1' : '0',
                modestbranding: '1',
                rel: '0',
                iv_load_policy: '3',
                enablejsapi: '1',
                playsinline: '1',
            });
            return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        }
        catch (error) {
            this.logger.error('Failed to generate embed URL:', error);
            throw new Error('Embed URL generation failed');
        }
    }
    generateThumbnailUrl(encryptedVideoId, quality = 'high') {
        try {
            const videoId = this.decryptVideoId(encryptedVideoId);
            const qualityMap = {
                default: 'default',
                medium: 'mqdefault',
                high: 'hqdefault',
                maxres: 'maxresdefault',
            };
            return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
        }
        catch (error) {
            this.logger.error('Failed to generate thumbnail URL:', error);
            return '';
        }
    }
    processYouTubeUrl(url) {
        const videoId = this.extractVideoId(url);
        if (!videoId)
            return null;
        const encryptedId = this.encryptVideoId(videoId);
        return { videoId, encryptedId };
    }
};
exports.YouTubeService = YouTubeService;
exports.YouTubeService = YouTubeService = YouTubeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YouTubeService);
//# sourceMappingURL=youtube.service.js.map