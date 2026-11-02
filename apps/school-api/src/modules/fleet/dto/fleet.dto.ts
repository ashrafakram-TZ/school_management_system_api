import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationDto } from '@app/common';

export const VEHICLE_STATES = ['moving', 'idle', 'offline', 'no_data'] as const;
export type VehicleState = (typeof VEHICLE_STATES)[number];

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

  @ApiProperty({ example: 64, nullable: true, type: Number })
  fuel: number | null;

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

  @ApiProperty({ type: PositionDto, nullable: true })
  position: PositionDto | null;
}

export class FleetLiveDto {
  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 2 })
  moving: number;

  @ApiProperty({ example: 1 })
  idle: number;

  @ApiProperty({ example: 1 })
  offline: number;

  @ApiProperty({ type: [VehicleStatusDto] })
  vehicles: VehicleStatusDto[];
}

export class PositionHistoryDto extends PositionDto {
  @ApiProperty({ example: '1203' })
  id: string;
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
