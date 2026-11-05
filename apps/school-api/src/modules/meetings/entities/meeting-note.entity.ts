import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';
import { MeetingParty } from './meeting.entity';

@Entity('meeting_notes')
@Index('IDX_meeting_notes_meeting', ['meeting_id', 'created_at'])
export class MeetingNote extends SchoolScopedEntity {
  @Column({ type: 'int' })
  meeting_id: number;

  @Column({ type: 'int' })
  author_user_id: number;

  @Column({ type: 'varchar', length: 10 })
  author_party: MeetingParty;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'boolean', default: false })
  shared: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  shared_at: Date | null;
}
