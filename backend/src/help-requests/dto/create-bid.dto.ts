import { IsNumber, IsPositive, IsString, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBidDto {
  @ApiProperty({ description: 'Quoted rate in ETB per hour', example: 350 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quoted_rate?: number;

  /** Alias for quoted_rate */
  @ApiPropertyOptional({ description: 'Alias for quoted_rate', example: 350 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ description: 'Estimated hours needed for this request', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  estimated_hours?: number;

  /** Alias for estimated_hours */
  @ApiPropertyOptional({ description: 'Alias for estimated_hours', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  hours?: number;

  @ApiProperty({ description: 'Proposal message explaining how you will assist the student' })
  @IsOptional()
  @IsString()
  message?: string;

  /** Alias for message */
  @ApiPropertyOptional({ description: 'Alias for message' })
  @IsOptional()
  @IsString()
  proposal?: string;
}
