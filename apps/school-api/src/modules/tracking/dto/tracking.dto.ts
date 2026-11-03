import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ListQueryDto } from '@app/common';
import { IsDateOnly } from '../../../shared/dates';
import { RefDto } from '../../students/dto/student-response.dto';
import { TRANSPORT_MODES, TransportMode } from '../../transport/entities/student-transport.entity';
import {
  STOP_STATUSES,
  StopStatus,
  TRIP_KINDS,
  TRIP_STATUSES,
  TripKind,
  TripStatus,
} from '../entities/transport-trip.entity';
import { TRIP_EVENT_TYPES, TripEventType } from '../entities/trip-event.entity';
import { CHILD_BUS_STATUSES, ChildBusStatus } from '../tracking.logic';

export class StartTripDto {
  @ApiProperty({ example: 1, description: 'A route run by your bus' })
  @IsInt()
  route_id: number;

  @ApiProperty({
    enum: TRIP_KINDS,
    example: 'pickup',
    description: 'pickup: stops to school (morning); drop: school to stops (evening)',
  })
  @IsIn(TRIP_KINDS)
  kind: TripKind;
}

export class PhonePositionDto {
  @ApiProperty({ example: 13.0849 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 80.2105 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: 28, description: 'km/h' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  speed?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({
    example: '2026-11-09T07:12:30+05:30',
    description: 'When the phone took the fix; defaults to now',
  })
  @IsOptional()
  @IsString()
  recorded_at?: string;
}

export class TripQueryDto extends ListQueryDto {
  @IsDateOnly('2026-11-09', true)
  date?: string;

  @ApiPropertyOptional({ enum: TRIP_STATUSES })
  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  route_id?: number;
}

export class TripPositionDto {
  @ApiProperty({ example: 13.0849 })
  lat: number;

  @ApiProperty({ example: 80.2105 })
  lng: number;

  @ApiProperty({ example: 28, nullable: true, type: Number })
  speed: number | null;

  @ApiProperty({ example: 90, nullable: true, type: Number })
  heading: number | null;

  @ApiProperty({ example: '2026-11-09T07:12:30.000+05:30' })
  recorded_at: string;

  @ApiProperty({
    example: 'device',
    nullable: true,
    type: String,
    description: 'device (GPS tracker) or phone (driver app fallback)',
  })
  source: string | null;
}

export class TripStopDto {
  @ApiProperty({ example: 4 })
  stop_id: number;

  @ApiProperty({ example: 'Anna Nagar Roundtana' })
  name: string;

  @ApiProperty({ example: 4 })
  sequence: number;

  @ApiProperty({ example: 13.0849 })
  lat: number;

  @ApiProperty({ example: 80.2105 })
  lng: number;

  @ApiProperty({ example: 120, description: 'Geofence radius in metres' })
  radius_m: number;

  @ApiProperty({ nullable: true, type: String, example: '07:28' })
  planned_time: string | null;

  @ApiProperty({ enum: STOP_STATUSES })
  status: StopStatus;

  @ApiProperty({ nullable: true, type: Number, example: 240, description: 'Seconds until the bus reaches this stop' })
  eta_seconds: number | null;

  @ApiProperty({ nullable: true, type: String })
  approached_at: string | null;

  @ApiProperty({ nullable: true, type: String })
  arrived_at: string | null;

  @ApiProperty({ nullable: true, type: String })
  departed_at: string | null;

  @ApiProperty({ example: 4, description: 'Students who board or get down here on this trip' })
  riders: number;
}

export class TripVehicleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'TN 09 AB 1234' })
  registration_no: string;

  @ApiProperty({ example: 'Bus 1' })
  name: string;

  @ApiProperty({ example: 1, nullable: true, type: Number, description: 'GPS tracker id (matches /admin/fleet/live)' })
  device_id: number | null;
}

export class TripDto {
  @ApiProperty({ example: 41 })
  id: number;

  @ApiProperty({ enum: TRIP_KINDS })
  kind: TripKind;

  @ApiProperty({ enum: TRIP_STATUSES })
  status: TripStatus;

  @ApiProperty({ example: '2026-11-09' })
  trip_date: string;

  @ApiProperty({ type: RefDto })
  route: RefDto;

  @ApiProperty({ type: TripVehicleDto })
  vehicle: TripVehicleDto;

  @ApiProperty({ type: RefDto, nullable: true, description: 'Who started it' })
  started_by: RefDto | null;

  @ApiProperty()
  started_at: Date;

  @ApiProperty({ nullable: true, type: Date })
  ended_at: Date | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'arrived_school',
    description: 'arrived_school, route_complete, driver, admin or timeout',
  })
  end_reason: string | null;

  @ApiProperty({ type: TripPositionDto, nullable: true })
  position: TripPositionDto | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 1260,
    description: 'Seconds to school (pickup) or to the last stop (drop)',
  })
  destination_eta_seconds: number | null;

  @ApiProperty({ example: 2, description: 'Stops done (departed or skipped)' })
  stops_done: number;

  @ApiProperty({ example: 4 })
  stops_total: number;
}

export class TripEventDto {
  @ApiProperty({ example: 120 })
  id: number;

  @ApiProperty({ enum: TRIP_EVENT_TYPES })
  type: TripEventType;

  @ApiProperty({ type: RefDto, nullable: true })
  stop: RefDto | null;

  @ApiProperty({ nullable: true, type: Number })
  eta_seconds: number | null;

  @ApiProperty()
  occurred_at: Date;

  @ApiProperty({ example: 6, description: 'Parents or teachers told about this event' })
  notified: number;
}

export class RiderDto {
  @ApiProperty({ example: 12 })
  student_id: number;

  @ApiProperty({ example: 'Kavin Narayanan' })
  full_name: string;

  @ApiProperty({ nullable: true, type: String, example: '6 - A' })
  class_section: string | null;

  @ApiProperty({ example: 4 })
  stop_id: number;

  @ApiProperty({ enum: TRANSPORT_MODES })
  mode: TransportMode;

  @ApiProperty({ example: 'P7f3a9c2e1b4d' })
  passenger_ref: string;

  @ApiProperty({ example: false })
  boarded: boolean;

  @ApiProperty({ example: false, description: 'On leave or marked absent today, so not expected' })
  away_today: boolean;
}

export class TripDetailDto extends TripDto {
  @ApiProperty({ type: [TripStopDto], description: 'Stops in travel order with live status and ETA' })
  stop_list: TripStopDto[];

  @ApiProperty({
    type: TripPositionDto,
    nullable: true,
    description: 'School gate (the end of a pickup, the start of a drop)',
  })
  school: { lat: number; lng: number } | null;

  @ApiProperty({ type: [TripEventDto] })
  events: TripEventDto[];

  @ApiProperty({ type: [RiderDto], description: 'Students expected on this trip' })
  riders: RiderDto[];

  @ApiProperty({ type: [RiderDto], description: 'Expected but not boarded yet (students away today are left out)' })
  not_boarded: RiderDto[];
}

export class DriverRouteTodayDto {
  @ApiProperty({ type: RefDto })
  route: RefDto;

  @ApiProperty({ example: 'R1' })
  code: string;

  @ApiProperty({ example: 4 })
  stops: number;

  @ApiProperty({ example: 13 })
  students: number;

  @ApiProperty({ nullable: true, type: String, example: '07:00' })
  first_pickup: string | null;

  @ApiProperty({ type: [TripDto], description: 'Trips on this route today' })
  trips: TripDto[];
}

export class DriverTodayDto {
  @ApiProperty({ type: TripVehicleDto, nullable: true })
  vehicle: TripVehicleDto | null;

  @ApiProperty({
    example: true,
    description: 'false when the bus has no GPS tracker yet: use the phone position calls',
  })
  has_tracker: boolean;

  @ApiProperty({ type: TripDto, nullable: true, description: 'The trip running now, if any' })
  active_trip: TripDto | null;

  @ApiProperty({ type: [DriverRouteTodayDto] })
  routes: DriverRouteTodayDto[];
}

export class ChildBusDto {
  @ApiProperty({
    enum: CHILD_BUS_STATUSES,
    description: 'no_trip, on_the_way, approaching, at_stop, passed, trip_ended',
  })
  status: ChildBusStatus;

  @ApiProperty({ example: 'Bus is 4 min away', description: 'Ready-to-show line' })
  headline: string;

  @ApiProperty({ type: RefDto })
  route: RefDto;

  @ApiProperty({ type: TripStopDto, nullable: true, description: 'The child’s own stop on this trip' })
  stop: TripStopDto | null;

  @ApiProperty({ type: TripVehicleDto, nullable: true })
  vehicle: TripVehicleDto | null;

  @ApiProperty({
    type: TripDto,
    nullable: true,
    description: 'Today’s trip for the child; subscribe to it over the live socket',
  })
  trip: TripDto | null;

  @ApiProperty({ nullable: true, type: Number, example: 240 })
  eta_seconds: number | null;

  @ApiProperty({
    type: TripPositionDto,
    nullable: true,
    description: 'Live position on a trip, or the last known position of the bus',
  })
  position: TripPositionDto | null;

  @ApiProperty({ example: false, description: 'true when position is older than 2 minutes' })
  position_stale: boolean;
}
