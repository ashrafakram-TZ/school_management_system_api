import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { money } from './money';

@Entity('payslips')
@Index('UQ_payslips_run_user', ['run_id', 'user_id'], { unique: true })
export class Payslip {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index()
  @Column({ type: 'int' })
  run_id: number;

  @Index()
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 30 })
  employee_no: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 80 })
  designation: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  bank_name: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  bank_account_last4: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  pan_last4: string | null;

  @Column({ type: 'smallint' })
  working_days: number;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  lop_days: number;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  paid_days: number;

  @Column(money())
  basic: number;

  @Column(money())
  da: number;

  @Column(money())
  hra: number;

  @Column(money())
  conveyance: number;

  @Column(money())
  special_allowance: number;

  @Column(money())
  other_allowance: number;

  @Column(money())
  gross: number;

  @Column(money())
  pf: number;

  @Column(money())
  esi: number;

  @Column(money())
  professional_tax: number;

  @Column(money())
  tds: number;

  @Column(money())
  other_deduction: number;

  @Column(money())
  total_deductions: number;

  @Column(money())
  net: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
