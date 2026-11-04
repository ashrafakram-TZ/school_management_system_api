import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('diary_recipients')
@Index('UQ_diary_recipients_entry_student', ['entry_id', 'student_id'], { unique: true })
export class DiaryRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index()
  @Column({ type: 'int' })
  entry_id: number;

  @Index()
  @Column({ type: 'int' })
  student_id: number;

  @Column({ type: 'timestamptz', nullable: true })
  seen_at: Date | null;

  @Column({ type: 'int', nullable: true })
  seen_by: number | null;
}
