import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('student_health')
export class StudentHealth {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index('UQ_student_health_student', { unique: true })
  @Column({ type: 'int' })
  student_id: number;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true })
  height_cm: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true })
  weight_kg: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  allergies: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  conditions: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  medications: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  vision: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  doctor_name: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  doctor_mobile: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  last_checkup_on: string | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
