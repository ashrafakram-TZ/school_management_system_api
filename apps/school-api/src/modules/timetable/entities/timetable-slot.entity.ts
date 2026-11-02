import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('timetable_slots')
@Index('UQ_timetable_section_slot', ['section_id', 'day_of_week', 'period_no'], { unique: true })
@Index('UQ_timetable_teacher_slot', ['academic_year_id', 'day_of_week', 'period_no', 'teacher_user_id'], {
  unique: true,
  where: 'teacher_user_id IS NOT NULL',
})
@Index('UQ_timetable_room_slot', ['school_id', 'academic_year_id', 'day_of_week', 'period_no', 'room'], {
  unique: true,
  where: 'room IS NOT NULL',
})
export class TimetableSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  academic_year_id: number;

  @Column({ type: 'int' })
  section_id: number;

  @Column({ type: 'smallint' })
  day_of_week: number;

  @Column({ type: 'smallint' })
  period_no: number;

  @Column({ type: 'int' })
  subject_id: number;

  @Column({ type: 'int', nullable: true })
  teacher_user_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  room: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
