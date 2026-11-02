import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

@Entity('leave_types')
@Index('UQ_leave_types_school_code', ['school_id', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class LeaveType extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'smallint', default: 0 })
  days_per_year: number;

  @Column({ type: 'boolean', default: true })
  is_paid: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;
}
