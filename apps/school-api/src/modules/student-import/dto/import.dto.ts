import { toBoolean } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const IMPORT_MODES = ['validate', 'import'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_UPLOAD_SCHEMA = {
  type: 'object',
  required: ['file'],
  properties: {
    file: { type: 'string', format: 'binary', description: 'The filled template (.xlsx)' },
    mode: { type: 'string', enum: [...IMPORT_MODES], default: 'validate' },
    send_invites: { type: 'boolean', default: false, description: 'Send Parent app invites after import' },
  },
};

export class ImportOptionsDto {
  @ApiPropertyOptional({ enum: IMPORT_MODES, default: 'validate' })
  @IsOptional()
  @IsIn(IMPORT_MODES)
  mode?: ImportMode;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  send_invites?: boolean;
}

export class ImportFieldErrorDto {
  @ApiProperty({ example: 'father_mobile' })
  field: string;

  @ApiProperty({ example: 'Father mobile must be a valid 10-digit Indian mobile number' })
  message: string;
}

export const IMPORT_ROW_STATUSES = ['valid', 'error', 'created', 'failed'] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export class ImportRowDto {
  @ApiProperty({ example: 4, description: 'Row number in the sheet' })
  row: number;

  @ApiProperty({ enum: IMPORT_ROW_STATUSES })
  status: ImportRowStatus;

  @ApiProperty({ example: 'Kavin Narayanan' })
  name: string;

  @ApiProperty({ nullable: true, type: String, example: '6 - A' })
  class_section: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'TZMS-2026-0031' })
  admission_no: string | null;

  @ApiProperty({ type: [ImportFieldErrorDto] })
  errors: ImportFieldErrorDto[];
}

export class ImportReportDto {
  @ApiProperty({ enum: IMPORT_MODES })
  mode: ImportMode;

  @ApiProperty({ example: 42 })
  total_rows: number;

  @ApiProperty({ example: 40 })
  valid_rows: number;

  @ApiProperty({ example: 2 })
  error_rows: number;

  @ApiProperty({ example: 40, description: 'Students created (import mode only)' })
  created: number;

  @ApiProperty({ example: 0, description: 'Valid rows that failed while saving (import mode only)' })
  failed: number;

  @ApiProperty({ type: [ImportRowDto] })
  rows: ImportRowDto[];
}
