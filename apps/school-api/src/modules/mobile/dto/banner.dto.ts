import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BANNER_SEVERITIES = ['critical', 'warning', 'info'] as const;
export type BannerSeverity = (typeof BANNER_SEVERITIES)[number];

export const BANNER_CODES = [
  'HOLIDAY_TODAY',
  'UPCOMING_HOLIDAY',
  'ON_LEAVE_TODAY',
  'CHECK_IN_PENDING',
  'ATTENDANCE_NOT_MARKED',
  'PROXY_TODAY',
  'COMBINED_CLASS_TODAY',
  'LEAVE_REQUESTS_PENDING',
  'STAFF_LEAVE_APPROVALS',
  'UNREAD_ALERTS',
  'SCHOOL_BANNER',
] as const;
export type BannerCode = (typeof BANNER_CODES)[number];

export const BANNER_SCREENS = [
  'home',
  'holidays',
  'check_in',
  'attendance',
  'timetable',
  'student_leaves',
  'staff_leave_approvals',
  'notifications',
  'link',
] as const;
export type BannerScreen = (typeof BANNER_SCREENS)[number];

export class BannerActionDto {
  @ApiProperty({
    enum: BANNER_SCREENS,
    example: 'attendance',
    description: 'Screen to open when the banner is tapped',
  })
  screen: BannerScreen;

  @ApiPropertyOptional({
    example: { section_id: 5 },
    description: 'Ids the screen needs, for example the section to mark',
    type: 'object',
    additionalProperties: true,
  })
  params?: Record<string, number | string>;
}

export class BannerDto {
  @ApiProperty({
    enum: BANNER_CODES,
    example: 'ATTENDANCE_NOT_MARKED',
    description: 'Stable code the app can switch on',
  })
  code: BannerCode;

  @ApiProperty({ enum: BANNER_SEVERITIES, example: 'warning', description: 'critical red, warning amber, info blue' })
  severity: BannerSeverity;

  @ApiProperty({ example: 'Attendance not marked' })
  title: string;

  @ApiProperty({ example: '3 - A has no attendance for today yet.' })
  message: string;

  @ApiPropertyOptional({ example: 2, description: 'Count shown as a badge, when the banner is about several items' })
  count?: number;

  @ApiProperty({ type: BannerActionDto })
  action: BannerActionDto;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'SCHOOL_BANNER only: signed image link (expires in about an hour; take it from a fresh call)',
  })
  image_url?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'Smaller version of the image, when available' })
  thumbnail_url?: string | null;
}

export class BannerListDto {
  @ApiProperty({ example: '2026-11-04' })
  date: string;

  @ApiProperty({
    type: [BannerDto],
    description: 'Most important first: critical, then warning, then info. Empty when all is well.',
  })
  banners: BannerDto[];
}
