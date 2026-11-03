import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const BOARDING_ACTIONS = ['boarded', 'alighted'] as const;
export type BoardingAction = (typeof BOARDING_ACTIONS)[number];

@Entity('transport_boardings')
@Index('IDX_transport_boardings_trip_student', ['trip_id', 'student_id'])
export class TripBoarding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  school_id: number;

  @Column({ type: 'int' })
  trip_id: number;

  @Column({ type: 'int' })
  student_id: number;

  @Column({ type: 'int', nullable: true })
  stop_id: number | null;

  @Column({ type: 'varchar', length: 10 })
  action: BoardingAction;

  @Column({ type: 'varchar', length: 10, default: 'manual' })
  method: string;

  @Column({ type: 'int', nullable: true })
  recorded_by: number | null;

  @Column({ type: 'timestamptz' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
