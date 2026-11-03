import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const EXPIRY_KINDS = ['insurance', 'fitness', 'puc', 'permit', 'licence'] as const;
export type ExpiryKind = (typeof EXPIRY_KINDS)[number];

@Entity('fleet_expiry_alerts')
@Index('UQ_fleet_expiry_alerts', ['kind', 'ref_id', 'expiry_date', 'threshold_days'], { unique: true })
export class ExpiryAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'varchar', length: 12 })
  kind: ExpiryKind;

  @Column({ type: 'int' })
  ref_id: number;

  @Column({ type: 'date' })
  expiry_date: string;

  @Column({ type: 'smallint' })
  threshold_days: number;

  @CreateDateColumn({ type: 'timestamptz' })
  sent_at: Date;
}
