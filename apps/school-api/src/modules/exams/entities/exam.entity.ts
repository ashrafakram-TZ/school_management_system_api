import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AcademicYear } from '../../setup/entities/academic-year.entity';
import { Term } from '../../setup/entities/term.entity';

export const EXAM_STATUSES = ['draft', 'published'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

@Entity('exams')
@Index('UQ_exams_year_name', ['school_id', 'academic_year_id', 'name'], { unique: true, where: 'deleted_at IS NULL' })
export class Exam extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @ManyToOne(() => AcademicYear, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year?: AcademicYear;

  @Column({ type: 'int', nullable: true })
  term_id: number | null;

  @ManyToOne(() => Term, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'term_id' })
  term?: Term | null;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: ExamStatus;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;
}
