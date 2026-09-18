import { IsString, IsNumber, IsOptional, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordProgressDto {
  @ApiProperty({ description: 'Purchase ID for the enrolled course' })
  @IsUUID()
  purchaseId: string;

  @ApiProperty({ description: 'Seconds watched so far', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  watchedSeconds: number;

  @ApiPropertyOptional({ description: 'Total video duration in seconds (client-reported fallback)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalSeconds?: number;
}

export class AddQuestionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  details: string;
}

export class AddAnswerDto {
  @ApiProperty()
  @IsString()
  answer: string;
}

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  code: string;
}

export class ToggleCompleteDto {
  @ApiPropertyOptional({ description: 'Optional purchaseId if already known' })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;
}
