import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const STAFF_ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'absent'] as const;
export type StaffAttendanceStatus = (typeof STAFF_ATTENDANCE_STATUSES)[number];

export const PUNCH_SOURCES = ['app', 'biometric', 'manual'] as const;
export type PunchSource = (typeof PUNCH_SOURCES)[number];

@Entity('staff_attendance')
@Index('UQ_staff_attendance_user_date', ['user_id', 'date'], { unique: true })
export class StaffAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'timestamptz', nullable: true })
  check_in_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  check_out_at: Date | null;

  @Column({ type: 'double precision', nullable: true })
  check_in_lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  check_in_lng: number | null;

  @Column({ type: 'int', nullable: true })
  check_in_distance_m: number | null;

  @Column({ type: 'int', nullable: true })
  check_out_distance_m: number | null;

  @Column({ type: 'varchar', length: 10, default: 'app' })
  source: PunchSource;

  @Column({ type: 'varchar', length: 10, default: 'present' })
  status: StaffAttendanceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @Column({ type: 'int', nullable: true })
  marked_by: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
