import { ConfigService } from '@nestjs/config';
export declare class YouTubeService {
    private config;
    private readonly logger;
    private readonly encryptionKey;
    private readonly algorithm;
    constructor(config: ConfigService);
    extractVideoId(url: string): string | null;
    encryptVideoId(videoId: string): string;
    decryptVideoId(encryptedId: string): string;
    isValidYouTubeUrl(url: string): boolean;
    generateEmbedUrl(encryptedVideoId: string, options?: {
        autoplay?: boolean;
        controls?: boolean;
        modestBranding?: boolean;
        rel?: boolean;
    }): string;
    generateThumbnailUrl(encryptedVideoId: string, quality?: 'default' | 'medium' | 'high' | 'maxres'): string;
    processYouTubeUrl(url: string): {
        videoId: string;
        encryptedId: string;
    } | null;
}
