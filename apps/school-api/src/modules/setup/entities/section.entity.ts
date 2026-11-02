import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AcademicYear } from './academic-year.entity';
import { SchoolClass } from './school-class.entity';

@Entity('sections')
@Index('UQ_sections_class_year_name', ['class_id', 'academic_year_id', 'name'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class Section extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  class_id: number;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.sections, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  school_class?: SchoolClass;

  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @ManyToOne(() => AcademicYear, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year?: AcademicYear;

  @Column({ type: 'varchar', length: 10 })
  name: string;

  @Column({ type: 'int', nullable: true })
  class_teacher_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'class_teacher_user_id' })
  class_teacher?: User | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  room: string | null;

  @Column({ type: 'smallint', default: 40 })
  capacity: number;
}
