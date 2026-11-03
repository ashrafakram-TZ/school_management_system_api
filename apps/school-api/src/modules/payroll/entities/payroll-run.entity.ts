import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';
import { money } from './money';

export const RUN_STATUSES = ['draft', 'finalized'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

@Entity('payroll_runs')
@Index('UQ_payroll_runs_school_month', ['school_id', 'month'], { unique: true, where: 'deleted_at IS NULL' })
export class PayrollRun extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: RunStatus;

  @Column({ type: 'smallint' })
  working_days: number;

  @Column({ type: 'int', default: 0 })
  staff_count: number;

  @Column(money())
  total_gross: number;

  @Column(money())
  total_deductions: number;

  @Column(money())
  total_net: number;

  @Column({ type: 'timestamptz', nullable: true })
  finalized_at: Date | null;

  @Column({ type: 'int', nullable: true })
  finalized_by: number | null;
}
