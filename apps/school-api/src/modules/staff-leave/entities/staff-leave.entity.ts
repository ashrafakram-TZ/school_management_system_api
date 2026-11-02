import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { LeaveType } from './leave-type.entity';

export const STAFF_LEAVE_STATUSES = ['pending_hod', 'pending_principal', 'approved', 'rejected', 'cancelled'] as const;
export type StaffLeaveStatus = (typeof STAFF_LEAVE_STATUSES)[number];

@Entity('staff_leave_requests')
@Index('IDX_staff_leave_user_dates', ['user_id', 'from_date'])
export class StaffLeave extends SchoolScopedEntity {
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'int' })
  leave_type_id: number;

  @ManyToOne(() => LeaveType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leave_type_id' })
  leave_type?: LeaveType;

  @Column({ type: 'int' })
  academic_year_id: number;

  @Column({ type: 'date' })
  from_date: string;

  @Column({ type: 'date' })
  to_date: string;

  @Column({ type: 'boolean', default: false })
  half_day: boolean;

  @Column({ type: 'numeric', precision: 4, scale: 1 })
  days: string;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'varchar', length: 20 })
  status: StaffLeaveStatus;

  @Column({ type: 'int', nullable: true })
  hod_user_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  hod_decided_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hod_note: string | null;

  @Column({ type: 'int', nullable: true })
  principal_user_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  principal_decided_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  principal_note: string | null;
}
