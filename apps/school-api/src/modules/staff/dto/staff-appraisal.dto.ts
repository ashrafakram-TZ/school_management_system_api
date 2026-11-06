import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '@app/common';
import {
  APPRAISAL_RECOMMENDATIONS,
  APPRAISAL_STATUSES,
  AppraisalRecommendation,
  AppraisalStatus,
  OVERALL_RATINGS,
  OverallRating,
} from '../entities/staff-appraisal.entity';
import { PersonNameDto } from '../../student-records/dto/records.dto';

export class StaffAppraisalDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2 })
  academic_year_id: number;

  @ApiProperty({ example: 99 })
  staff_id: number;

  @ApiProperty({ example: 229 })
  user_id: number;

  @ApiProperty({ type: PersonNameDto })
  staff: PersonNameDto;

  @ApiProperty({ example: 'TZMS-EMP-0084' })
  employee_no: string;

  @ApiProperty({ example: 'BT Assistant' })
  designation: string;

  @ApiProperty({ example: 'Mathematics', nullable: true })
  department: string | null;

  @ApiProperty({ type: PersonNameDto })
  reviewer: PersonNameDto;

  @ApiProperty({ example: '2026-27 Annual Review' })
  period: string;

  @ApiProperty({ example: '2026-10-25' })
  review_date: string;

  @ApiProperty({ enum: APPRAISAL_STATUSES, example: 'finalized' })
  status: AppraisalStatus;

  @ApiProperty({ example: 4.8 })
  teaching_effectiveness: number;

  @ApiProperty({ example: 4.6 })
  student_outcomes: number;

  @ApiProperty({ example: 4.5 })
  classroom_management: number;

  @ApiProperty({ example: 4.9 })
  professional_conduct: number;

  @ApiProperty({ example: 4.2 })
  extracurricular_contribution: number;

  @ApiProperty({ example: 4.6 })
  overall_score: number;

  @ApiProperty({ enum: OVERALL_RATINGS, example: 'outstanding' })
  overall_rating: OverallRating;

  @ApiProperty({ example: 'Exceptional subject knowledge and interactive teaching methods.', nullable: true })
  strengths: string | null;

  @ApiProperty({ example: 'Can incorporate more multimedia digital tools in lesson delivery.', nullable: true })
  areas_for_improvement: string | null;

  @ApiProperty({ example: 'Publish department math question bank and conduct remedial workshops.', nullable: true })
  goals_next_period: string | null;

  @ApiProperty({ example: 'Consistently high student pass rate and strong parent feedback.', nullable: true })
  reviewer_remarks: string | null;

  @ApiProperty({
    example: 'Thank you for the guidance. Will work towards integrating AI tools in classroom.',
    nullable: true,
  })
  staff_remarks: string | null;

  @ApiProperty({ enum: APPRAISAL_RECOMMENDATIONS, example: 'increment' })
  recommendation: AppraisalRecommendation;

  @ApiProperty({ example: 10.0 })
  increment_percent: number;

  @ApiProperty({ nullable: true })
  finalized_at: Date | null;

  @ApiProperty()
  created_at: Date;
}

export class StaffAppraisalInputDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  @Type(() => Number)
  academic_year_id: number;

  @ApiProperty({ example: 99 })
  @IsNumber()
  @Type(() => Number)
  staff_id: number;

  @ApiProperty({ example: '2026-27 Annual Review' })
  @IsString()
  period: string;

  @ApiProperty({ example: '2026-10-25' })
  @IsDateString()
  review_date: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  teaching_effectiveness: number;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  student_outcomes: number;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  classroom_management: number;

  @ApiProperty({ example: 4.8 })
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  professional_conduct: number;

  @ApiProperty({ example: 4.0 })
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  extracurricular_contribution: number;

  @ApiPropertyOptional({ example: 'Strong subject foundation and high student pass rate' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ example: 'Introduce more hands-on activities' })
  @IsOptional()
  @IsString()
  areas_for_improvement?: string;

  @ApiPropertyOptional({ example: 'Achieve 100% first class in board exams' })
  @IsOptional()
  @IsString()
  goals_next_period?: string;

  @ApiPropertyOptional({ example: 'Highly recommended for performance incentive' })
  @IsOptional()
  @IsString()
  reviewer_remarks?: string;

  @ApiPropertyOptional({ enum: APPRAISAL_RECOMMENDATIONS, example: 'increment' })
  @IsOptional()
  @IsEnum(APPRAISAL_RECOMMENDATIONS)
  recommendation?: AppraisalRecommendation;

  @ApiPropertyOptional({ example: 10.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(50.0)
  @Type(() => Number)
  increment_percent?: number;
}

export class StaffAppraisalCommentDto {
  @ApiProperty({ example: 'I acknowledge the feedback and will focus on interactive learning aids.' })
  @IsString()
  staff_remarks: string;
}

export class AppraisalQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  academic_year_id?: number;

  @ApiPropertyOptional({ enum: APPRAISAL_STATUSES })
  @IsOptional()
  @IsEnum(APPRAISAL_STATUSES)
  status?: AppraisalStatus;

  @ApiPropertyOptional({ enum: OVERALL_RATINGS })
  @IsOptional()
  @IsEnum(OVERALL_RATINGS)
  rating?: OverallRating;

  @ApiPropertyOptional({ example: 99 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  staff_id?: number;
}
