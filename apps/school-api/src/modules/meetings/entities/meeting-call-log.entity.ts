import { BaseEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';
import { MeetingParty } from './meeting.entity';

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

  @Column({ type: 'timestamptz' })
  joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  left_at: Date | null;
}
