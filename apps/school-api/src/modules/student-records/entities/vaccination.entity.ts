import { SchoolScopedEntity } from '@app/common';
import { Column, Entity, Index } from 'typeorm';

@Entity('student_vaccinations')
export class Vaccination extends SchoolScopedEntity {
  @Index()
  @Column({ type: 'int' })
  student_id: number;

  @Column({ type: 'varchar', length: 80 })
  vaccine: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  dose: string | null;

  @Column({ type: 'date', nullable: true })
  given_on: string | null;

  @Column({ type: 'date', nullable: true })
  due_on: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
