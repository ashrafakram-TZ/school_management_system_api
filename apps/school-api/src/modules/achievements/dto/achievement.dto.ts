import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { IsDateOnly } from '../../../shared/dates';
import { FileDto } from '../../files/dto/file.dto';
import { RefDto } from '../../students/dto/student-response.dto';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  AchievementCategory,
  AchievementLevel,
} from '../entities/student-achievement.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const notNull = (_dto: object, value: unknown) => value !== null;

export class AchievementInputDto {
  @ApiProperty({ example: 'District level chess championship' })
  @Transform(trim)
  @IsString()
  @Length(3, 120)
  title: string;

  @ApiProperty({ enum: ACHIEVEMENT_CATEGORIES, example: 'competition' })
  @IsIn(ACHIEVEMENT_CATEGORIES)
  category: AchievementCategory;

  @ApiPropertyOptional({ enum: ACHIEVEMENT_LEVELS, default: 'school' })
  @IsOptional()
  @IsIn(ACHIEVEMENT_LEVELS)
  level?: AchievementLevel;

  @ApiPropertyOptional({ example: '1st place', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(30)
  position?: string | null;

  @IsDateOnly('2026-10-24')
  achieved_on: string;

  @ApiPropertyOptional({ example: 'Won all 5 rounds', nullable: true, type: String })
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

  @ApiProperty({ example: 'District level chess championship' })
  title: string;

  @ApiProperty({ enum: ACHIEVEMENT_CATEGORIES })
  category: AchievementCategory;

  @ApiProperty({ enum: ACHIEVEMENT_LEVELS })
  level: AchievementLevel;

  @ApiProperty({ nullable: true, type: String, example: '1st place' })
  position: string | null;

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
