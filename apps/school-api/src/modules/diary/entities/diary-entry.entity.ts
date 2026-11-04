import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

export const DIARY_TYPES = ['homework', 'remark', 'feedback', 'note'] as const;
export type DiaryType = (typeof DIARY_TYPES)[number];

export const DIARY_SCOPES = ['class', 'section', 'students'] as const;
export type DiaryScope = (typeof DIARY_SCOPES)[number];

export const DIARY_STATUSES = ['pending_review', 'published', 'rejected', 'hidden'] as const;
export type DiaryStatus = (typeof DIARY_STATUSES)[number];

@Entity('diary_entries')
@Index('IDX_diary_entries_school_year_status', ['school_id', 'academic_year_id', 'status'])
export class DiaryEntry extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @Column({ type: 'varchar', length: 10 })
  type: DiaryType;

  @Column({ type: 'varchar', length: 10 })
  scope: DiaryScope;

  @Column({ type: 'int', nullable: true })
  class_id: number | null;

  @Column({ type: 'int', nullable: true })
  section_id: number | null;

  @Column({ type: 'int', nullable: true })
  subject_id: number | null;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  body: string;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ type: 'varchar', length: 15 })
  status: DiaryStatus;

  @Column({ type: 'int', nullable: true })
  reviewed_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  review_note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ type: 'int', default: 0 })
  recipient_count: number;
}
