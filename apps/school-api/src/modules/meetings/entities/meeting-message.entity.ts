import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';
import { MeetingParty } from './meeting.entity';

@Entity('meeting_messages')
@Index('IDX_meeting_messages_meeting', ['meeting_id', 'id'])
export class MeetingMessage extends SchoolScopedEntity {
  @Column({ type: 'int' })
  meeting_id: number;

  @Column({ type: 'int' })
  sender_user_id: number;

  @Column({ type: 'varchar', length: 10 })
  sender_party: MeetingParty;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  body: string | null;

  @Column({ type: 'int', nullable: true })
  file_id: number | null;
}
