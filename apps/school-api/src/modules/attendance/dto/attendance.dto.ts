import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '@app/common';
import { IsDateOnly } from '../../../shared/dates';
import { RefDto } from '../../students/dto/student-response.dto';
import { ATTENDANCE_STATUSES, AttendanceStatus } from '../entities/attendance-record.entity';
import { LEAVE_STATUSES, LeaveStatus } from '../entities/student-leave.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class RosterQueryDto {
  @IsDateOnly('2026-11-05')
  date: string;

  @ApiPropertyOptional({ example: 0, default: 0, description: '0 is the daily (morning) attendance; 1-12 are periods' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(12)
  period?: number;
}

export class MarkItemDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  student_id: number;

  @ApiProperty({ enum: ATTENDANCE_STATUSES, example: 'present' })
  @IsIn(ATTENDANCE_STATUSES)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Came at 9:20', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_dto, value) => value !== null)
  @IsString()
  @MaxLength(255)
  remarks?: string | null;
}

export class MarkAttendanceDto {
  @IsDateOnly('2026-11-05')
  date: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  period?: number;

  @ApiPropertyOptional({ example: 3, nullable: true, type: Number, description: 'Subject for period attendance' })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsInt()
  subject_id?: number | null;

  @ApiProperty({ type: [MarkItemDto], description: 'Every student of the section, once' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MarkItemDto)
  items: MarkItemDto[];
}

export class BoardQueryDto {
  @IsDateOnly('2026-11-05')
  date: string;
}

export class MonthQueryDto {
  @ApiProperty({ example: '2026-11' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must look like 2026-11' })
  month: string;
}

export class StudentLeaveInputDto {
  @IsDateOnly('2026-11-10')
  from_date: string;

  @IsDateOnly('2026-11-11')
  to_date: string;

  @ApiProperty({ example: 'Fever, doctor advised rest' })
  @Transform(trim)
  @IsString()
  @Length(3, 500)
  reason: string;

  @ApiPropertyOptional({ example: 31, nullable: true, type: Number, description: 'Medical note from POST /files' })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsInt()
  file_id?: number | null;
}

export class LeaveDecisionDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Please bring the medical note', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_dto, value) => value !== null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class StudentLeaveQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: LEAVE_STATUSES })
  @IsOptional()
  @IsIn(LEAVE_STATUSES)
  status?: LeaveStatus;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  section_id?: number;
}

export class RosterStudentDto {
  @ApiProperty({ example: 12 })
  student_id: number;

  @ApiProperty({ example: 'Kavin Narayanan' })
  full_name: string;

  @ApiProperty({ example: 'TZMS-2021-0001' })
  admission_no: string;

  @ApiProperty({ nullable: true, type: Number })
  roll_no: number | null;

  @ApiProperty({
    enum: ATTENDANCE_STATUSES,
    description: 'Saved status, or the default (present, or leave when approved)',
  })
  status: AttendanceStatus;

  @ApiProperty({ nullable: true, type: String })
  remarks: string | null;

  @ApiProperty({ description: 'Approved leave covers this date' })
  on_leave: boolean;
}

export class AttendanceSummaryDto {
  @ApiProperty({ example: 38 })
  total: number;

  @ApiProperty({ example: 35 })
  present: number;

  @ApiProperty({ example: 2 })
  absent: number;

  @ApiProperty({ example: 1 })
  late: number;

  @ApiProperty({ example: 0 })
  half_day: number;

  @ApiProperty({ example: 0 })
  leave: number;

  @ApiProperty({ example: 94.7, nullable: true, type: Number })
  percent: number | null;
}

export class RosterDto {
  @ApiProperty({ type: RefDto, description: 'Section with the class, for example 6 - A' })
  section: RefDto;

  @ApiProperty({ example: '2026-11-05' })
  date: string;

  @ApiProperty({ example: 0 })
  period: number;

  @ApiProperty({ description: 'False on Sundays and holidays' })
  working_day: boolean;

  @ApiProperty({ nullable: true, type: String, example: 'Deepavali' })
  holiday: string | null;

  @ApiProperty({ description: 'Attendance was already saved for this date and period' })
  marked: boolean;

  @ApiProperty({ type: RefDto, nullable: true })
  taken_by: RefDto | null;

  @ApiProperty({ nullable: true, type: Date })
  taken_at: Date | null;

  @ApiProperty({ type: AttendanceSummaryDto })
  summary: AttendanceSummaryDto;

  @ApiProperty({ type: [RosterStudentDto] })
  students: RosterStudentDto[];
}

export class BoardSectionDto extends AttendanceSummaryDto {
  @ApiProperty({ example: 12 })
  section_id: number;

  @ApiProperty({ example: '6 - A' })
  name: string;

  @ApiProperty({ nullable: true, type: String })
  class_teacher: string | null;

  @ApiProperty()
  marked: boolean;

  @ApiProperty({ nullable: true, type: String })
  taken_by: string | null;

  @ApiProperty({ nullable: true, type: Date })
  taken_at: Date | null;
}

export class AttendanceBoardDto {
  @ApiProperty({ example: '2026-11-05' })
  date: string;

  @ApiProperty()
  working_day: boolean;

  @ApiProperty({ nullable: true, type: String })
  holiday: string | null;

  @ApiProperty({ type: AttendanceSummaryDto, description: 'All marked sections together' })
  summary: AttendanceSummaryDto;

  @ApiProperty({ example: 17 })
  sections_total: number;

  @ApiProperty({ example: 3 })
  sections_not_marked: number;

  @ApiProperty({ example: 4, description: 'Students below 75% this month' })
  below_75: number;

  @ApiProperty({ example: 2, description: 'Student leave requests waiting' })
  leave_pending: number;

  @ApiProperty({ type: [BoardSectionDto] })
  sections: BoardSectionDto[];
}

export class AttendanceDayDto {
  @ApiProperty({ example: '2026-11-05' })
  date: string;

  @ApiProperty({ enum: [...ATTENDANCE_STATUSES, 'not_marked', 'holiday', 'weekly_off'] })
  status: AttendanceStatus | 'not_marked' | 'holiday' | 'weekly_off';
}

export class MonthlyAttendanceDto {
  @ApiProperty({ example: '2026-11' })
  month: string;

  @ApiProperty({ example: 18, description: 'School days so far this month' })
  working_days: number;

  @ApiProperty({ example: 17 })
  present: number;

  @ApiProperty({ example: 1 })
  absent: number;

  @ApiProperty({ example: 0 })
  late: number;

  @ApiProperty({ example: 0, description: 'Counts as half a day in percent' })
  half_day: number;

  @ApiProperty({ example: 0 })
  leave: number;

  @ApiProperty({ example: 94.4, nullable: true, type: Number })
  percent: number | null;

  @ApiProperty({ type: [AttendanceDayDto] })
  days: AttendanceDayDto[];
}

export class SectionReportRowDto {
  @ApiProperty({ example: 12 })
  student_id: number;

  @ApiProperty({ example: 'Kavin Narayanan' })
  full_name: string;

  @ApiProperty({ nullable: true, type: Number })
  roll_no: number | null;

  @ApiProperty({ example: 17 })
  present: number;

  @ApiProperty({ example: 1 })
  absent: number;

  @ApiProperty({ example: 0 })
  late: number;

  @ApiProperty({ example: 0, description: 'Counts as half a day in percent' })
  half_day: number;

  @ApiProperty({ example: 0 })
  leave: number;

  @ApiProperty({ example: 94.4, nullable: true, type: Number })
  percent: number | null;
}

export class SectionReportDto {
  @ApiProperty({ example: '2026-11' })
  month: string;

  @ApiProperty({ example: 18 })
  working_days: number;

  @ApiProperty({ example: 16, description: 'Days attendance was taken; percent is over these days' })
  marked_days: number;

  @ApiProperty({ type: [SectionReportRowDto] })
  students: SectionReportRowDto[];
}

export class StudentLeaveDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ type: RefDto })
  student: RefDto;

  @ApiProperty({ nullable: true, type: String, example: '6 - A' })
  class_section: string | null;

  @ApiProperty({ example: '2026-11-10' })
  from_date: string;

  @ApiProperty({ example: '2026-11-11' })
  to_date: string;

  @ApiProperty({ example: 2, description: 'School days covered' })
  days: number;

  @ApiProperty({ example: 'Fever' })
  reason: string;

  @ApiProperty({ nullable: true, type: Number })
  file_id: number | null;

  @ApiProperty({ enum: LEAVE_STATUSES })
  status: LeaveStatus;

  @ApiProperty({ type: RefDto, nullable: true })
  requested_by: RefDto | null;

  @ApiProperty({ type: RefDto, nullable: true })
  decided_by: RefDto | null;

  @ApiProperty({ nullable: true, type: Date })
  decided_at: Date | null;

  @ApiProperty({ nullable: true, type: String })
  decision_note: string | null;

  @ApiProperty()
  created_at: Date;
}
