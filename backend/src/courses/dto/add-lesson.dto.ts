import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '../../content/content.service';

export class AddLessonDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;

  @ApiPropertyOptional({ enum: ContentType, default: ContentType.YOUTUBE })
  @IsOptional()
  @IsIn(Object.values(ContentType))
  content_type?: ContentType;

  @ApiPropertyOptional({ example: 'youtube' })
  @IsOptional()
  @IsString()
  storage_type?: string;

  @ApiPropertyOptional({ example: 'https://youtu.be/abc123' })
  @IsOptional()
  @IsString()
  youtube_url?: string;

  @ApiPropertyOptional({ description: 'S3 key for uploaded video' })
  @IsOptional()
  @IsString()
  video_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  external_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  embed_code?: string;

  @ApiPropertyOptional({ description: 'Section UUID to nest lesson under' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional({ description: 'Lesson duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration_s?: number;

  @ApiPropertyOptional({ description: 'If false, lesson completes immediately on open (for reading/text)' })
  @IsOptional()
  @IsBoolean()
  requires_progress?: boolean;
}
