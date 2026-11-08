import { IsString, IsNotEmpty, IsIn, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AwardXPDto {
  @ApiProperty({
    description: 'What triggered this award',
    enum: [
      'lesson_complete',
      'quiz_passed',
      'quiz_perfect',
      'course_complete',
      'session_booked',
      'daily_checkin',
      'streak_bonus',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'lesson_complete',
    'quiz_passed',
    'quiz_perfect',
    'course_complete',
    'session_booked',
    'daily_checkin',
    'streak_bonus',
  ])
  reason:
    | 'lesson_complete'
    | 'quiz_passed'
    | 'quiz_perfect'
    | 'course_complete'
    | 'session_booked'
    | 'daily_checkin'
    | 'streak_bonus';

  @ApiPropertyOptional({
    description: 'Optional context metadata (lesson_id, quiz_id, etc.)',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    lesson_id?: string;
    course_id?: string;
    quiz_id?: string;
    booking_id?: string;
    score?: number;
    [key: string]: any;
  };
}
