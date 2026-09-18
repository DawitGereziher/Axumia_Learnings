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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '../../content/content.service';

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsIn(Object.values(ContentType))
  content_type?: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  youtube_url?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration_s?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requires_progress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  section_id?: string;
}
