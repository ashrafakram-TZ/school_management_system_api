import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

export const ALERT_KINDS = [
  'sos',
  'overspeed',
  'harsh_braking',
  'idle',
  'route_deviation',
  'vehicle_fault',
  'other',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const ALERT_SOURCES = ['driver_app', 'telematics', 'system'] as const;
export type AlertSource = (typeof ALERT_SOURCES)[number];

export type AlertData = Record<string, string | number | boolean | null>;

export interface AlertPosition {
  lat: number;
  lng: number;
  speed_kmh: number | null;
}

@Entity('fleet_alerts')
@Index('IDX_fleet_alerts_school_status', ['school_id', 'status'])
@Index('IDX_fleet_alerts_school_raised', ['school_id', 'raised_at'])
@Index('UQ_fleet_alerts_source_ref', ['source', 'source_ref'], { unique: true, where: 'source_ref IS NOT NULL' })
export class FleetAlert extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: AlertKind;

  @Column({ type: 'varchar', length: 10 })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 15, default: 'open' })
  status: AlertStatus;

  @Column({ type: 'varchar', length: 12 })
  source: AlertSource;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source_ref: string | null;

  @Column({ type: 'int', nullable: true })
  trip_id: number | null;

  @Column({ type: 'int', nullable: true })
  vehicle_id: number | null;

  @Column({ type: 'int', nullable: true })
  route_id: number | null;

  @Column({ type: 'int', nullable: true })
  device_id: number | null;

  @Column({ type: 'int', nullable: true })
  raised_by: number | null;

  @Column({ type: 'varchar', length: 300 })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  position: AlertPosition | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  data: AlertData;

  @Column({ type: 'timestamptz' })
  raised_at: Date;

  @Column({ type: 'int', default: 0 })
  notified: number;

  @Column({ type: 'int', nullable: true })
  acknowledged_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledged_at: Date | null;

  @Column({ type: 'int', nullable: true })
  resolved_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resolution_note: string | null;
}
