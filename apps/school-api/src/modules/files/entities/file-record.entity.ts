import { TrackedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

export const SCAN_STATUSES = ['not_scanned', 'clean', 'infected'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

@Entity('files')
export class FileRecord extends TrackedEntity {
  @Index()
  @Column({ type: 'int', nullable: true })
  school_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnail_key: string | null;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'int' })
  size_bytes: number;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ type: 'varchar', length: 40, default: 'general' })
  purpose: string;

  @Column({ type: 'varchar', length: 15, default: 'not_scanned' })
  scan_status: ScanStatus;
}
