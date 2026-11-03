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
import { SchoolClass } from '../../setup/entities/school-class.entity';
import { Subject } from '../../setup/entities/subject.entity';
import { Exam } from './exam.entity';

export const DEFAULT_MAX_MARKS = 100;
export const DEFAULT_PASS_MARKS = 35;

@Entity('exam_subjects')
@Index('UQ_exam_subjects_exam_class_subject', ['exam_id', 'class_id', 'subject_id'], { unique: true })
export class ExamSubject {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  exam_id: number;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam?: Exam;

  @Column({ type: 'int' })
  class_id: number;

  @ManyToOne(() => SchoolClass, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  school_class?: SchoolClass;

  @Column({ type: 'int' })
  subject_id: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject?: Subject;

  @Column({ type: 'smallint', default: DEFAULT_MAX_MARKS })
  max_marks: number;

  @Column({ type: 'smallint', default: DEFAULT_PASS_MARKS })
  pass_marks: number;

  @Column({ type: 'date', nullable: true })
  exam_date: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
