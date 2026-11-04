import { BaseEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';
import { MeetingParty } from './meeting.entity';

export const CALL_LOG_SOURCES = ['app', 'agora'] as const;
export type CallLogSource = (typeof CALL_LOG_SOURCES)[number];

@Entity('meeting_call_logs')
export class MeetingCallLog extends BaseEntity {
  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index()
  @Column({ type: 'int' })
  meeting_id: number;

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  party: MeetingParty;

  @Column({ type: 'varchar', length: 10 })
  platform: string;

  @Column({ type: 'varchar', length: 6, default: 'app' })
  source: CallLogSource;

  @Column({ type: 'timestamptz' })
  joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  left_at: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  leave_reason: string | null;

  @Column({ type: 'bigint', nullable: true })
  client_seq: string | null;
}
