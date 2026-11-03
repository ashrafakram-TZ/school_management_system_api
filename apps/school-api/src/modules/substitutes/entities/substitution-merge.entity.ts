import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Substitution } from './substitution.entity';

export const MERGE_GROUPS = ['all', 'boys', 'girls'] as const;
export type MergeGroup = (typeof MERGE_GROUPS)[number];

@Entity('substitution_merges')
@Index('IDX_substitution_merges_target', ['target_slot_id'])
export class SubstitutionMerge {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  substitution_id: number;

  @ManyToOne(() => Substitution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'substitution_id' })
  substitution?: Substitution;

  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  target_section_id: number;

  @Column({ type: 'int' })
  target_slot_id: number;

  @Column({ type: 'int', nullable: true })
  target_teacher_user_id: number | null;

  @Column({ type: 'varchar', length: 10 })
  student_group: MergeGroup;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
