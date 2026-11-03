import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { IsDateOnly } from '../../../shared/dates';
import { RefDto } from '../../students/dto/student-response.dto';
import { SlotSubjectDto } from '../../timetable/dto/timetable.dto';

const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class SubstituteDateQueryDto {
  @IsDateOnly('2026-11-06')
  date: string;
}

export class FreeTeachersQueryDto extends SubstituteDateQueryDto {
  @ApiProperty({ example: 41, description: 'Timetable period that needs cover' })
  @Type(() => Number)
  @IsInt()
  slot_id: number;
}

export class AssignSubstituteDto {
  @IsDateOnly('2026-11-06')
  date: string;

  @ApiProperty({ example: 41 })
  @IsInt()
  slot_id: number;

  @ApiProperty({ example: 9, description: 'Teacher who takes the class' })
  @IsInt()
  @Min(1)
  substitute_user_id: number;

  @ApiPropertyOptional({ example: 'Revise chapter 4', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_dto, value) => value !== null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class AbsentPeriodDto {
  @ApiProperty({ example: 41 })
  slot_id: number;

  @ApiProperty({ example: 3 })
  period_no: number;

  @ApiProperty({ example: '10:35' })
  start_time: string;

  @ApiProperty({ example: '11:20' })
  end_time: string;

  @ApiProperty({ type: RefDto, description: 'Section, for example 6 - A' })
  section: RefDto;

  @ApiProperty({ type: SlotSubjectDto })
  subject: SlotSubjectDto;

  @ApiProperty({ nullable: true, type: String })
  room: string | null;

  @ApiProperty({ nullable: true, type: Number, description: 'Set when a substitute is assigned' })
  substitution_id: number | null;

  @ApiProperty({ type: RefDto, nullable: true })
  substitute: RefDto | null;

  @ApiProperty({ nullable: true, type: String })
  note: string | null;
}

export class AbsentTeacherDto {
  @ApiProperty({ type: RefDto })
  teacher: RefDto;

  @ApiProperty({ example: 'Casual leave', description: 'Leave type name, or Absent when marked absent' })
  reason: string;

  @ApiProperty({ type: [AbsentPeriodDto] })
  periods: AbsentPeriodDto[];
}

export class SubstituteBoardDto {
  @ApiProperty({ example: '2026-11-06' })
  date: string;

  @ApiProperty({ example: 5, description: '1 Monday … 6 Saturday, 0 Sunday' })
  day_of_week: number;

  @ApiProperty()
  working_day: boolean;

  @ApiProperty({ nullable: true, type: String })
  holiday: string | null;

  @ApiProperty({ example: 2 })
  absent_teachers: number;

  @ApiProperty({ example: 9 })
  periods: number;

  @ApiProperty({ example: 6 })
  covered: number;

  @ApiProperty({ example: 3 })
  uncovered: number;

  @ApiProperty({ type: [AbsentTeacherDto] })
  teachers: AbsentTeacherDto[];
}

export class FreeTeacherDto {
  @ApiProperty({ type: RefDto })
  teacher: RefDto;

  @ApiProperty({ nullable: true, type: String })
  department: string | null;

  @ApiProperty({ example: 4, description: 'Timetable and substitute periods that day' })
  periods_today: number;

  @ApiProperty({ example: 2, description: 'Substitute periods already given this week' })
  substitutions_this_week: number;

  @ApiProperty({ description: 'Teaches the same subject somewhere' })
  same_subject: boolean;

  @ApiProperty({ description: 'Already teaches this section' })
  knows_section: boolean;
}

export class FreeTeachersDto {
  @ApiProperty({ type: AbsentPeriodDto })
  period: AbsentPeriodDto;

  @ApiProperty({ type: [FreeTeacherDto], description: 'Best match first' })
  teachers: FreeTeacherDto[];
}

export class AutoAssignResultDto {
  @ApiProperty({ example: 3 })
  assigned: number;

  @ApiProperty({ example: 1, description: 'Periods with no free teacher' })
  left_uncovered: number;

  @ApiProperty({ type: SubstituteBoardDto })
  board: SubstituteBoardDto;
}

export class MySubstitutionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: '2026-11-06' })
  date: string;

  @ApiProperty({ example: 3 })
  period_no: number;

  @ApiProperty({ example: '10:35' })
  start_time: string;

  @ApiProperty({ example: '11:20' })
  end_time: string;

  @ApiProperty({ type: RefDto })
  section: RefDto;

  @ApiProperty({ type: SlotSubjectDto })
  subject: SlotSubjectDto;

  @ApiProperty({ nullable: true, type: String })
  room: string | null;

  @ApiProperty({ type: RefDto, nullable: true, description: 'Teacher who is away' })
  absent_teacher: RefDto | null;

  @ApiProperty({ nullable: true, type: String })
  note: string | null;
}
