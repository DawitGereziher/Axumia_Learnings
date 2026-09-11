import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { StorageService, StorageBucket } from './storage.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/** Allowed MIME types per bucket to prevent abuse */
const ALLOWED_PUBLIC_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_PRIVATE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * POST /storage/upload-url
   *
   * Returns a pre-signed PUT URL so the frontend can upload a file
   * directly to Cloudflare R2 without proxying through the server.
   *
   * Flow:
   *  1. Frontend calls this endpoint with { bucket, fileType, folder, fileName }
   *  2. Backend validates and returns { uploadUrl, key, publicUrl? }
   *  3. Frontend PUTs the file bytes directly to uploadUrl
   *  4. Frontend saves the returned `key` (or `publicUrl`) into the relevant record
   *     via the appropriate PATCH endpoint (e.g. PATCH /users/me, PATCH /courses/:id)
   */
  @Post('upload-url')
  @UseGuards(DAuthGuard)
  @ApiOperation({
    summary: 'Get a pre-signed R2 upload URL for direct browser-to-R2 upload',
    description: `
      bucket: 'public'  → for profile photos, thumbnails, cover images
      bucket: 'private' → for KYC docs, lesson PDFs, certificates
      
      Returns a pre-signed PUT URL valid for 10 minutes.
      After upload, use the returned 'key' to update the relevant record.
    `,
  })
  async getUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      bucket: StorageBucket;
      /** MIME type e.g. 'image/jpeg', 'application/pdf' */
      contentType: string;
      /**
       * Folder prefix for the object key.
       * E.g. 'thumbnail', 'profile', 'cover', 'kyc', 'pdf', 'certificate'
       */
      folder: 'thumbnail' | 'profile' | 'cover' | 'kyc' | 'pdf' | 'certificate' | 'resource' | 'material';
      /** Original file name (used in the key for traceability) */
      fileName: string;
    },
  ) {
    const { bucket, contentType, folder, fileName } = body;

    // Validate bucket value
    if (!['public', 'private'].includes(bucket)) {
      throw new BadRequestException('bucket must be "public" or "private"');
    }

    // Validate content type against allowed list
    const allowed = bucket === 'public' ? ALLOWED_PUBLIC_TYPES : ALLOWED_PRIVATE_TYPES;
    if (!allowed.includes(contentType)) {
      throw new BadRequestException(
        `contentType "${contentType}" is not allowed for the ${bucket} bucket. ` +
        `Allowed: ${allowed.join(', ')}`,
      );
    }

    // Sanitise filename — strip path traversal, keep extension
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

    // Build a unique key: folder/userId/timestamp-filename
    const key = `${folder}/${user.id}/${Date.now()}-${safeName}`;

    const uploadUrl = await this.storage.getUploadUrl(bucket, key, contentType);

    const response: Record<string, string> = { uploadUrl, key };

    // For public files, also return the final public URL so the frontend
    // can immediately set it on the record after upload
    if (bucket === 'public') {
      response.publicUrl = this.storage.getPublicUrl(key);
    }

    return response;
  }

  /**
   * POST /storage/upload
   * Direct server-side upload to R2 via multipart/form-data.
   * Completely circumvents browser-to-R2 CORS preflight restrictions!
   */
  @Post('upload')
  @UseGuards(DAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file directly via server to R2' })
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: any,
    @Body() body: { bucket?: StorageBucket; folder?: any; fileName?: string },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const bucket: StorageBucket = body.bucket === 'public' ? 'public' : 'private';
    const folder = body.folder || 'material';
    const originalName = body.fileName || file.originalname || 'document';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const key = `${folder}/${user.id}/${Date.now()}-${safeName}`;

    await this.storage.uploadBuffer(file.buffer, bucket, key, file.mimetype || 'application/octet-stream');

    const response: Record<string, any> = {
      key,
      fileName: originalName,
      fileSize: file.size,
    };

    if (bucket === 'public') {
      response.publicUrl = this.storage.getPublicUrl(key);
    }

    return response;
  }
}
