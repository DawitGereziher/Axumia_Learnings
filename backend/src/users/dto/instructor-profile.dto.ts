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

  @ApiPropertyOptional({ example: 'submitted' })
  @IsOptional()
  @IsString()
  kyc_status?: string;
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

  @ApiPropertyOptional({ example: 'submitted' })
  @IsOptional()
  @IsString()
  kyc_status?: string;
}

export class SubmitKycApplicationDto {
  @ApiPropertyOptional({ example: 'Abebe Bikila Kebede' })
  @IsString()
  legal_name: string;

  @ApiPropertyOptional({ example: '+251911234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: '1995-04-12' })
  @IsString()
  date_of_birth: string;

  @ApiPropertyOptional({ example: 'Ethiopia' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa, Bole Sub-City' })
  @IsOptional()
  @IsString()
  residential_address?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012', description: 'Ethiopian Fayda Access Number (FAN)' })
  @IsOptional()
  @IsString()
  fayda_fan_number?: string;

  @ApiPropertyOptional({ example: '0012345678', description: 'Ethiopian Taxpayer Identification Number' })
  @IsOptional()
  @IsString()
  tin_number?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'national_id' })
  @IsString()
  id_type: string; // national_id | passport | driving_license | kebele_id

  @ApiPropertyOptional({ example: 'ET-FIN-987654321' })
  @IsString()
  id_number: string;

  @ApiPropertyOptional({ example: '2028-12-31' })
  @IsOptional()
  @IsString()
  id_expiry?: string;

  @ApiPropertyOptional({ description: 'Storage key for front of ID' })
  @IsString()
  id_front_doc: string;

  @ApiPropertyOptional({ description: 'Storage key for back of ID' })
  @IsOptional()
  @IsString()
  id_back_doc?: string;

  @ApiPropertyOptional({ description: 'Storage key for selfie photo holding ID' })
  @IsString()
  selfie_doc: string;

  @ApiPropertyOptional({ description: 'Storage key for degree/certificate' })
  @IsOptional()
  @IsString()
  certificate_doc?: string;

  @ApiPropertyOptional({ example: 'MSc in Computer Science' })
  @IsOptional()
  @IsString()
  education_level?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa University' })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kyc_docs?: string[];
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
