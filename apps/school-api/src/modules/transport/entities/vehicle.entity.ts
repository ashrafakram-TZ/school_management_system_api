import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

export const VEHICLE_STATUSES = ['active', 'inactive'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

@Entity('vehicles')
@Index('UQ_vehicles_school_registration', ['school_id', 'registration_no'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('UQ_vehicles_device', ['device_id'], { unique: true, where: 'deleted_at IS NULL AND device_id IS NOT NULL' })
export class Vehicle extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 20 })
  registration_no: string;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  make_model: string | null;

  @Column({ type: 'smallint', default: 40 })
  capacity: number;

  @Column({ type: 'int', nullable: true })
  device_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  device_imei: string | null;

  @Column({ type: 'int', nullable: true })
  driver_user_id: number | null;

  @Column({ type: 'int', nullable: true })
  attendant_user_id: number | null;

  @Column({ type: 'date', nullable: true })
  insurance_expiry: string | null;

  @Column({ type: 'date', nullable: true })
  fitness_expiry: string | null;

  @Column({ type: 'date', nullable: true })
  puc_expiry: string | null;

  @Column({ type: 'date', nullable: true })
  permit_expiry: string | null;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: VehicleStatus;
}
