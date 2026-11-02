import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '@app/common';
import { MOBILE_PATTERN, normalizeMobile } from '../../../shared/mobile';
import { SCHOOL_BOARDS, SchoolBoard } from '../entities/school.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class SchoolProfileDto {
  @ApiProperty({ example: 'Tamilzorous Model School' })
  @Transform(trim)
  @IsString()
  @Length(3, 150)
  name: string;

  @ApiPropertyOptional({ enum: SCHOOL_BOARDS, nullable: true })
  @IsOptional()
  @IsIn([...SCHOOL_BOARDS, null])
  board?: SchoolBoard | null;

  @ApiPropertyOptional({ example: '12, 2nd Avenue, Anna Nagar', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Chennai', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional({ example: 'Tamil Nadu', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(80)
  state?: string | null;

  @ApiPropertyOptional({ example: '600040', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\d{6}$/, { message: 'pincode must be 6 digits' })
  pincode?: string | null;

  @ApiPropertyOptional({ example: '04426201234', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\+?\d[\d\s-]{6,18}$/, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @ApiPropertyOptional({
    example: '04426201235',
    nullable: true,
    type: String,
    description: 'Shown to parents in SOS and emergency messages',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\+?\d[\d\s-]{6,18}$/, { message: 'emergency_phone must be a valid phone number' })
  emergency_phone?: string | null;

  @ApiPropertyOptional({ example: 'office@school.in', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_object, value) => value !== null)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string | null;

  @ApiPropertyOptional({ example: 13.0878, nullable: true, type: Number })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ example: 80.2101, nullable: true, type: Number })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 200,
    description: 'School gate geofence in metres, used for bus arrival and staff check-in',
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(2000)
  geofence_radius_m?: number;
}

export class CreateSchoolDto extends SchoolProfileDto {
  @ApiProperty({ example: 'TZMS', description: 'Short unique code, 2 to 20 letters or digits' })
  @Transform(upper)
  @Matches(/^[A-Z0-9]{2,20}$/, { message: 'code must be 2 to 20 letters or digits' })
  code: string;

  @ApiPropertyOptional({ example: 'Meena Raghavan', description: 'Creates the first school admin with this name' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  admin_name?: string;

  @ApiPropertyOptional({ example: '9876500001', description: 'Mobile of the first school admin' })
  @IsOptional()
  @Transform(({ value }) => normalizeMobile(value))
  @Matches(MOBILE_PATTERN, { message: 'admin_mobile must be a valid 10-digit Indian mobile number' })
  admin_mobile?: string;
}

export class UpdateSchoolDto extends PartialType(OmitType(CreateSchoolDto, ['admin_name', 'admin_mobile'] as const)) {
  @ApiPropertyOptional({ description: 'Switch a school off without deleting its data' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsIn([true, false])
  is_active?: boolean;
}

export class UpdateCurrentSchoolDto extends PartialType(SchoolProfileDto) {}

export class SchoolQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active flag' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsIn([true, false])
  is_active?: boolean;
}

export class SchoolDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Tamilzorous Model School' })
  name: string;

  @ApiProperty({ example: 'TZMS' })
  code: string;

  @ApiProperty({ enum: SCHOOL_BOARDS, nullable: true })
  board: SchoolBoard | null;

  @ApiProperty({ nullable: true, type: String })
  address: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Chennai' })
  city: string | null;

  @ApiProperty({ nullable: true, type: String })
  state: string | null;

  @ApiProperty({ nullable: true, type: String })
  pincode: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty({ nullable: true, type: String })
  emergency_phone: string | null;

  @ApiProperty({ nullable: true, type: String })
  email: string | null;

  @ApiProperty({ nullable: true, type: Number })
  latitude: number | null;

  @ApiProperty({ nullable: true, type: Number })
  longitude: number | null;

  @ApiProperty({ example: 200 })
  geofence_radius_m: number;

  @ApiProperty({ example: 'Asia/Kolkata' })
  timezone: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ example: 312 })
  student_count: number;

  @ApiProperty({ example: 48 })
  user_count: number;

  @ApiProperty()
  created_at: Date;
}
