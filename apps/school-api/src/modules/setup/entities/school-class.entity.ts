import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Section } from './section.entity';

@Entity('classes')
@Index('UQ_classes_school_name', ['school_id', 'name'], { unique: true, where: 'deleted_at IS NULL' })
export class SchoolClass extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 30 })
  name: string;

  @Column({ type: 'smallint' })
  grade_level: number;

  @OneToMany(() => Section, (section) => section.school_class)
  sections?: Section[];
}
