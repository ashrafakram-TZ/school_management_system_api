import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';
import { money } from '../../payroll/entities/money';

export const INVOICE_STATUSES = ['unpaid', 'partly_paid', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

@Entity('fee_invoices')
@Index('UQ_fee_invoices_school_no', ['school_id', 'invoice_no'], { unique: true })
@Index('UQ_fee_invoices_student_installment', ['academic_year_id', 'student_id', 'installment'], {
  unique: true,
  where: "deleted_at IS NULL AND status <> 'cancelled'",
})
export class FeeInvoice extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @Index()
  @Column({ type: 'int' })
  student_id: number;

  @Index()
  @Column({ type: 'int' })
  class_id: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  section_id: number | null;

  @Column({ type: 'varchar', length: 30 })
  invoice_no: string;

  @Column({ type: 'varchar', length: 40 })
  installment: string;

  @Index()
  @Column({ type: 'date' })
  due_date: string;

  @Column(money())
  gross: number;

  @Column(money())
  discount: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  discount_reason: string | null;

  @Column(money())
  total: number;

  @Column(money())
  paid: number;

  @Column(money())
  balance: number;

  @Index()
  @Column({ type: 'varchar', length: 12, default: 'unpaid' })
  status: InvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'int', nullable: true })
  cancelled_by: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  cancel_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  overdue_alerted_at: Date | null;
}
