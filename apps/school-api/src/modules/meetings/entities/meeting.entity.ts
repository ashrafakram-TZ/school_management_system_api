import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

export const MEETING_STATUSES = [
  'scheduled',
  'in_progress',
  'time_exceeded',
  'completed',
  'missed',
  'cancelled',
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_PARTIES = ['teacher', 'parent'] as const;
export type MeetingParty = (typeof MEETING_PARTIES)[number];

export const MEETING_END_REASONS = ['host_ended', 'empty'] as const;
export type MeetingEndReason = (typeof MEETING_END_REASONS)[number];

@Entity('meetings')
@Index('IDX_meetings_school_scheduled', ['school_id', 'scheduled_at'])
export class Meeting extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @Index()
  @Column({ type: 'int' })
  student_id: number;

  @Index()
  @Column({ type: 'int' })
  teacher_user_id: number;

  @Index()
  @Column({ type: 'int' })
  parent_user_id: number;

  @Column({ type: 'varchar', length: 10 })
  scheduled_by: MeetingParty;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  agenda: string | null;

  @Column({ type: 'timestamptz' })
  scheduled_at: Date;

  @Column({ type: 'smallint', default: 15 })
  duration_minutes: number;

  @Column({ type: 'timestamptz' })
  scheduled_end_at: Date;

  @Column({ type: 'smallint', default: 0 })
  extended_minutes: number;

  @Column({ type: 'timestamptz', nullable: true })
  extended_at: Date | null;

  @Column({ type: 'int', nullable: true })
  extended_by: number | null;

  @Column({ type: 'varchar', length: 15, default: 'scheduled' })
  status: MeetingStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  channel_name: string;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'int', nullable: true })
  ended_by: number | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  end_reason: MeetingEndReason | null;

  @Column({ type: 'int', nullable: true })
  cancelled_by: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancel_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminder_sent_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  end_reminder_sent_at: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  agora_kick_rule_id: string | null;
}
