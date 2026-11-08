import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'The question prompt' })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ enum: ['multiple_choice', 'true_false', 'text'] })
  @IsOptional()
  @IsIn(['multiple_choice', 'true_false', 'text'])
  type?: 'multiple_choice' | 'true_false' | 'text';

  @ApiPropertyOptional({ description: 'Options array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Index string for MC/TF or expected text' })
  @IsOptional()
  @IsString()
  correct?: string;

  @ApiPropertyOptional({ description: 'Explanation feedback' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Point value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;
}
