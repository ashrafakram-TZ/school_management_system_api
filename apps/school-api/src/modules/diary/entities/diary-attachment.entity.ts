import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('diary_attachments')
@Index('UQ_diary_attachments_entry_file', ['entry_id', 'file_id'], { unique: true })
export class DiaryAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  entry_id: number;

  @Column({ type: 'int' })
  file_id: number;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;
}
