import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { ListQueryDto, toBoolean } from '@app/common';
import { IsDateOnly } from '../../../shared/dates';
import { FileDto } from '../../files/dto/file.dto';
import { RefDto } from '../../students/dto/student-response.dto';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  ACHIEVEMENT_RESULTS,
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
  EVENT_SCOPES,
  EventScope,
  PARTICIPATIONS,
  Participation,
  VENUE_TYPES,
  VenueType,
} from '../entities/student-achievement.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const notNull = (_dto: object, value: unknown) => value !== null;

export class AchievementInputDto {
  @ApiProperty({ example: 'Inter-school football tournament' })
  @Transform(trim)
  @IsString()
  @Length(3, 120)
  title: string;

  @ApiProperty({ enum: ACHIEVEMENT_CATEGORIES, example: 'sports' })
  @IsIn(ACHIEVEMENT_CATEGORIES)
  category: AchievementCategory;

  @ApiPropertyOptional({ enum: ACHIEVEMENT_LEVELS, default: 'school' })
  @IsOptional()
  @IsIn(ACHIEVEMENT_LEVELS)
  level?: AchievementLevel;

  @ApiPropertyOptional({
    enum: ACHIEVEMENT_RESULTS,
    default: 'participated',
    description: 'winner, runner_up, third_place, or participated (took part, no win)',
  })
  @IsOptional()
  @IsIn(ACHIEVEMENT_RESULTS)
  result?: AchievementResult;

  @ApiPropertyOptional({
    enum: EVENT_SCOPES,
    default: 'in_school',
    description:
      'sports_day, in_school, inter_school (against other schools) or out_of_school (outside clubs and bodies)',
  })
  @IsOptional()
  @IsIn(EVENT_SCOPES)
  event_scope?: EventScope;

  @ApiPropertyOptional({
    enum: VENUE_TYPES,
    nullable: true,
    description: 'indoor or outdoor. Needed when the category is sports.',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsIn(VENUE_TYPES)
  venue_type?: VenueType | null;

  @ApiPropertyOptional({ enum: PARTICIPATIONS, default: 'individual' })
  @IsOptional()
  @IsIn(PARTICIPATIONS)
  participation?: Participation;

  @ApiPropertyOptional({ example: 'School U-14 football team', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(80)
  team_name?: string | null;

  @ApiPropertyOptional({ example: '1st place', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(30)
  position?: string | null;

  @ApiPropertyOptional({
    example: 'Gold medal and ₹2,000',
    nullable: true,
    type: String,
    description: 'Prize received at the event',
  })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(120)
  prize_received?: string | null;

  @ApiPropertyOptional({
    example: 'Trophy at the annual day',
    nullable: true,
    type: String,
    description: 'Prize or reward given by the school',
  })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(120)
  school_reward?: string | null;

  @IsDateOnly('2026-10-24')
  achieved_on: string;

  @ApiPropertyOptional({ example: 'Scored the winning goal', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    example: 31,
    nullable: true,
    type: Number,
    description: 'Certificate or photo from POST /files',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  file_id?: number | null;

  @ApiPropertyOptional({ default: true, description: 'false keeps it for staff only' })
  @IsOptional()
  @IsBoolean()
  visible_to_parent?: boolean;
}

export class UpdateAchievementDto extends PartialType(AchievementInputDto) {}

export class AchievementDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Inter-school football tournament' })
  title: string;

  @ApiProperty({ enum: ACHIEVEMENT_CATEGORIES })
  category: AchievementCategory;

  @ApiProperty({ enum: ACHIEVEMENT_LEVELS })
  level: AchievementLevel;

  @ApiProperty({ enum: ACHIEVEMENT_RESULTS })
  result: AchievementResult;

  @ApiProperty({ enum: EVENT_SCOPES })
  event_scope: EventScope;

  @ApiProperty({ enum: VENUE_TYPES, nullable: true })
  venue_type: VenueType | null;

  @ApiProperty({ enum: PARTICIPATIONS })
  participation: Participation;

  @ApiProperty({ nullable: true, type: String })
  team_name: string | null;

  @ApiProperty({ nullable: true, type: String, example: '1st place' })
  position: string | null;

  @ApiProperty({ nullable: true, type: String })
  prize_received: string | null;

  @ApiProperty({ nullable: true, type: String })
  school_reward: string | null;

  @ApiProperty({ example: 20, description: 'Level points × result: winner 4, runner-up 3, third 2, took part 1' })
  points: number;

  @ApiProperty({ example: '2026-10-24' })
  achieved_on: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ type: FileDto, nullable: true, description: 'Certificate or photo with a signed link' })
  file: FileDto | null;

  @ApiProperty()
  visible_to_parent: boolean;

  @ApiProperty({ type: RefDto, nullable: true, description: 'Who added it' })
  added_by: RefDto | null;

  @ApiProperty()
  created_at: Date;
}

export class AchievementStudentDto extends RefDto {
  @ApiProperty({ example: 'TZMS-2026-0012' })
  admission_no: string;

  @ApiProperty({ nullable: true, type: String, example: '6 - A' })
  section: string | null;

  @ApiProperty({ nullable: true, type: Number })
  photo_file_id: number | null;
}

export class SchoolAchievementDto extends AchievementDto {
  @ApiProperty({ type: AchievementStudentDto })
  student: AchievementStudentDto;
}

const FILTER_CATEGORIES = [...ACHIEVEMENT_CATEGORIES, 'non_academic'] as const;
type CategoryFilter = (typeof FILTER_CATEGORIES)[number];

export class AchievementFilterDto {
  @ApiPropertyOptional({
    enum: FILTER_CATEGORIES,
    description: 'non_academic = everything except academic (sports, arts, cultural, competition, leadership, other)',
  })
  @IsOptional()
  @IsIn(FILTER_CATEGORIES)
  category?: CategoryFilter;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  class_id?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  section_id?: number;

  @IsDateOnly('2026-06-01', true)
  from?: string;

  @IsDateOnly('2027-04-30', true)
  to?: string;
}

export class AchievementListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: FILTER_CATEGORIES })
  @IsOptional()
  @IsIn(FILTER_CATEGORIES)
  category?: CategoryFilter;

  @ApiPropertyOptional({ enum: ACHIEVEMENT_LEVELS })
  @IsOptional()
  @IsIn(ACHIEVEMENT_LEVELS)
  level?: AchievementLevel;

  @ApiPropertyOptional({ enum: [...ACHIEVEMENT_RESULTS, 'podium'], description: 'podium = winner, runner-up or third' })
  @IsOptional()
  @IsIn([...ACHIEVEMENT_RESULTS, 'podium'])
  result?: AchievementResult | 'podium';

  @ApiPropertyOptional({ enum: EVENT_SCOPES })
  @IsOptional()
  @IsIn(EVENT_SCOPES)
  event_scope?: EventScope;

  @ApiPropertyOptional({ enum: VENUE_TYPES })
  @IsOptional()
  @IsIn(VENUE_TYPES)
  venue_type?: VenueType;

  @ApiPropertyOptional({ enum: PARTICIPATIONS })
  @IsOptional()
  @IsIn(PARTICIPATIONS)
  participation?: Participation;

  @ApiPropertyOptional({ description: 'Only inter-school and out-of-school events' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  outside_school?: boolean;

  @ApiPropertyOptional({ description: 'Only district, state, national or international' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  district_or_above?: boolean;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  class_id?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  section_id?: number;

  @IsDateOnly('2026-06-01', true)
  from?: string;

  @IsDateOnly('2027-04-30', true)
  to?: string;
}

export class LeaderboardQueryDto extends AchievementFilterDto {
  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LeaderboardRowDto {
  @ApiProperty({ example: 1, description: 'Equal points share a rank (1, 2, 2, 4)' })
  rank: number;

  @ApiProperty({ type: AchievementStudentDto })
  student: AchievementStudentDto;

  @ApiProperty({ example: 46 })
  points: number;

  @ApiProperty({ example: 5 })
  achievements: number;

  @ApiProperty({ example: 2 })
  wins: number;

  @ApiProperty({ example: 3, description: 'Winner, runner-up or third' })
  podiums: number;

  @ApiProperty({ example: 1, description: 'Inter-school and out-of-school events' })
  outside_events: number;

  @ApiProperty({ enum: ACHIEVEMENT_LEVELS, example: 'state', description: 'Highest level reached' })
  best_level: AchievementLevel;
}

export class LeaderboardDto {
  @ApiProperty({ example: '2026-06-01' })
  from: string;

  @ApiProperty({ example: '2027-04-30' })
  to: string;

  @ApiProperty({ type: [LeaderboardRowDto] })
  rows: LeaderboardRowDto[];
}

export class AchievementInsightsDto {
  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 18 })
  sports: number;

  @ApiProperty({ example: 11 })
  wins: number;

  @ApiProperty({ example: 6, description: 'Inter-school and out-of-school events' })
  outside_events: number;

  @ApiProperty({ example: 4, description: 'District, state, national or international' })
  district_or_above: number;

  @ApiProperty({ example: 25, description: 'Different students with at least one achievement' })
  students: number;
}
