import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '@app/common';
import { IsDateOnly } from '../../../shared/dates';
import { FileDto } from '../../files/dto/file.dto';
import { BANNER_STATES, BannerState } from '../app-banners.logic';
import { BANNER_AUDIENCES, BannerAudience } from '../entities/app-banner.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const notNull = (_dto: object, value: unknown) => value !== null;

export class AppBannerInputDto {
  @ApiProperty({ example: 'Annual Sports Day · 21 Nov' })
  @Transform(trim)
  @IsString()
  @Length(3, 80, { message: 'Enter a title of 3 to 80 letters' })
  title: string;

  @ApiPropertyOptional({ example: 'Parents are welcome from 8 am at the main ground.', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(200)
  message?: string | null;

  @ApiPropertyOptional({
    example: 41,
    nullable: true,
    type: Number,
    description:
      'Optional image from POST /files (purpose app_banner). Wide images (about 3:1) look best. Without it the app shows a text banner',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  image_file_id?: number | null;

  @ApiPropertyOptional({ enum: BANNER_AUDIENCES, default: 'all', description: 'all, staff or parents' })
  @IsOptional()
  @IsIn(BANNER_AUDIENCES)
  audience?: BannerAudience;

  @IsDateOnly('2026-11-10')
  starts_on: string;

  @IsDateOnly('2026-11-21')
  ends_on: string;

  @ApiPropertyOptional({ example: 'https://tamilzorous.com/sports-day', nullable: true, type: String })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf(notNull)
  @IsUrl({ require_protocol: true }, { message: 'Enter a full link starting with https://' })
  @MaxLength(300)
  link_url?: string | null;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Lower shows first' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAppBannerDto extends PartialType(AppBannerInputDto) {}

export class AppBannerQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: BANNER_STATES })
  @IsOptional()
  @IsIn(BANNER_STATES)
  state?: BannerState;

  @ApiPropertyOptional({ enum: BANNER_AUDIENCES })
  @IsOptional()
  @IsIn(BANNER_AUDIENCES)
  audience?: BannerAudience;
}

export class AppBannerDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Annual Sports Day · 21 Nov' })
  title: string;

  @ApiProperty({ nullable: true, type: String })
  message: string | null;

  @ApiProperty({ type: FileDto, nullable: true, description: 'Image with a signed link (url and thumbnail_url)' })
  image: FileDto | null;

  @ApiProperty({ enum: BANNER_AUDIENCES })
  audience: BannerAudience;

  @ApiProperty({ example: '2026-11-10' })
  starts_on: string;

  @ApiProperty({ example: '2026-11-21' })
  ends_on: string;

  @ApiProperty({ nullable: true, type: String })
  link_url: string | null;

  @ApiProperty({ example: 0 })
  sort_order: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ enum: BANNER_STATES, description: 'live, scheduled, ended or paused, worked out from the dates' })
  state: BannerState;

  @ApiProperty()
  created_at: Date;
}

export class AppBannerInsightsDto {
  @ApiProperty({ example: 2 })
  live: number;

  @ApiProperty({ example: 1 })
  scheduled: number;

  @ApiProperty({ example: 4 })
  ended: number;

  @ApiProperty({ example: 0 })
  paused: number;
}
