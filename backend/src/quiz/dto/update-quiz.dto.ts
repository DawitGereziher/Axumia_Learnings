import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuizDto {
  @ApiPropertyOptional({ description: 'Quiz title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Quiz description or instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Passing score percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  pass_score?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes (null to clear)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  time_limit?: number | null;

  @ApiPropertyOptional({ description: 'Maximum allowed attempts (0 for unlimited)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_attempts?: number;

  @ApiPropertyOptional({ description: 'Block course progress until passed' })
  @IsOptional()
  @IsBoolean()
  is_gating?: boolean;
}
