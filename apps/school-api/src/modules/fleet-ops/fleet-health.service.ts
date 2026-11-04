import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException, Paginated } from '@app/common';
import { TelematicsClient } from '../fleet/telematics.client';
import { TransportTrip } from '../tracking/entities/transport-trip.entity';
import { TripsService } from '../tracking/trips.service';
import {
  BusHealthDto,
  HealthReadingDto,
  LatLngDto,
  ObdLogDto,
  ObdLogQueryDto,
  PlaybackPointDto,
  TripPlaybackDto,
} from './dto/fleet-ops.dto';
import { MaintenanceService } from './maintenance.service';

interface RemoteSafetyEvent {
  id: number;
  kind: string;
  severity: string;
  message: string;
  value: number | null;
  limit: number | null;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  occurred_at: string;
}

interface RemoteStopArrival {
  ref: string;
  name: string;
  sequence: number;
  status: string;
  planned_time: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  lat: number;
  lng: number;
}

export interface RemotePlayback {
  path: LatLngDto[];
  points: PlaybackPointDto[];
  total_points: number;
  sampled: boolean;
  distance_km: number;
  duration_seconds: number;
  max_speed: number | null;
  avg_speed: number | null;
  stop_arrivals: RemoteStopArrival[];
  safety_events: RemoteSafetyEvent[];
}

export function playbackView(remote: RemotePlayback): Omit<TripPlaybackDto, 'trip' | 'school'> {
  return {
    path: remote.path.map((point) => ({ lat: point.lat, lng: point.lng })),
    points: remote.points.map((point) => ({
      at: point.at,
      lat: point.lat,
      lng: point.lng,
      speed: point.speed,
      heading: point.heading,
    })),
    total_points: remote.total_points,
    sampled: remote.sampled,
    distance_km: remote.distance_km,
    duration_seconds: remote.duration_seconds,
    max_speed: remote.max_speed,
    avg_speed: remote.avg_speed,
    stop_arrivals: remote.stop_arrivals.map((stop) => ({
      stop_id: Number(stop.ref),
      name: stop.name,
      sequence: stop.sequence,
      status: stop.status,
      planned_time: stop.planned_time,
      arrived_at: stop.arrived_at,
      departed_at: stop.departed_at,
      lat: stop.lat,
      lng: stop.lng,
    })),
    safety_events: remote.safety_events.map((event) => ({
      id: event.id,
      kind: event.kind,
      severity: event.severity,
      message: event.message,
      value: event.value,
      limit: event.limit,
      at: event.occurred_at,
      lat: event.lat,
      lng: event.lng,
      speed_kmh: event.speed_kmh,
    })),
  };
}

@Injectable()
export class FleetHealthService {
  constructor(
    @InjectRepository(TransportTrip) private readonly trips: Repository<TransportTrip>,
    private readonly maintenance: MaintenanceService,
    private readonly tripsService: TripsService,
    private readonly telematics: TelematicsClient,
    private readonly dataSource: DataSource,
  ) {}

  async health(schoolId: number, vehicleId: number): Promise<BusHealthDto> {
    const vehicle = await this.maintenance.bus(schoolId, vehicleId);
    const [openTickets, health] = await Promise.all([
      this.maintenance.openCount(schoolId, vehicle.id),
      vehicle.device_id
        ? this.telematics.get<HealthReadingDto & { speed?: number | null }>(`/devices/${vehicle.device_id}/health`)
        : Promise.resolve(null),
    ]);
    return {
      bus: { id: vehicle.id, registration_no: vehicle.registration_no, name: vehicle.name },
      has_tracker: Boolean(vehicle.device_id),
      open_tickets: openTickets,
      health: health
        ? {
            device_id: health.device_id,
            status: health.status,
            reasons: health.reasons,
            reading_at: health.reading_at,
            battery_v: health.battery_v,
            coolant_c: health.coolant_c,
            rpm: health.rpm,
            fuel_pct: health.fuel_pct,
            odometer_km: health.odometer_km,
            engine_load_pct: health.engine_load_pct,
            faults: health.faults,
          }
        : null,
    };
  }

  async obdLog(schoolId: number, vehicleId: number, query: ObdLogQueryDto): Promise<Paginated<ObdLogDto>> {
    const vehicle = await this.maintenance.bus(schoolId, vehicleId);
    if (!vehicle.device_id) {
      throw AppException.badRequest('Fit a GPS tracker to this bus in Buses and routes first', 'NO_TRACKER');
    }
    const page = await this.telematics.get<Paginated<ObdLogDto & { device_id?: number; received_at?: string }>>(
      `/devices/${vehicle.device_id}/obd`,
      { page: query.page, limit: query.limit, from: query.from, to: query.to },
    );
    return {
      ...page,
      items: page.items.map((item) => ({
        id: item.id,
        recorded_at: item.recorded_at,
        rpm: item.rpm,
        speed: item.speed,
        coolant_c: item.coolant_c,
        engine_load_pct: item.engine_load_pct,
        throttle_pct: item.throttle_pct,
        fuel_pct: item.fuel_pct,
        battery_v: item.battery_v,
        odometer_km: item.odometer_km,
        dtc: item.dtc,
      })),
    };
  }

  async playback(schoolId: number, tripId: number, maxPoints: number): Promise<TripPlaybackDto> {
    const trip = await this.trips.findOneBy({ id: tripId, school_id: schoolId });
    if (!trip) throw AppException.notFound('Trip not found', 'TRIP_NOT_FOUND');
    if (!trip.telematics_trip_id) {
      throw AppException.notFound('This trip has no GPS track', 'TRACK_NOT_FOUND');
    }
    const [remote, [summary], school] = await Promise.all([
      this.telematics.get<RemotePlayback>(`/trips/${trip.telematics_trip_id}/playback`, { max_points: maxPoints }),
      this.tripsService.present([trip]),
      this.dataSource.query(`SELECT latitude, longitude FROM schools WHERE id = $1`, [schoolId]) as Promise<
        { latitude: string | null; longitude: string | null }[]
      >,
    ]);
    const location = school[0];
    return {
      trip: summary!,
      school:
        location?.latitude != null && location.longitude != null
          ? { lat: Number(location.latitude), lng: Number(location.longitude) }
          : null,
      ...playbackView(remote),
    };
  }
}
