import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { YouTubeService } from './youtube.service';
import { StorageService } from '../storage/storage.service';

export enum ContentType {
  VIDEO = 'video',
  YOUTUBE = 'youtube',
  PDF = 'pdf',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  TEXT = 'text',
  QUIZ = 'quiz',
  LINK = 'link',
  EMBEDDED = 'embedded',
}

export enum StorageType {
  S3 = 's3',
  YOUTUBE = 'youtube',
  EXTERNAL = 'external',
  EMBEDDED = 'embedded',
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

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private youtubeService: YouTubeService,
    private storageService: StorageService,
  ) {}

  /** Proxy: check if a URL is a valid YouTube URL */
  isValidYouTubeUrl(url: string): boolean {
    return this.youtubeService.isValidYouTubeUrl(url);
  }

  /** Proxy: process a YouTube URL and return the encrypted video ID */
  processYouTubeUrl(url: string) {
    return this.youtubeService.processYouTubeUrl(url);
  }


  /**
   * Process content based on type and return unified result
   */
  async processContent(
    contentType: ContentType,
    data: any,
    options: any = {},
  ): Promise<ContentProcessingResult> {
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
        throw new BadRequestException(`Unsupported content type: ${contentType}`);
    }
  }

  /**
   * Process YouTube content
   */
  private async processYouTubeContent(
    data: { url: string },
    options: YouTubeProcessingOptions = {},
  ): Promise<ContentProcessingResult> {
    if (!this.youtubeService.isValidYouTubeUrl(data.url)) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    const processed = this.youtubeService.processYouTubeUrl(data.url);
    if (!processed) {
      throw new BadRequestException('Failed to process YouTube URL');
    }

    const thumbnailUrl = this.youtubeService.generateThumbnailUrl(processed.encryptedId);

    return {
      content_type: ContentType.YOUTUBE,
      storage_type: StorageType.YOUTUBE,
      youtube_video_id: processed.encryptedId,
      thumbnail_url: thumbnailUrl,
    };
  }

  /**
   * Process document content (PDF, Word, etc.)
   */
  private async processDocumentContent(
    data: { file?: any; url?: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
    if (data.file) {
      // Upload file to S3
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
    } else if (data.url) {
      // Use external URL
      return {
        content_type: ContentType.PDF,
        storage_type: StorageType.EXTERNAL,
        external_url: data.url,
      };
    }

    throw new BadRequestException('Either file or URL must be provided for document content');
  }

  /**
   * Process video content (S3 upload)
   */
  private async processVideoContent(
    data: { file?: any; key?: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
    if (data.file) {
      // Upload video to S3
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
    } else if (data.key) {
      // Use existing S3 key
      return {
        content_type: ContentType.VIDEO,
        storage_type: StorageType.S3,
        video_key: data.key,
      };
    }

    throw new BadRequestException('Either file or key must be provided for video content');
  }

  /**
   * Process audio content
   */
  private async processAudioContent(
    data: { file?: any; url?: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
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
    } else if (data.url) {
      return {
        content_type: ContentType.AUDIO,
        storage_type: StorageType.EXTERNAL,
        external_url: data.url,
      };
    }

    throw new BadRequestException('Either file or URL must be provided for audio content');
  }

  /**
   * Process link content
   */
  private async processLinkContent(
    data: { url: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
    if (!data.url || !this.isValidUrl(data.url)) {
      throw new BadRequestException('Invalid URL provided');
    }

    return {
      content_type: ContentType.LINK,
      storage_type: StorageType.EXTERNAL,
      external_url: data.url,
    };
  }

  /**
   * Process embedded content (Vimeo, etc.)
   */
  private async processEmbeddedContent(
    data: { embedCode: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
    if (!data.embedCode) {
      throw new BadRequestException('Embed code is required');
    }

    return {
      content_type: ContentType.EMBEDDED,
      storage_type: StorageType.EMBEDDED,
      embed_code: data.embedCode,
    };
  }

  /**
   * Process text content
   */
  private async processTextContent(
    data: { content: string },
    options: any = {},
  ): Promise<ContentProcessingResult> {
    if (!data.content) {
      throw new BadRequestException('Text content is required');
    }

    return {
      content_type: ContentType.TEXT,
      storage_type: StorageType.EXTERNAL,
      external_url: data.content, // Store text content in URL field for simplicity
    };
  }

  /**
   * Generate appropriate URL for content playback/access
   */
  async generateContentUrl(
    lesson: any,
    userId: string,
    options: any = {},
  ): Promise<string> {
    switch (lesson.content_type) {
      case ContentType.YOUTUBE:
        if (!lesson.youtube_video_id) {
          if (lesson.external_url) {
            const vId = this.youtubeService.extractVideoId(lesson.external_url);
            if (vId) {
              return `https://www.youtube.com/embed/${vId}?rel=0&modestbranding=1&enablejsapi=1`;
            }
            return lesson.external_url;
          }
          return '';
        }
        return this.youtubeService.generateEmbedUrl(lesson.youtube_video_id, options);
      
      case ContentType.VIDEO:
        if (!lesson.video_key) {
          if (lesson.external_url) return lesson.external_url;
          return '';
        }
        return this.storageService.getSignedUrl(lesson.video_key);
      
      case ContentType.PDF:
      case ContentType.DOCUMENT:
      case ContentType.AUDIO:
        if (!lesson.external_url) {
          return '';
        }
        if (lesson.storage_type === StorageType.S3 || (!lesson.external_url.startsWith('http://') && !lesson.external_url.startsWith('https://'))) {
          return this.storageService.getSignedUrl(lesson.external_url);
        }
        return lesson.external_url;
      
      case 'reading':
      case ContentType.LINK:
      case ContentType.TEXT:
        return lesson.external_url || '';
      
      case ContentType.EMBEDDED:
        return lesson.embed_code || '';
      
      default:
        return lesson.external_url || '';
    }
  }

  /**
   * Generate thumbnail URL for content
   */
  generateThumbnailUrl(lesson: any): string {
    switch (lesson.content_type) {
      case ContentType.YOUTUBE:
        if (lesson.youtube_video_id) {
          return this.youtubeService.generateThumbnailUrl(lesson.youtube_video_id);
        }
        break;
      
      case ContentType.VIDEO:
        // For S3 videos, you might want to implement thumbnail generation
        // This could be done during video processing
        break;
      
      default:
        break;
    }

    return '';
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get content type from file or URL
   */
  detectContentType(data: { file?: File; url?: string }): ContentType {
    if (data.file) {
      const mimeType = data.file.type;
      if (mimeType.startsWith('video/')) return ContentType.VIDEO;
      if (mimeType.startsWith('audio/')) return ContentType.AUDIO;
      if (mimeType === 'application/pdf') return ContentType.PDF;
      if (mimeType.includes('document') || mimeType.includes('word')) return ContentType.DOCUMENT;
      return ContentType.DOCUMENT;
    }

    if (data.url) {
      if (this.youtubeService.isValidYouTubeUrl(data.url)) return ContentType.YOUTUBE;
      if (data.url.match(/\.(pdf|doc|docx)$/i)) return ContentType.PDF;
      if (data.url.match(/\.(mp3|wav|ogg)$/i)) return ContentType.AUDIO;
      if (data.url.match(/\.(mp4|webm|mov)$/i)) return ContentType.VIDEO;
      return ContentType.LINK;
    }

    return ContentType.TEXT;
  }
}