import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ description: 'UUID of the lesson this quiz attaches to' })
  @IsUUID()
  @IsNotEmpty()
  lesson_id: string;

  @ApiProperty({ description: 'Quiz title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Quiz description or instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Passing score percentage (0-100)', default: 70 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  pass_score?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes (null or omit for unlimited)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  time_limit?: number | null;

  @ApiPropertyOptional({ description: 'Maximum allowed attempts (0 for unlimited)', default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_attempts?: number;

  @ApiPropertyOptional({ description: 'Block course progress until passed', default: true })
  @IsOptional()
  @IsBoolean()
  is_gating?: boolean;
}
