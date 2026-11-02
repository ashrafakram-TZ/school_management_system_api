import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

export const SUBJECT_TYPES = ['theory', 'practical', 'language', 'activity'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

@Entity('subjects')
@Index('UQ_subjects_school_code', ['school_id', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class Subject extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 12, default: 'theory' })
  type: SubjectType;
}
