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
var ContentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = exports.StorageType = exports.ContentType = void 0;
const common_1 = require("@nestjs/common");
const youtube_service_1 = require("./youtube.service");
const storage_service_1 = require("../storage/storage.service");
var ContentType;
(function (ContentType) {
    ContentType["VIDEO"] = "video";
    ContentType["YOUTUBE"] = "youtube";
    ContentType["PDF"] = "pdf";
    ContentType["DOCUMENT"] = "document";
    ContentType["AUDIO"] = "audio";
    ContentType["TEXT"] = "text";
    ContentType["QUIZ"] = "quiz";
    ContentType["LINK"] = "link";
    ContentType["EMBEDDED"] = "embedded";
})(ContentType || (exports.ContentType = ContentType = {}));
var StorageType;
(function (StorageType) {
    StorageType["S3"] = "s3";
    StorageType["YOUTUBE"] = "youtube";
    StorageType["EXTERNAL"] = "external";
    StorageType["EMBEDDED"] = "embedded";
})(StorageType || (exports.StorageType = StorageType = {}));
let ContentService = ContentService_1 = class ContentService {
    youtubeService;
    storageService;
    logger = new common_1.Logger(ContentService_1.name);
    constructor(youtubeService, storageService) {
        this.youtubeService = youtubeService;
        this.storageService = storageService;
    }
    async processContent(contentType, data, options = {}) {
        switch (contentType) {
            case ContentType.YOUTUBE:
                return this.processYouTubeContent(data, options);
            case ContentType.PDF:
            case ContentType.DOCUMENT:
                return this.processDocumentContent(data, options);
            case ContentType.VIDEO:
                return this.processVideoContent(data, options);
            case ContentType.AUDIO:
                return this.processAudioContent(data, options);
            case ContentType.LINK:
                return this.processLinkContent(data, options);
            case ContentType.EMBEDDED:
                return this.processEmbeddedContent(data, options);
            case ContentType.TEXT:
                return this.processTextContent(data, options);
            default:
                throw new common_1.BadRequestException(`Unsupported content type: ${contentType}`);
        }
    }
    async processYouTubeContent(data, options = {}) {
        if (!this.youtubeService.isValidYouTubeUrl(data.url)) {
            throw new common_1.BadRequestException('Invalid YouTube URL');
        }
        const processed = this.youtubeService.processYouTubeUrl(data.url);
        if (!processed) {
            throw new common_1.BadRequestException('Failed to process YouTube URL');
        }
        const thumbnailUrl = this.youtubeService.generateThumbnailUrl(processed.encryptedId);
        return {
            content_type: ContentType.YOUTUBE,
            storage_type: StorageType.YOUTUBE,
            youtube_video_id: processed.encryptedId,
            thumbnail_url: thumbnailUrl,
        };
    }
    async processDocumentContent(data, options = {}) {
        if (data.file) {
            const key = `documents/${Date.now()}-${data.file.name || 'document'}`;
            if (Buffer.isBuffer(data.file)) {
                await this.storageService.uploadBuffer(data.file, 'private', key);
            }
            return {
                content_type: ContentType.PDF,
                storage_type: StorageType.S3,
                external_url: key,
                file_size: data.file.size,
                file_name: data.file.name,
            };
        }
        else if (data.url) {
            return {
                content_type: ContentType.PDF,
                storage_type: StorageType.EXTERNAL,
                external_url: data.url,
            };
        }
        throw new common_1.BadRequestException('Either file or URL must be provided for document content');
    }
    async processVideoContent(data, options = {}) {
        if (data.file) {
            const key = `videos/${Date.now()}-${data.file.name || 'video'}`;
            if (Buffer.isBuffer(data.file)) {
                await this.storageService.uploadBuffer(data.file, 'private', key);
            }
            return {
                content_type: ContentType.VIDEO,
                storage_type: StorageType.S3,
                video_key: key,
                file_size: data.file.size,
                file_name: data.file.name,
            };
        }
        else if (data.key) {
            return {
                content_type: ContentType.VIDEO,
                storage_type: StorageType.S3,
                video_key: data.key,
            };
        }
        throw new common_1.BadRequestException('Either file or key must be provided for video content');
    }
    async processAudioContent(data, options = {}) {
        if (data.file) {
            const key = `audio/${Date.now()}-${data.file.name || 'audio'}`;
            if (Buffer.isBuffer(data.file)) {
                await this.storageService.uploadBuffer(data.file, 'private', key);
            }
            return {
                content_type: ContentType.AUDIO,
                storage_type: StorageType.S3,
                external_url: key,
                file_size: data.file.size,
                file_name: data.file.name,
            };
        }
        else if (data.url) {
            return {
                content_type: ContentType.AUDIO,
                storage_type: StorageType.EXTERNAL,
                external_url: data.url,
            };
        }
        throw new common_1.BadRequestException('Either file or URL must be provided for audio content');
    }
    async processLinkContent(data, options = {}) {
        if (!data.url || !this.isValidUrl(data.url)) {
            throw new common_1.BadRequestException('Invalid URL provided');
        }
        return {
            content_type: ContentType.LINK,
            storage_type: StorageType.EXTERNAL,
            external_url: data.url,
        };
    }
    async processEmbeddedContent(data, options = {}) {
        if (!data.embedCode) {
            throw new common_1.BadRequestException('Embed code is required');
        }
        return {
            content_type: ContentType.EMBEDDED,
            storage_type: StorageType.EMBEDDED,
            embed_code: data.embedCode,
        };
    }
    async processTextContent(data, options = {}) {
        if (!data.content) {
            throw new common_1.BadRequestException('Text content is required');
        }
        return {
            content_type: ContentType.TEXT,
            storage_type: StorageType.EXTERNAL,
            external_url: data.content,
        };
    }
    async generateContentUrl(lesson, userId, options = {}) {
        switch (lesson.content_type) {
            case ContentType.YOUTUBE:
                if (!lesson.youtube_video_id) {
                    throw new common_1.BadRequestException('YouTube video ID not found');
                }
                return this.youtubeService.generateEmbedUrl(lesson.youtube_video_id, options);
            case ContentType.VIDEO:
                if (!lesson.video_key) {
                    throw new common_1.BadRequestException('Video key not found');
                }
                return this.storageService.getSignedUrl(lesson.video_key);
            case ContentType.PDF:
            case ContentType.DOCUMENT:
            case ContentType.AUDIO:
                if (!lesson.external_url) {
                    throw new common_1.BadRequestException('Content URL not found');
                }
                if (lesson.storage_type === StorageType.S3) {
                    return this.storageService.getSignedUrl(lesson.external_url);
                }
                return lesson.external_url;
            case ContentType.LINK:
            case ContentType.TEXT:
                return lesson.external_url || '';
            case ContentType.EMBEDDED:
                return lesson.embed_code || '';
            default:
                throw new common_1.BadRequestException(`Unsupported content type: ${lesson.content_type}`);
        }
    }
    generateThumbnailUrl(lesson) {
        switch (lesson.content_type) {
            case ContentType.YOUTUBE:
                if (lesson.youtube_video_id) {
                    return this.youtubeService.generateThumbnailUrl(lesson.youtube_video_id);
                }
                break;
            case ContentType.VIDEO:
                break;
            default:
                break;
        }
        return '';
    }
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    detectContentType(data) {
        if (data.file) {
            const mimeType = data.file.type;
            if (mimeType.startsWith('video/'))
                return ContentType.VIDEO;
            if (mimeType.startsWith('audio/'))
                return ContentType.AUDIO;
            if (mimeType === 'application/pdf')
                return ContentType.PDF;
            if (mimeType.includes('document') || mimeType.includes('word'))
                return ContentType.DOCUMENT;
            return ContentType.DOCUMENT;
        }
        if (data.url) {
            if (this.youtubeService.isValidYouTubeUrl(data.url))
                return ContentType.YOUTUBE;
            if (data.url.match(/\.(pdf|doc|docx)$/i))
                return ContentType.PDF;
            if (data.url.match(/\.(mp3|wav|ogg)$/i))
                return ContentType.AUDIO;
            if (data.url.match(/\.(mp4|webm|mov)$/i))
                return ContentType.VIDEO;
            return ContentType.LINK;
        }
        return ContentType.TEXT;
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = ContentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [youtube_service_1.YouTubeService,
        storage_service_1.StorageService])
], ContentService);
//# sourceMappingURL=content.service.js.map