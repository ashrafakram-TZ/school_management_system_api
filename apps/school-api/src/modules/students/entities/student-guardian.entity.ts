import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Guardian } from './guardian.entity';
import { Student } from './student.entity';

export const RELATIONS = ['father', 'mother', 'guardian', 'grandparent', 'sibling', 'other'] as const;
export type Relation = (typeof RELATIONS)[number];

@Entity('student_guardians')
@Index('UQ_student_guardians_student_guardian', ['student_id', 'guardian_id'], { unique: true })
export class StudentGuardian {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  student_id: number;

  @ManyToOne(() => Student, (student) => student.guardian_links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Index()
  @Column({ type: 'int' })
  guardian_id: number;

  @ManyToOne(() => Guardian, (guardian) => guardian.student_links, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guardian_id' })
  guardian?: Guardian;

  @Column({ type: 'varchar', length: 12 })
  relation: Relation;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ type: 'boolean', default: true })
  can_pickup: boolean;

  @Column({ type: 'boolean', default: true })
  receives_alerts: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
