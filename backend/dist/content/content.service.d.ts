import { YouTubeService } from './youtube.service';
import { StorageService } from '../storage/storage.service';
export declare enum ContentType {
    VIDEO = "video",
    YOUTUBE = "youtube",
    PDF = "pdf",
    DOCUMENT = "document",
    AUDIO = "audio",
    TEXT = "text",
    QUIZ = "quiz",
    LINK = "link",
    EMBEDDED = "embedded"
}
export declare enum StorageType {
    S3 = "s3",
    YOUTUBE = "youtube",
    EXTERNAL = "external",
    EMBEDDED = "embedded"
}
export interface ContentProcessingResult {
    content_type: ContentType;
    storage_type: StorageType;
    video_key?: string;
    hls_key?: string;
    youtube_video_id?: string;
    external_url?: string;
    embed_code?: string;
    duration_s?: number;
    file_size?: number;
    file_name?: string;
    thumbnail_url?: string;
}
export interface YouTubeProcessingOptions {
    autoplay?: boolean;
    controls?: boolean;
    modestBranding?: boolean;
}
export declare class ContentService {
    private youtubeService;
    private storageService;
    private readonly logger;
    constructor(youtubeService: YouTubeService, storageService: StorageService);
    processContent(contentType: ContentType, data: any, options?: any): Promise<ContentProcessingResult>;
    private processYouTubeContent;
    private processDocumentContent;
    private processVideoContent;
    private processAudioContent;
    private processLinkContent;
    private processEmbeddedContent;
    private processTextContent;
    generateContentUrl(lesson: any, userId: string, options?: any): Promise<string>;
    generateThumbnailUrl(lesson: any): string;
    private isValidUrl;
    detectContentType(data: {
        file?: File;
        url?: string;
    }): ContentType;
}
