import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('number_sequences')
@Index('UQ_number_sequences_school_key', ['school_id', 'key'], { unique: true })
export class NumberSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'int', default: 0 })
  value: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
