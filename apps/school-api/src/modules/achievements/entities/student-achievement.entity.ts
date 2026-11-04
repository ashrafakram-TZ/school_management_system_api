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

export const ACHIEVEMENT_RESULTS = ['winner', 'runner_up', 'third_place', 'participated'] as const;
export type AchievementResult = (typeof ACHIEVEMENT_RESULTS)[number];

export const EVENT_SCOPES = ['sports_day', 'in_school', 'inter_school', 'out_of_school'] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const VENUE_TYPES = ['indoor', 'outdoor'] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const PARTICIPATIONS = ['individual', 'team'] as const;
export type Participation = (typeof PARTICIPATIONS)[number];

export const LEVEL_POINTS: Record<AchievementLevel, number> = {
  class: 1,
  school: 2,
  zone: 3,
  district: 5,
  state: 8,
  national: 12,
  international: 15,
};

export const RESULT_FACTORS: Record<AchievementResult, number> = {
  winner: 4,
  runner_up: 3,
  third_place: 2,
  participated: 1,
};

export const achievementPoints = (level: AchievementLevel, result: AchievementResult) =>
  LEVEL_POINTS[level] * RESULT_FACTORS[result];

@Entity('student_achievements')
@Index('IDX_student_achievements_student_date', ['student_id', 'achieved_on'])
@Index('IDX_student_achievements_school_category', ['school_id', 'category', 'achieved_on'])
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

  @Column({ type: 'varchar', length: 15, default: 'participated' })
  result: AchievementResult;

  @Column({ type: 'varchar', length: 15, default: 'in_school' })
  event_scope: EventScope;

  @Column({ type: 'varchar', length: 10, nullable: true })
  venue_type: VenueType | null;

  @Column({ type: 'varchar', length: 12, default: 'individual' })
  participation: Participation;

  @Column({ type: 'varchar', length: 80, nullable: true })
  team_name: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  prize_received: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  school_reward: string | null;

  @Column({ type: 'smallint', default: 0 })
  points: number;

  @Column({ type: 'date' })
  achieved_on: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  file_id: number | null;

  @Column({ type: 'boolean', default: true })
  visible_to_parent: boolean;
}
