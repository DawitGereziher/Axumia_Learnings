import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmittedAnswerDto {
  @ApiProperty({ description: 'ID of the question being answered' })
  @IsString()
  @IsNotEmpty()
  question_id: string;

  @ApiProperty({ description: 'Student response value' })
  @IsString()
  answer: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [SubmittedAnswerDto], description: 'List of answers submitted for the quiz' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers: SubmittedAnswerDto[];

  @ApiPropertyOptional({ description: 'Time taken in seconds to complete the attempt' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  time_taken?: number;
}
