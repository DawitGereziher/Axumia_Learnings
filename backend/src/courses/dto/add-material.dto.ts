import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from '../../common/enums';

export class AddMaterialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaterialType })
  @IsIn(Object.values(MaterialType))
  material_type: MaterialType;

  @ApiPropertyOptional({ description: 'S3 key or external URL' })
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  file_size?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_downloadable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;
}
