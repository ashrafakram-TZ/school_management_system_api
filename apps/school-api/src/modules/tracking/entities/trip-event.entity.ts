import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TRIP_EVENT_TYPES = [
  'trip.started',
  'stop.approaching',
  'stop.arrived',
  'stop.departed',
  'trip.ended',
] as const;
export type TripEventType = (typeof TRIP_EVENT_TYPES)[number];

@Entity('transport_trip_events')
@Index('UQ_transport_trip_events_source', ['trip_id', 'source_event_id'], {
  unique: true,
  where: 'source_event_id IS NOT NULL',
})
export class TripEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  trip_id: number;

  @Column({ type: 'varchar', length: 30 })
  type: TripEventType;

  @Column({ type: 'int', nullable: true })
  stop_id: number | null;

  @Column({ type: 'int', nullable: true })
  eta_seconds: number | null;

  @Column({ type: 'timestamptz' })
  occurred_at: Date;

  @Column({ type: 'int', nullable: true })
  source_event_id: number | null;

  @Column({ type: 'int', default: 0 })
  notified: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
