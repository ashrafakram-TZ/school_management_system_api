import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AcademicYear } from './academic-year.entity';

@Entity('terms')
export class Term extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @ManyToOne(() => AcademicYear, (year) => year.terms, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year?: AcademicYear;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;
}
