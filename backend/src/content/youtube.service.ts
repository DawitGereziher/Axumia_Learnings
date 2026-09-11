import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-cbc';

  constructor(private config: ConfigService) {
    // Derive encryption key from config
    const secret = this.config.get('YOUTUBE_ENCRYPTION_SECRET') || 'default-youtube-encryption-secret-change-in-production';
    const salt = this.config.get('YOUTUBE_ENCRYPTION_SALT') || 'default-salt-change-in-production';
    this.encryptionKey = scryptSync(secret, salt, 32);
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  extractVideoId(url: string): string | null {
    if (!url) return null;

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

  /**
   * Encrypt YouTube video ID for secure storage
   */
  encryptVideoId(videoId: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
      let encrypted = cipher.update(videoId, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt video ID:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt YouTube video ID for use
   */
  decryptVideoId(encryptedId: string): string {
    try {
      const [ivHex, encrypted] = encryptedId.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt video ID:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Validate YouTube URL format
   */
  isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  /**
   * Generate secure embed URL for video player
   */
  generateEmbedUrl(encryptedVideoId: string, options: {
    autoplay?: boolean;
    controls?: boolean;
    modestBranding?: boolean;
    rel?: boolean;
  } = {}): string {
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
    } catch (error) {
      this.logger.error('Failed to generate embed URL:', error);
      throw new Error('Embed URL generation failed');
    }
  }

  /**
   * Generate thumbnail URL for video
   */
  generateThumbnailUrl(encryptedVideoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
    try {
      const videoId = this.decryptVideoId(encryptedVideoId);
      const qualityMap = {
        default: 'default',
        medium: 'mqdefault',
        high: 'hqdefault',
        maxres: 'maxresdefault',
      };
      return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
    } catch (error) {
      this.logger.error('Failed to generate thumbnail URL:', error);
      return '';
    }
  }

  /**
   * Extract video ID and encrypt in one step
   */
  processYouTubeUrl(url: string): { videoId: string; encryptedId: string } | null {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;

    const encryptedId = this.encryptVideoId(videoId);
    return { videoId, encryptedId };
  }
}