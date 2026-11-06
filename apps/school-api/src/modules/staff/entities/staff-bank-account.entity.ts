import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Staff } from './staff.entity';

@Entity('staff_bank_accounts')
export class StaffBankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index()
  @Column({ type: 'int' })
  staff_id: number;

  @ManyToOne(() => Staff, (staff) => staff.bank_accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff?: Staff;

  @Column({ type: 'varchar', length: 120 })
  account_holder: string;

  @Column({ type: 'varchar', length: 80 })
  bank_name: string;

  @Column({ type: 'varchar', length: 11 })
  ifsc: string;

  @Column({ type: 'text', select: false })
  account_no_enc: string;

  @Column({ type: 'varchar', length: 4 })
  account_no_last4: string;

  @Column({ type: 'text', nullable: true, select: false })
  pan_enc: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  pan_last4: string | null;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

