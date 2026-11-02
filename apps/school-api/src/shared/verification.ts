import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
import { Column } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export abstract class VerifiableDocument extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'int' })
  file_id: number;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: VerificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @Column({ type: 'int', nullable: true })
  verified_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;
}

export class VerifyDocumentDto {
  @ApiProperty({ enum: ['verified', 'rejected'], example: 'verified' })
  @IsIn(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiPropertyOptional({
    example: 'Name does not match the admission form',
    description: 'Required when rejecting',
    nullable: true,
    type: String,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf(
    (dto: VerifyDocumentDto) => dto.status === 'rejected' || (dto.remarks !== undefined && dto.remarks !== null),
  )
  @IsString({ message: 'Give a reason for rejecting this document' })
  @Length(1, 255, { message: 'Give a reason for rejecting this document, up to 255 characters' })
  remarks?: string | null;
}
