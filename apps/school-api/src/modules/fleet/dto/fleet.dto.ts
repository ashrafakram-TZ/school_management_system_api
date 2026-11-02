import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationDto } from '@app/common';

export const VEHICLE_STATES = ['moving', 'idle', 'parked', 'offline', 'no_data'] as const;
export type VehicleState = (typeof VEHICLE_STATES)[number];

export const VEHICLE_ALERTS = ['low_fuel', 'low_battery', 'harsh_driving'] as const;
export type VehicleAlert = (typeof VEHICLE_ALERTS)[number];

export class HarshCountsDto {
  @ApiProperty({ example: 2 })
  brake: number;

  @ApiProperty({ example: 1 })
  accel: number;

  @ApiProperty({ example: 0 })
  turn: number;
}

export class PositionDto {
  @ApiProperty({ example: 13.0878 })
  lat: number;

  @ApiProperty({ example: 80.2101 })
  lng: number;

  @ApiProperty({ example: 32.5, nullable: true, type: Number })
  speed: number | null;

  @ApiProperty({ example: 270, nullable: true, type: Number })
  heading: number | null;

  @ApiProperty({ example: true, nullable: true, type: Boolean })
  ignition: boolean | null;

  @ApiProperty({ example: '2026-11-02T08:15:00.000+05:30' })
  recorded_at: string;
}

export class VehicleStatusDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '860000000000001' })
  imei: string;

  @ApiProperty({ example: 'Bus 01' })
  name: string;

  @ApiProperty({ example: 'TN01AB1234', nullable: true, type: String })
  vehicle_no: string | null;

  @ApiProperty({ enum: VEHICLE_STATES })
  state: VehicleState;

  @ApiProperty()
  online: boolean;

  @ApiProperty({ nullable: true, type: String })
  last_seen_at: string | null;

  @ApiProperty({ example: 64, nullable: true, type: Number, description: 'Fuel %' })
  fuel: number | null;

  @ApiProperty({ example: 88, nullable: true, type: Number, description: 'Vehicle battery %' })
  battery: number | null;

  @ApiProperty({ example: 12.6, nullable: true, type: Number, description: 'Vehicle battery volts' })
  battery_voltage: number | null;

  @ApiProperty({ nullable: true, type: String, description: 'When it last moved, while idle or parked' })
  stopped_since: string | null;

  @ApiProperty({ type: HarshCountsDto, description: 'Harsh driving events since midnight' })
  harsh_today: HarshCountsDto;

  @ApiProperty({ enum: VEHICLE_ALERTS, isArray: true })
  alerts: VehicleAlert[];

  @ApiProperty({ type: PositionDto, nullable: true })
  position: PositionDto | null;
}

export class FleetLiveDto {
  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 2 })
  moving: number;

  @ApiProperty({ example: 1, description: 'Stopped with the engine on' })
  idle: number;

  @ApiProperty({ example: 0, description: 'Engine off' })
  parked: number;

  @ApiProperty({ example: 1 })
  offline: number;

  @ApiProperty({ example: 3 })
  harsh_events_today: number;

  @ApiProperty({ example: 1 })
  low_fuel: number;

  @ApiProperty({ type: [VehicleStatusDto] })
  vehicles: VehicleStatusDto[];
}

export class PositionHistoryDto extends PositionDto {
  @ApiProperty({ example: '1203' })
  id: string;

  @ApiProperty({ example: 64, nullable: true, type: Number })
  fuel: number | null;

  @ApiProperty({ example: 88, nullable: true, type: Number })
  battery: number | null;

  @ApiProperty({ enum: ['harsh_brake', 'harsh_accel', 'harsh_turn'], nullable: true })
  event: string | null;
}

export class PositionQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: '2026-11-02T07:00:00+05:30' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-02T09:00:00+05:30' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
