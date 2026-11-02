import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';

@Entity('attendance_sessions')
@Index('UQ_attendance_sessions_section_date_period', ['section_id', 'date', 'period'], { unique: true })
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  academic_year_id: number;

  @Column({ type: 'int' })
  section_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'smallint', default: 0 })
  period: number;

  @Column({ type: 'int', nullable: true })
  subject_id: number | null;

  @Column({ type: 'int', nullable: true })
  taken_by: number | null;

  @OneToMany(() => AttendanceRecord, (record) => record.session)
  records?: AttendanceRecord[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
