import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AcademicYear } from './academic-year.entity';
import { SchoolClass } from './school-class.entity';
import { Subject } from './subject.entity';

@Entity('class_subjects')
@Index('UQ_class_subjects_class_subject_year', ['class_id', 'subject_id', 'academic_year_id'], { unique: true })
export class ClassSubject {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  class_id: number;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  school_class?: SchoolClass;

  @Column({ type: 'int' })
  subject_id: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject?: Subject;

  @Column({ type: 'int' })
  academic_year_id: number;

  @ManyToOne(() => AcademicYear, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year?: AcademicYear;

  @Column({ type: 'smallint', default: 0 })
  periods_per_week: number;

  @Column({ type: 'boolean', default: false })
  is_optional: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
