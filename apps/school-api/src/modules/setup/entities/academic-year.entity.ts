import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Term } from './term.entity';

@Entity('academic_years')
@Index('UQ_academic_years_school_name', ['school_id', 'name'], { unique: true, where: 'deleted_at IS NULL' })
@Index('UQ_academic_years_school_current', ['school_id'], {
  unique: true,
  where: 'is_current = true AND deleted_at IS NULL',
})
export class AcademicYear extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 20 })
  name: string;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'boolean', default: false })
  is_current: boolean;

  @OneToMany(() => Term, (term) => term.academic_year)
  terms?: Term[];
}
