import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHelpRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  /** Alias for title / topic */
  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  subject_area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget_max_per_hour?: number;

  /** Alias for budget_max_per_hour */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimated_hours?: number;

  @IsOptional()
  @IsString()
  deadline?: string;
}

