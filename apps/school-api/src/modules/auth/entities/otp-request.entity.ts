import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_requests')
@Index('IDX_otp_requests_mobile_created', ['mobile', 'created_at'])
export class OtpRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  mobile: string;

  @Column({ type: 'varchar', length: 64 })
  code_hash: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumed_at: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
