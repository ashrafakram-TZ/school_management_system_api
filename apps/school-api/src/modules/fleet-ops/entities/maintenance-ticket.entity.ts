import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';
import { decimal } from './decimal';

export const TICKET_SOURCES = ['obd', 'manual'] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'done'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_SEVERITIES = ['low', 'medium', 'high'] as const;
export type TicketSeverity = (typeof TICKET_SEVERITIES)[number];

@Entity('maintenance_tickets')
@Index('IDX_maintenance_tickets_school_status', ['school_id', 'status'])
@Index('IDX_maintenance_tickets_school_vehicle', ['school_id', 'vehicle_id'])
@Index('UQ_maintenance_tickets_fault', ['telematics_fault_id'], {
  unique: true,
  where: 'telematics_fault_id IS NOT NULL',
})
export class MaintenanceTicket extends SchoolScopedEntity {
  @Column({ type: 'int' })
  vehicle_id: number;

  @Column({ type: 'varchar', length: 10 })
  source: TicketSource;

  @Column({ type: 'varchar', length: 5, nullable: true })
  fault_code: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  severity: TicketSeverity | null;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 12, default: 'open' })
  status: TicketStatus;

  @Column({ type: 'timestamptz' })
  opened_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  @Column(decimal(12, 2))
  cost: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vendor: string | null;

  @Column(decimal(10, 1))
  odometer_km: number | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  telematics_fault_id: number | null;
}
