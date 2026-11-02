import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SCAN_STATUSES, ScanStatus } from '../entities/file-record.entity';

export const UPLOAD_SCHEMA = {
  type: 'object',
  required: ['file'],
  properties: {
    file: { type: 'string', format: 'binary', description: 'Images (jpg, png, webp), PDF, Word, Excel or CSV' },
    purpose: { type: 'string', example: 'student_photo', description: 'What the file is for, in snake_case' },
  },
};

export class UploadFileDto {
  @ApiPropertyOptional({ example: 'student_photo', description: 'What the file is for, in snake_case' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z_]+$/, { message: 'purpose must be snake_case letters' })
  purpose?: string;
}

export class FileContentQueryDto {
  @ApiProperty({ enum: ['original', 'thumb'] })
  @IsIn(['original', 'thumb'])
  variant: 'original' | 'thumb';

  @ApiProperty({ example: 1793611200 })
  @IsInt()
  expires: number;

  @ApiProperty({ example: 'a3f1...' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  signature: string;
}

export class FileDto {
  @ApiProperty({ example: 31 })
  id: number;

  @ApiProperty({ example: 'kavin-photo.jpg' })
  name: string;

  @ApiProperty({ example: 'image/jpeg' })
  mime_type: string;

  @ApiProperty({ example: 182344 })
  size_bytes: number;

  @ApiProperty({ example: 1200, nullable: true, type: Number })
  width: number | null;

  @ApiProperty({ example: 1600, nullable: true, type: Number })
  height: number | null;

  @ApiProperty({ example: 'student_photo' })
  purpose: string;

  @ApiProperty({ enum: SCAN_STATUSES, example: 'not_scanned' })
  scan_status: ScanStatus;

  @ApiProperty({
    example: 'http://localhost:3000/api/v1/files/31/content?variant=original&expires=1793611200&signature=...',
    description: 'Signed link. Works without a token until url_expires_at.',
  })
  url: string;

  @ApiProperty({
    example: 'http://localhost:3000/api/v1/files/31/content?variant=thumb&expires=1793611200&signature=...',
    nullable: true,
    type: String,
    description: '320px preview for images',
  })
  thumbnail_url: string | null;

  @ApiProperty({ example: '2026-11-02T11:00:00.000+05:30' })
  url_expires_at: Date;

  @ApiProperty({ example: '2026-11-02T10:00:00.000+05:30' })
  created_at: Date;
}
