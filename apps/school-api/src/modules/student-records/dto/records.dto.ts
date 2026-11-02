import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsDateOnly } from '../../../shared/dates';
import { MOBILE_PATTERN, normalizeMobile } from '../../../shared/mobile';
import { VERIFICATION_STATUSES, VerificationStatus } from '../../../shared/verification';
import { FileDto } from '../../files/dto/file.dto';
import { BEHAVIOUR_CATEGORIES, BehaviourCategory } from '../entities/behaviour-note.entity';
import { STUDENT_DOCUMENT_TYPES, StudentDocumentType } from '../entities/student-document.entity';

const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const notNull = (_object: unknown, value: unknown) => value !== null;

export class StudentDocumentInputDto {
  @ApiProperty({ enum: STUDENT_DOCUMENT_TYPES, example: 'birth_certificate' })
  @IsIn(STUDENT_DOCUMENT_TYPES)
  type: StudentDocumentType;

  @ApiPropertyOptional({ example: 'Birth certificate', description: 'Defaults to the document type name' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  title?: string;

  @ApiProperty({ example: 31, description: 'Id from POST /files' })
  @Type(() => Number)
  @IsInt()
  file_id: number;

  @ApiPropertyOptional({ default: true, description: 'Parents see it in the Parent app' })
  @IsOptional()
  @IsBoolean()
  visible_to_parent?: boolean;
}

export class UpdateStudentDocumentDto extends PartialType(StudentDocumentInputDto) {}

export class HealthInputDto {
  @ApiPropertyOptional({ example: 132.5, nullable: true, type: Number })
  @IsOptional()
  @ValidateIf(notNull)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(30)
  @Max(250)
  height_cm?: number | null;

  @ApiPropertyOptional({ example: 28.4, nullable: true, type: Number })
  @IsOptional()
  @ValidateIf(notNull)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(5)
  @Max(200)
  weight_kg?: number | null;

  @ApiPropertyOptional({ example: 'Peanuts, dust', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(255)
  allergies?: string | null;

  @ApiPropertyOptional({ example: 'Mild asthma', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(255)
  conditions?: string | null;

  @ApiPropertyOptional({ example: 'Inhaler when needed', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(255)
  medications?: string | null;

  @ApiPropertyOptional({ example: '6/6', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(30)
  vision?: string | null;

  @ApiPropertyOptional({ example: 'Dr. Ramesh', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(120)
  doctor_name?: string | null;

  @ApiPropertyOptional({ example: '9841122334', nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : normalizeMobile(value)))
  @ValidateIf(notNull)
  @Matches(MOBILE_PATTERN, { message: 'doctor_mobile must be a valid 10-digit Indian mobile number' })
  doctor_mobile?: string | null;

  @ApiPropertyOptional({ example: 'Needs to sit near the front', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ValidateIf(notNull)
  @IsDateOnly('2026-07-15', true)
  last_checkup_on?: string | null;
}

export class VaccinationInputDto {
  @ApiProperty({ example: 'MMR' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  vaccine: string;

  @ApiPropertyOptional({ example: 'Booster', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(30)
  dose?: string | null;

  @ValidateIf(notNull)
  @IsDateOnly('2019-04-12', true)
  given_on?: string | null;

  @ValidateIf(notNull)
  @IsDateOnly('2027-04-12', true)
  due_on?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

export class UpdateVaccinationDto extends PartialType(VaccinationInputDto) {}

export class BehaviourInputDto {
  @ApiProperty({ enum: BEHAVIOUR_CATEGORIES, example: 'appreciation' })
  @IsIn(BEHAVIOUR_CATEGORIES)
  category: BehaviourCategory;

  @ApiProperty({ example: 'Helped a classmate with maths' })
  @Transform(trim)
  @IsString()
  @Length(3, 120)
  title: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(1000)
  details?: string | null;

  @ApiPropertyOptional({ example: 'Spoke to the parent', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(255)
  action_taken?: string | null;

  @IsDateOnly('2026-11-02', true)
  noted_on?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible_to_parent?: boolean;
}

export class UpdateBehaviourDto extends PartialType(BehaviourInputDto) {}

export class PersonNameDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Priya Venkatesh' })
  name: string;
}

export class StudentDocumentDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ enum: STUDENT_DOCUMENT_TYPES })
  type: StudentDocumentType;

  @ApiProperty({ example: 'Birth certificate' })
  title: string;

  @ApiProperty({ enum: VERIFICATION_STATUSES })
  status: VerificationStatus;

  @ApiProperty({ nullable: true, type: String })
  remarks: string | null;

  @ApiProperty()
  visible_to_parent: boolean;

  @ApiProperty({ type: PersonNameDto, nullable: true })
  verified_by: PersonNameDto | null;

  @ApiProperty({ nullable: true, type: Date })
  verified_at: Date | null;

  @ApiProperty({ type: FileDto, nullable: true })
  file: FileDto | null;

  @ApiProperty()
  created_at: Date;
}

export class VaccinationDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'MMR' })
  vaccine: string;

  @ApiProperty({ nullable: true, type: String })
  dose: string | null;

  @ApiProperty({ nullable: true, type: String, example: '2019-04-12' })
  given_on: string | null;

  @ApiProperty({ nullable: true, type: String, example: '2027-04-12' })
  due_on: string | null;

  @ApiProperty({ example: false, description: 'due_on is today or earlier and no given_on' })
  overdue: boolean;

  @ApiProperty({ nullable: true, type: String })
  notes: string | null;
}

export class HealthDto {
  @ApiProperty({ example: 'B+', nullable: true, type: String })
  blood_group: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 132.5 })
  height_cm: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 28.4 })
  weight_kg: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 16.2, description: 'Body mass index from height and weight' })
  bmi: number | null;

  @ApiProperty({ nullable: true, type: String })
  allergies: string | null;

  @ApiProperty({ nullable: true, type: String })
  conditions: string | null;

  @ApiProperty({ nullable: true, type: String })
  medications: string | null;

  @ApiProperty({ nullable: true, type: String })
  vision: string | null;

  @ApiProperty({ nullable: true, type: String })
  doctor_name: string | null;

  @ApiProperty({ nullable: true, type: String })
  doctor_mobile: string | null;

  @ApiProperty({ nullable: true, type: String })
  notes: string | null;

  @ApiProperty({ nullable: true, type: String })
  last_checkup_on: string | null;

  @ApiProperty({ nullable: true, type: Date })
  updated_at: Date | null;

  @ApiProperty({ type: [VaccinationDto] })
  vaccinations: VaccinationDto[];
}

export class BehaviourNoteDto {
  @ApiProperty({ example: 9 })
  id: number;

  @ApiProperty({ example: '2026-11-02' })
  noted_on: string;

  @ApiProperty({ enum: BEHAVIOUR_CATEGORIES })
  category: BehaviourCategory;

  @ApiProperty({ example: 'Helped a classmate with maths' })
  title: string;

  @ApiProperty({ nullable: true, type: String })
  details: string | null;

  @ApiProperty({ nullable: true, type: String })
  action_taken: string | null;

  @ApiProperty()
  visible_to_parent: boolean;

  @ApiProperty({ type: PersonNameDto, nullable: true })
  recorded_by: PersonNameDto | null;

  @ApiProperty()
  created_at: Date;
}

export class RecordCountsDto {
  @ApiProperty({ example: 4 })
  documents: number;

  @ApiProperty({ example: 1 })
  documents_pending: number;

  @ApiProperty({ example: 3 })
  behaviour_notes: number;

  @ApiProperty({ example: 1 })
  concerns: number;

  @ApiProperty({ example: 0 })
  vaccinations_overdue: number;
}
