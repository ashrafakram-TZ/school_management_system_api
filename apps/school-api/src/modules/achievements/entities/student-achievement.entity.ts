import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

export const ACHIEVEMENT_CATEGORIES = [
  'academic',
  'sports',
  'arts',
  'cultural',
  'competition',
  'leadership',
  'other',
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const ACHIEVEMENT_LEVELS = [
  'class',
  'school',
  'zone',
  'district',
  'state',
  'national',
  'international',
] as const;
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number];

@Entity('student_achievements')
@Index('IDX_student_achievements_student_date', ['student_id', 'achieved_on'])
export class StudentAchievement extends SchoolScopedEntity {
  @Column({ type: 'int' })
  student_id: number;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 15 })
  category: AchievementCategory;

  @Column({ type: 'varchar', length: 15, default: 'school' })
  level: AchievementLevel;

  @Column({ type: 'varchar', length: 30, nullable: true })
  position: string | null;

  @Column({ type: 'date' })
  achieved_on: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  file_id: number | null;

  @Column({ type: 'boolean', default: true })
  visible_to_parent: boolean;
}
