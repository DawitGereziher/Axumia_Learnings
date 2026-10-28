import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetMeetingLinkDto {
  @ApiProperty({ description: 'Zoom or Google Meet URL' })
  @IsString()
  @IsNotEmpty()
  meetingLink: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Meeting link' })
  @IsOptional()
  @IsString()
  meeting_link?: string;

  @ApiPropertyOptional({ description: 'Meeting platform: zoom, google_meet' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Platform meeting ID' })
  @IsOptional()
  @IsString()
  platform_meeting_id?: string;
}

export class CompleteSessionDto {
  @ApiProperty({ description: 'Actual hours spent on the help session', example: 1.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  actualHours: number;
}

export class ConfirmSessionDto {
  @ApiProperty({ description: 'Whether student confirms completion', example: true })
  @Type(() => Boolean)
  @IsBoolean()
  confirmed: boolean;
}
