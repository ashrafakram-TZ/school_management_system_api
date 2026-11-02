import { TrackedEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Section } from '../../setup/entities/section.entity';
import { Subject } from '../../setup/entities/subject.entity';
import { User } from '../../users/entities/user.entity';

@Entity('teacher_assignments')
@Index('UQ_teacher_assignments_section_subject', ['section_id', 'subject_id'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class TeacherAssignment extends TrackedEntity {
  @Index()
  @Column({ type: 'int' })
  school_id: number;

  @Index()
  @Column({ type: 'int' })
  academic_year_id: number;

  @Column({ type: 'int' })
  section_id: number;

  @ManyToOne(() => Section, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'section_id' })
  section?: Section;

  @Column({ type: 'int' })
  subject_id: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject?: Subject;

  @Index()
  @Column({ type: 'int' })
  teacher_user_id: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_user_id' })
  teacher?: User;

  @Column({ type: 'smallint', default: 5 })
  periods_per_week: number;
}
