import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { ListQueryDto } from '@app/common';
import { ROLE_CATALOG } from '../../access/access.catalog';
import { APP_SECTIONS, AppSection } from '../../access/entities/role.entity';
import { IsMobile } from '../../../shared/mobile';
import { Language, LANGUAGES, USER_STATUSES, UserStatus } from '../entities/user.entity';

const ROLE_CODES = ROLE_CATALOG.map((role) => role.code);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class CreateUserDto {
  @ApiProperty({ example: 'Priya Sundaram' })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name: string;

  @IsMobile()
  mobile: string;

  @ApiPropertyOptional({ example: 'priya@school.in', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(150)
  email?: string | null;

  @ApiProperty({ enum: ROLE_CODES, isArray: true, example: ['TEACHER'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one role' })
  @ArrayMaxSize(10)
  @IsIn(ROLE_CODES, { each: true, message: 'role_codes contains an unknown role' })
  role_codes: string[];

  @ApiPropertyOptional({ enum: USER_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;

  @ApiPropertyOptional({ description: 'Super admin only. Others always create users in their own school.', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  school_id?: number;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['school_id'] as const)) {}

export class UserQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ROLE_CODES, description: 'Only users who have this role' })
  @IsOptional()
  @IsIn(ROLE_CODES)
  role?: string;

  @ApiPropertyOptional({ enum: APP_SECTIONS, description: 'Only users with a role in this app' })
  @IsOptional()
  @IsIn(APP_SECTIONS)
  app?: AppSection;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'true: never signed in' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsIn([true, false])
  never_signed_in?: boolean;

  @ApiPropertyOptional({ enum: LANGUAGES, description: 'Only users who get the app and messages in this language' })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;
}

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Priya Sundaram' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'priya@school.in', nullable: true, type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(150)
  email?: string | null;

  @ApiPropertyOptional({ enum: LANGUAGES, description: 'App text and notification language' })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;
}
