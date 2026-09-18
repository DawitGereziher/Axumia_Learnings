import {
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsUrl,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitInstructorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 'Senior Python & Machine Learning Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiPropertyOptional({ example: 650 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hourly_rate?: number;

  @ApiPropertyOptional({ type: [String], example: ['https://r2.cdn/kyc/doc.pdf'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kyc_docs?: string[];
}

export class UpdateRichInstructorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hourly_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  cover_image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  profile_image?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  experience_years?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedin_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  twitter_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  youtube_url?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kyc_docs?: string[];

  // NOTE: kyc_status and is_active are intentionally excluded.
  // Only admins can change those fields via PATCH /users/admin/:userId/kyc
}

export class CreateInstructorReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  course_id?: string;
}

export class UpdateKycStatusDto {
  @IsString()
  status!: 'approved' | 'rejected';
}
