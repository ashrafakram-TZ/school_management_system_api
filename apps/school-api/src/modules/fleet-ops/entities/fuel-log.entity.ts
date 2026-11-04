import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';
import { decimal } from './decimal';

@Entity('fuel_logs')
@Index('IDX_fuel_logs_school_vehicle_date', ['school_id', 'vehicle_id', 'filled_on'])
export class FuelLog extends SchoolScopedEntity {
  @Column({ type: 'int' })
  vehicle_id: number;

  @Column({ type: 'date' })
  filled_on: string;

  @Column(decimal(8, 2, false))
  litres: number;

  @Column(decimal(10, 2, false))
  amount: number;

  @Column(decimal(10, 1, false))
  odometer_km: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  station: string | null;

  @Column({ type: 'int', nullable: true })
  bill_file_id: number | null;

  @Column({ type: 'int', nullable: true })
  filled_by: number | null;
}
