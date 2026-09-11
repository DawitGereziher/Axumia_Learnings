import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHelpRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  subject_area: string;

  @Type(() => Number)
  @IsNumber()
  budget_max_per_hour: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimated_hours?: number;

  @IsString()
  @IsNotEmpty()
  deadline: string;
}
