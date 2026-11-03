import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { IsDateOnly } from '../../../shared/dates';
import { RefDto } from '../../students/dto/student-response.dto';
import { SlotSubjectDto } from '../../timetable/dto/timetable.dto';
import { MERGE_GROUPS, MergeGroup } from '../entities/substitution-merge.entity';
import { COVER_KINDS, CoverKind } from '../entities/substitution.entity';

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

export const COMBINE_MODES = ['whole', 'split'] as const;
export type CombineMode = (typeof COMBINE_MODES)[number];

export class CombineClassDto {
  @IsDateOnly('2026-11-06')
  date: string;

  @ApiProperty({ example: 41, description: 'Period of the teacher who is away' })
  @IsInt()
  slot_id: number;

  @ApiProperty({
    enum: COMBINE_MODES,
    example: 'split',
    description: 'whole: the class sits with one section. split: boys go to one section, girls to another.',
  })
  @IsIn(COMBINE_MODES, { message: 'mode must be whole or split' })
  mode: CombineMode;

  @ApiPropertyOptional({ example: 12, description: 'Needed for whole: the section the class joins' })
  @ValidateIf((dto: CombineClassDto) => dto.mode === 'whole')
  @IsInt({ message: 'Choose the section the class joins' })
  section_id?: number;

  @ApiPropertyOptional({ example: 11, description: 'Needed for split: where the boys go' })
  @ValidateIf((dto: CombineClassDto) => dto.mode === 'split')
  @IsInt({ message: 'Choose the section for the boys' })
  boys_section_id?: number;

  @ApiPropertyOptional({
    example: 13,
    description: 'Needed for split: where the girls go (students marked other go with them)',
  })
  @ValidateIf((dto: CombineClassDto) => dto.mode === 'split')
  @IsInt({ message: 'Choose the section for the girls' })
  girls_section_id?: number;

  @ApiPropertyOptional({ example: 'Bring the English notebook', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_dto, value) => value !== null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class StudentGroupCountDto {
  @ApiProperty({ example: 32 })
  total: number;

  @ApiProperty({ example: 17 })
  boys: number;

  @ApiProperty({ example: 15, description: 'Girls, plus students marked other' })
  girls: number;
}

export class CombinedIntoDto {
  @ApiProperty({ type: RefDto, description: 'Section the students sit with' })
  section: RefDto;

  @ApiProperty({ enum: MERGE_GROUPS, example: 'boys' })
  group: MergeGroup;

  @ApiProperty({ example: 17 })
  students: number;

  @ApiProperty({ type: RefDto, nullable: true, description: 'Teacher taking that section in this period' })
  teacher: RefDto | null;
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

  @ApiProperty({
    enum: COVER_KINDS,
    nullable: true,
    description: 'proxy: a teacher takes it. combine: students sit with other sections. null: not covered',
  })
  kind: CoverKind | null;

  @ApiProperty({ type: RefDto, nullable: true, description: 'Proxy teacher (kind proxy)' })
  substitute: RefDto | null;

  @ApiProperty({ type: [CombinedIntoDto], description: 'Where the students go (kind combine); empty otherwise' })
  combined_into: CombinedIntoDto[];

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

export class CombineTargetDto {
  @ApiProperty({ example: 52, description: 'That section’s period at the same time' })
  slot_id: number;

  @ApiProperty({ type: RefDto, example: { id: 12, name: '6 - B' } })
  section: RefDto;

  @ApiProperty({ type: SlotSubjectDto })
  subject: SlotSubjectDto;

  @ApiProperty({ type: RefDto, description: 'Teacher in that class: its own teacher, or its proxy' })
  teacher: RefDto;

  @ApiProperty({ nullable: true, type: String })
  room: string | null;

  @ApiProperty({ example: 31, description: 'Its own students' })
  students: number;

  @ApiProperty({ example: 0, description: 'Students already sent there from other combined classes' })
  joining: number;
}

export class CombineOptionsDto {
  @ApiProperty({ type: AbsentPeriodDto })
  period: AbsentPeriodDto;

  @ApiProperty({ type: StudentGroupCountDto, description: 'Students of the class that needs cover' })
  students: StudentGroupCountDto;

  @ApiProperty({
    type: [CombineTargetDto],
    description: 'Other sections of the same class with a teacher in that period. Empty when none is running.',
  })
  targets: CombineTargetDto[];
}
