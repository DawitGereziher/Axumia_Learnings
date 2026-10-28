import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ description: 'The question prompt' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ enum: ['multiple_choice', 'true_false', 'text'] })
  @IsIn(['multiple_choice', 'true_false', 'text'])
  type: 'multiple_choice' | 'true_false' | 'text';

  @ApiPropertyOptional({ description: 'Options array for multiple_choice and true_false' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ description: 'Index string for MC/TF or expected text keyword for text' })
  @IsString()
  @IsNotEmpty()
  correct: string;

  @ApiPropertyOptional({ description: 'Explanation feedback shown after quiz submission' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Point value for this question', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;
}
