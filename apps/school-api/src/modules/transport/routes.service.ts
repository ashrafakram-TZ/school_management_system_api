import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AppException, applySearch, applySort, paginate, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import {
  AssignResultDto,
  AssignStopStudentsDto,
  AssignTransportDto,
  DriverDutyDto,
  ParentTransportDto,
  RouteDetailDto,
  RouteDto,
  RouteInputDto,
  StopDto,
  StopsInputDto,
  StudentTransportDto,
  StudentTransportQueryDto,
  UpdateRouteDto,
} from './dto/transport.dto';
import { RouteStop } from './entities/route-stop.entity';
import { StudentTransport } from './entities/student-transport.entity';
import { TransportRoute } from './entities/transport-route.entity';
import { Vehicle } from './entities/vehicle.entity';
import { autoSequence, pathKm } from './transport.logic';

export const passengerRef = () => `P${randomBytes(9).toString('hex')}`;

interface StudentRow {
  id: number;
  full_name: string;
  admission_no: string;
  class_section: string | null;
}

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(TransportRoute) private readonly routes: Repository<TransportRoute>,
    @InjectRepository(RouteStop) private readonly stops: Repository<RouteStop>,
    @InjectRepository(StudentTransport) private readonly assignments: Repository<StudentTransport>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number): Promise<RouteDto[]> {
    const rows = await this.routes.find({ where: { school_id: schoolId }, order: { code: 'ASC' } });
    return this.present(schoolId, rows);
  }

  async detail(schoolId: number, id: number): Promise<RouteDetailDto> {
    const route = await this.find(schoolId, id);
    const [summary] = await this.present(schoolId, [route]);
    const stops = await this.stopList(route.id);
    const [school] = await this.dataSource.query(`SELECT latitude, longitude FROM schools WHERE id = $1`, [schoolId]);
    const schoolLocation =
      school?.latitude != null && school?.longitude != null
        ? { lat: Number(school.latitude), lng: Number(school.longitude) }
        : null;
    return {
      ...summary!,
      stop_list: stops,
      school_location: schoolLocation,
      distance_km: pathKm([...stops, ...(schoolLocation ? [schoolLocation] : [])]),
    };
  }

  async create(schoolId: number, dto: RouteInputDto): Promise<RouteDetailDto> {
    await this.validate(schoolId, dto);
    const saved = await this.routes.save(
      this.routes.create({
        school_id: schoolId,
        code: dto.code,
        name: dto.name,
        vehicle_id: dto.vehicle_id ?? null,
        is_active: dto.is_active ?? true,
      }),
    );
    return this.detail(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: UpdateRouteDto): Promise<RouteDetailDto> {
    const route = await this.find(schoolId, id);
    await this.validate(schoolId, dto, id);
    await this.routes.save(this.routes.merge(route, dto));
    return this.detail(schoolId, id);
  }

  async remove(schoolId: number, id: number): Promise<void> {
    await this.find(schoolId, id);
    const riders = await this.assignments.countBy({ route_id: id });
    if (riders) {
      throw AppException.conflict(
        `${riders} student${riders === 1 ? '' : 's'} use this route. Move them to another route first.`,
        'ROUTE_IN_USE',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(RouteStop, { route_id: id });
      await manager.softDelete(TransportRoute, id);
    });
  }

  async setStops(schoolId: number, id: number, dto: StopsInputDto): Promise<RouteDetailDto> {
    await this.find(schoolId, id);
    const current = await this.stops.findBy({ route_id: id });
    const keep = new Set(dto.items.map((item) => item.id).filter((value): value is number => Boolean(value)));
    const unknown = [...keep].filter((stopId) => !current.some((stop) => stop.id === stopId));
    if (unknown.length) {
      throw AppException.validation([{ field: 'items', message: `Stop ${unknown[0]} is not on this route` }]);
    }
    const removed = current.filter((stop) => !keep.has(stop.id));
    if (removed.length) {
      const riders = await this.assignments.countBy({ stop_id: In(removed.map((stop) => stop.id)) });
      if (riders) {
        throw AppException.conflict(
          `${riders} student${riders === 1 ? '' : 's'} board at a stop you removed. Move them first.`,
          'STOP_IN_USE',
        );
      }
    }
    await this.dataSource.transaction(async (manager) => {
      if (removed.length) await manager.softDelete(RouteStop, { id: In(removed.map((stop) => stop.id)) });
      for (const [index, item] of dto.items.entries()) {
        const existing = item.id ? current.find((stop) => stop.id === item.id) : undefined;
        await manager.save(
          manager.merge(RouteStop, existing ?? manager.create(RouteStop), {
            school_id: schoolId,
            route_id: id,
            name: item.name,
            landmark: item.landmark ?? null,
            lat: item.lat,
            lng: item.lng,
            sequence: index + 1,
            pickup_time: item.pickup_time ?? null,
            drop_time: item.drop_time ?? null,
            geofence_radius_m: item.geofence_radius_m ?? existing?.geofence_radius_m ?? 100,
            monthly_fee: item.monthly_fee ?? existing?.monthly_fee ?? 0,
          }),
        );
      }
    });
    return this.detail(schoolId, id);
  }

  async autoSequence(schoolId: number, id: number): Promise<RouteDetailDto> {
    const route = await this.detail(schoolId, id);
    if (route.stop_list.length < 2) return route;
    const ordered = autoSequence(route.stop_list, route.school_location);
    await this.dataSource.transaction(async (manager) => {
      for (const [index, stop] of ordered.entries()) {
        await manager.update(RouteStop, stop.id, { sequence: index + 1 });
      }
    });
    return this.detail(schoolId, id);
  }

  async assignStop(
    schoolId: number,
    routeId: number,
    stopId: number,
    dto: AssignStopStudentsDto,
  ): Promise<AssignResultDto> {
    const stop = await this.stop(schoolId, routeId, stopId);
    const students: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM students WHERE school_id = $1 AND id = ANY($2) AND deleted_at IS NULL AND status = 'active'`,
      [schoolId, dto.student_ids],
    );
    const missing = dto.student_ids.filter((studentId) => !students.some((row) => Number(row.id) === studentId));
    if (missing.length) {
      throw AppException.validation([
        { field: 'student_ids', message: `Student ${missing[0]} is not an active student of this school` },
      ]);
    }
    await this.checkCapacity(schoolId, routeId, dto.student_ids);
    const existing = await this.assignments.findBy({ student_id: In(dto.student_ids) });
    const today = todayIn(this.app.timeZone);
    let moved = 0;
    await this.dataSource.transaction(async (manager) => {
      for (const studentId of dto.student_ids) {
        const current = existing.find((row) => row.student_id === studentId);
        if (current && (current.route_id !== routeId || current.stop_id !== stop.id)) moved += 1;
        await manager.save(
          manager.merge(StudentTransport, current ?? manager.create(StudentTransport), {
            school_id: schoolId,
            student_id: studentId,
            route_id: routeId,
            stop_id: stop.id,
            mode: dto.mode ?? current?.mode ?? 'both',
            start_date: current?.start_date ?? today,
            passenger_ref: current?.passenger_ref ?? passengerRef(),
          }),
        );
      }
    });
    return { assigned: dto.student_ids.length, moved, route: await this.detail(schoolId, routeId) };
  }

  async assignStudent(schoolId: number, studentId: number, dto: AssignTransportDto): Promise<StudentTransportDto> {
    const stop = await this.stop(schoolId, dto.route_id, dto.stop_id);
    const [student] = await this.dataSource.query(
      `SELECT id FROM students WHERE school_id = $1 AND id = $2 AND deleted_at IS NULL AND status = 'active'`,
      [schoolId, studentId],
    );
    if (!student) throw AppException.notFound('Student not found', 'STUDENT_NOT_FOUND');
    await this.checkCapacity(schoolId, dto.route_id, [studentId]);
    const current = await this.assignments.findOneBy({ student_id: studentId });
    await this.assignments.save(
      this.assignments.merge(current ?? this.assignments.create(), {
        school_id: schoolId,
        student_id: studentId,
        route_id: dto.route_id,
        stop_id: stop.id,
        mode: dto.mode ?? current?.mode ?? 'both',
        start_date: dto.start_date ?? current?.start_date ?? todayIn(this.app.timeZone),
        passenger_ref: current?.passenger_ref ?? passengerRef(),
      }),
    );
    return (await this.studentRows(schoolId, { student_id: studentId }))[0]!;
  }

  async unassignStudent(schoolId: number, studentId: number): Promise<void> {
    const current = await this.assignments.findOneBy({ school_id: schoolId, student_id: studentId });
    if (!current) throw AppException.notFound('This student has no bus', 'TRANSPORT_NOT_FOUND');
    await this.assignments.softDelete(current.id);
  }

  async studentTransport(schoolId: number, studentId: number): Promise<StudentTransportDto | null> {
    return (await this.studentRows(schoolId, { student_id: studentId }))[0] ?? null;
  }

  async listStudents(schoolId: number, query: StudentTransportQueryDto): Promise<Paginated<StudentTransportDto>> {
    const qb = this.assignments
      .createQueryBuilder('t')
      .innerJoin('students', 's', 's.id = t.student_id AND s.deleted_at IS NULL')
      .where('t.school_id = :schoolId', { schoolId });
    if (query.route_id) qb.andWhere('t.route_id = :route', { route: query.route_id });
    if (query.stop_id) qb.andWhere('t.stop_id = :stop', { stop: query.stop_id });
    applySearch(qb, query.search, ['s.first_name', 's.last_name', 's.admission_no']);
    applySort(qb, query, { sortable: { name: 's.first_name', created_at: 't.created_at' }, defaultSort: 'name' });
    const [items, total] = await Promise.all([
      qb
        .clone()
        .offset((query.page - 1) * query.limit)
        .limit(query.limit)
        .getMany(),
      qb.clone().getCount(),
    ]);
    const rows = items.length ? await this.studentRows(schoolId, { ids: items.map((item) => item.id) }) : [];
    return paginate(
      [items.map((item) => rows.find((row) => row.id === item.id)!).filter(Boolean), total],
      query.page,
      query.limit,
    );
  }

  async forParent(schoolId: number, studentId: number): Promise<ParentTransportDto | null> {
    const assignment = await this.assignments.findOneBy({ school_id: schoolId, student_id: studentId });
    if (!assignment) return null;
    const route = await this.routes.findOneBy({ id: assignment.route_id });
    const stop = (await this.stopList(assignment.route_id)).find((item) => item.id === assignment.stop_id);
    if (!route || !stop) return null;
    const vehicle = route.vehicle_id ? await this.vehicles.findOneBy({ id: route.vehicle_id }) : null;
    const people: { id: number; name: string; mobile: string }[] = vehicle
      ? await this.dataSource.query(`SELECT id, name, mobile FROM users WHERE id = ANY($1)`, [
          [vehicle.driver_user_id, vehicle.attendant_user_id].filter(Boolean),
        ])
      : [];
    const person = (id: number | null | undefined) => {
      const found = people.find((item) => Number(item.id) === id);
      return found ? { id: Number(found.id), name: found.name, mobile: found.mobile } : null;
    };
    return {
      route: { id: route.id, name: route.name },
      stop,
      mode: assignment.mode,
      vehicle: vehicle
        ? { id: vehicle.id, registration_no: vehicle.registration_no, name: vehicle.name, capacity: vehicle.capacity }
        : null,
      driver: person(vehicle?.driver_user_id),
      attendant: person(vehicle?.attendant_user_id),
      monthly_fee: stop.monthly_fee,
    };
  }

  async forDriver(schoolId: number, userId: number): Promise<DriverDutyDto> {
    const vehicle = await this.vehicles.findOne({
      where: [
        { school_id: schoolId, driver_user_id: userId, status: 'active' },
        { school_id: schoolId, attendant_user_id: userId, status: 'active' },
      ],
    });
    if (!vehicle) return { vehicle: null, routes: [] };
    const routes = await this.routes.find({
      where: { school_id: schoolId, vehicle_id: vehicle.id, is_active: true },
      order: { code: 'ASC' },
    });
    const riders = routes.length
      ? await this.studentRows(schoolId, { route_ids: routes.map((route) => route.id) })
      : [];
    return {
      vehicle: {
        id: vehicle.id,
        registration_no: vehicle.registration_no,
        name: vehicle.name,
        capacity: vehicle.capacity,
      },
      routes: await Promise.all(
        routes.map(async (route) => ({
          id: route.id,
          code: route.code,
          name: route.name,
          stops: (await this.stopList(route.id)).map((stop) => ({
            ...stop,
            student_list: riders
              .filter((row) => row.stop.id === stop.id)
              .map((row) => ({ ...row.student, passenger_ref: row.passenger_ref, mode: row.mode })),
          })),
        })),
      ),
    };
  }

  private async checkCapacity(schoolId: number, routeId: number, studentIds: number[]): Promise<void> {
    const route = await this.find(schoolId, routeId);
    if (!route.vehicle_id) return;
    const vehicle = await this.vehicles.findOneBy({ id: route.vehicle_id });
    if (!vehicle) return;
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM student_transport t JOIN transport_routes r ON r.id = t.route_id
       WHERE r.vehicle_id = $1 AND t.deleted_at IS NULL AND r.deleted_at IS NULL AND NOT (t.student_id = ANY($2))`,
      [vehicle.id, studentIds],
    );
    const onBoard = Number(row?.count ?? 0);
    if (onBoard + studentIds.length > vehicle.capacity) {
      const room = Math.max(vehicle.capacity - onBoard, 0);
      throw AppException.conflict(
        `${vehicle.registration_no} has ${vehicle.capacity} seats and ${onBoard} already taken, so only ${room} more student${room === 1 ? '' : 's'} can be added.`,
        'BUS_FULL',
      );
    }
  }

  private async studentRows(
    schoolId: number,
    filter: { student_id?: number; ids?: number[]; route_ids?: number[] },
  ): Promise<StudentTransportDto[]> {
    const where = filter.student_id ? 't.student_id = $2' : filter.ids ? 't.id = ANY($2)' : 't.route_id = ANY($2)';
    const rows: {
      id: number;
      student_id: number;
      first_name: string;
      last_name: string | null;
      admission_no: string;
      class_name: string | null;
      section_name: string | null;
      route_id: number;
      route_name: string;
      stop_id: number;
      stop_name: string;
      pickup_time: string | null;
      drop_time: string | null;
      monthly_fee: string;
      mode: StudentTransport['mode'];
      start_date: string;
      passenger_ref: string;
    }[] = await this.dataSource.query(
      `SELECT t.id, t.student_id, s.first_name, s.last_name, s.admission_no, c.name AS class_name, sec.name AS section_name,
              r.id AS route_id, r.name AS route_name, st.id AS stop_id, st.name AS stop_name, st.pickup_time, st.drop_time,
              st.monthly_fee, t.mode, to_char(t.start_date, 'YYYY-MM-DD') AS start_date, t.passenger_ref
       FROM student_transport t
       JOIN students s ON s.id = t.student_id
       JOIN transport_routes r ON r.id = t.route_id
       JOIN route_stops st ON st.id = t.stop_id
       LEFT JOIN student_enrollments e ON e.student_id = s.id
         AND e.academic_year_id = (SELECT id FROM academic_years y WHERE y.school_id = s.school_id AND y.is_current LIMIT 1)
       LEFT JOIN sections sec ON sec.id = e.section_id
       LEFT JOIN classes c ON c.id = COALESCE(e.class_id, sec.class_id)
       WHERE t.school_id = $1 AND t.deleted_at IS NULL AND ${where}
       ORDER BY st.sequence, s.first_name`,
      [schoolId, filter.student_id ?? filter.ids ?? filter.route_ids],
    );
    return rows.map((row) => {
      const student: StudentRow = {
        id: Number(row.student_id),
        full_name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        admission_no: row.admission_no,
        class_section: row.class_name ? [row.class_name, row.section_name].filter(Boolean).join(' - ') : null,
      };
      return {
        id: Number(row.id),
        student,
        route: { id: Number(row.route_id), name: row.route_name },
        stop: { id: Number(row.stop_id), name: row.stop_name, pickup_time: row.pickup_time, drop_time: row.drop_time },
        mode: row.mode,
        start_date: row.start_date,
        passenger_ref: row.passenger_ref,
        monthly_fee: Number(row.monthly_fee),
      };
    });
  }

  private async stopList(routeId: number): Promise<StopDto[]> {
    const rows = await this.stops.find({ where: { route_id: routeId }, order: { sequence: 'ASC' } });
    const counts: { stop_id: number; count: string }[] = rows.length
      ? await this.dataSource.query(
          `SELECT stop_id, COUNT(*) AS count FROM student_transport WHERE deleted_at IS NULL AND stop_id = ANY($1) GROUP BY stop_id`,
          [rows.map((row) => row.id)],
        )
      : [];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      landmark: row.landmark,
      lat: row.lat,
      lng: row.lng,
      sequence: row.sequence,
      pickup_time: row.pickup_time,
      drop_time: row.drop_time,
      geofence_radius_m: row.geofence_radius_m,
      monthly_fee: row.monthly_fee,
      students: Number(counts.find((item) => Number(item.stop_id) === row.id)?.count ?? 0),
    }));
  }

  private async stop(schoolId: number, routeId: number, stopId: number): Promise<RouteStop> {
    await this.find(schoolId, routeId);
    const stop = await this.stops.findOneBy({ id: stopId, route_id: routeId });
    if (!stop) throw AppException.validation([{ field: 'stop_id', message: 'Choose a stop on this route' }]);
    return stop;
  }

  private async validate(schoolId: number, dto: Partial<RouteInputDto>, id?: number): Promise<void> {
    if (dto.code) {
      const clash = await this.routes.findOneBy({ school_id: schoolId, code: dto.code });
      if (clash && clash.id !== id) throw AppException.conflict(`Route ${dto.code} already exists`, 'ROUTE_EXISTS');
    }
    if (dto.vehicle_id) {
      const vehicle = await this.vehicles.findOneBy({ id: dto.vehicle_id, school_id: schoolId });
      if (!vehicle) throw AppException.validation([{ field: 'vehicle_id', message: 'Choose a bus of this school' }]);
    }
  }

  private async find(schoolId: number, id: number): Promise<TransportRoute> {
    const route = await this.routes.findOneBy({ id, school_id: schoolId });
    if (!route) throw AppException.notFound('Route not found', 'ROUTE_NOT_FOUND');
    return route;
  }

  private async present(schoolId: number, rows: TransportRoute[]): Promise<RouteDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [vehicles, stats]: [
      Vehicle[],
      { route_id: number; stops: string; students: string; first_pickup: string | null }[],
    ] = await Promise.all([
      this.vehicles.findBy({
        school_id: schoolId,
        id: In(rows.map((row) => row.vehicle_id).filter((value): value is number => Boolean(value))),
      }),
      this.dataSource.query(
        `SELECT r.id AS route_id,
                  (SELECT COUNT(*) FROM route_stops s WHERE s.route_id = r.id AND s.deleted_at IS NULL) AS stops,
                  (SELECT COUNT(*) FROM student_transport t WHERE t.route_id = r.id AND t.deleted_at IS NULL) AS students,
                  (SELECT MIN(s.pickup_time) FROM route_stops s WHERE s.route_id = r.id AND s.deleted_at IS NULL) AS first_pickup
           FROM transport_routes r WHERE r.id = ANY($1)`,
        [ids],
      ),
    ]);
    return rows.map((row) => {
      const vehicle = vehicles.find((item) => item.id === row.vehicle_id);
      const stat = stats.find((item) => Number(item.route_id) === row.id);
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        vehicle: vehicle
          ? { id: vehicle.id, registration_no: vehicle.registration_no, name: vehicle.name, capacity: vehicle.capacity }
          : null,
        is_active: row.is_active,
        stops: Number(stat?.stops ?? 0),
        students: Number(stat?.students ?? 0),
        first_pickup: stat?.first_pickup ?? null,
      };
    });
  }
}
