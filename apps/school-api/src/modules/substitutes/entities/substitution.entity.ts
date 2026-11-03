import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitutions')
@Index('UQ_substitutions_slot_date', ['slot_id', 'date'], { unique: true })
@Index('UQ_substitutions_teacher_period', ['substitute_user_id', 'date', 'period_no'], { unique: true })
export class Substitution {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int' })
  slot_id: number;

  @Column({ type: 'int' })
  section_id: number;

  @Column({ type: 'smallint' })
  period_no: number;

  @Column({ type: 'int' })
  subject_id: number;

  @Column({ type: 'int', nullable: true })
  absent_user_id: number | null;

  @Index()
  @Column({ type: 'int' })
  substitute_user_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  assigned_by: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
