import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AppException, listQuery, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { ROLES } from '../access/access.catalog';
import { TelematicsClient } from '../fleet/telematics.client';
import { NotificationsService } from '../notifications/notifications.service';
import { Staff } from '../staff/entities/staff.entity';
import {
  DeviceOptionDto,
  DriverDto,
  ExpiryDto,
  ExpiryRunDto,
  LicenceInputDto,
  PersonContactDto,
  UpdateVehicleDto,
  VehicleDto,
  VehicleInputDto,
  VehicleQueryDto,
} from './dto/transport.dto';
import { ExpiryAlert, ExpiryKind } from './entities/expiry-alert.entity';
import { TransportRoute } from './entities/transport-route.entity';
import { Vehicle } from './entities/vehicle.entity';
import { alertThreshold, daysBetween, EXPIRY_LABELS, expiryState } from './transport.logic';

const VEHICLE_DOCUMENTS: [ExpiryKind, keyof Vehicle][] = [
  ['insurance', 'insurance_expiry'],
  ['fitness', 'fitness_expiry'],
  ['puc', 'puc_expiry'],
  ['permit', 'permit_expiry'],
];

interface TelematicsDevice {
  id: number;
  imei: string;
  name: string;
  vehicle_no: string | null;
  last_seen_at: Date | null;
}

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger('Transport');

  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(TransportRoute) private readonly routes: Repository<TransportRoute>,
    @InjectRepository(ExpiryAlert) private readonly alerts: Repository<ExpiryAlert>,
    private readonly telematics: TelematicsClient,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number, query: VehicleQueryDto): Promise<Paginated<VehicleDto>> {
    const qb = this.vehicles.createQueryBuilder('v').where('v.school_id = :schoolId', { schoolId });
    if (query.status) qb.andWhere('v.status = :status', { status: query.status });
    const page = await listQuery(qb, query, {
      searchable: ['v.registration_no', 'v.name', 'v.make_model'],
      sortable: { name: 'v.name', registration_no: 'v.registration_no', created_at: 'v.created_at' },
      defaultSort: 'name',
    });
    return { ...page, items: await this.present(schoolId, page.items) };
  }

  async get(schoolId: number, id: number): Promise<VehicleDto> {
    return (await this.present(schoolId, [await this.find(schoolId, id)]))[0]!;
  }

  async create(schoolId: number, dto: VehicleInputDto): Promise<VehicleDto> {
    await this.validate(schoolId, dto);
    const device = await this.device(dto.device_id ?? null);
    const saved = await this.vehicles.save(
      this.vehicles.create({
        school_id: schoolId,
        registration_no: dto.registration_no,
        name: dto.name,
        make_model: dto.make_model ?? null,
        capacity: dto.capacity ?? 40,
        device_id: device?.id ?? null,
        device_imei: device?.imei ?? null,
        driver_user_id: dto.driver_user_id ?? null,
        attendant_user_id: dto.attendant_user_id ?? null,
        insurance_expiry: dto.insurance_expiry ?? null,
        fitness_expiry: dto.fitness_expiry ?? null,
        puc_expiry: dto.puc_expiry ?? null,
        permit_expiry: dto.permit_expiry ?? null,
        status: dto.status ?? 'active',
      }),
    );
    return this.get(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: UpdateVehicleDto): Promise<VehicleDto> {
    const vehicle = await this.find(schoolId, id);
    await this.validate(schoolId, dto, id);
    const changes: Partial<Vehicle> = { ...dto };
    if (dto.device_id !== undefined) {
      const device = await this.device(dto.device_id);
      changes.device_id = device?.id ?? null;
      changes.device_imei = device?.imei ?? null;
    }
    await this.vehicles.save(this.vehicles.merge(vehicle, changes));
    return this.get(schoolId, id);
  }

  async remove(schoolId: number, id: number): Promise<void> {
    await this.find(schoolId, id);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(TransportRoute, { school_id: schoolId, vehicle_id: id }, { vehicle_id: null });
      await manager.softDelete(Vehicle, id);
    });
  }

  async devices(schoolId: number): Promise<DeviceOptionDto[]> {
    const page = await this.telematics.get<{ items: TelematicsDevice[] }>('/devices', {
      limit: 100,
      sort: 'name',
      order: 'asc',
    });
    const linked = await this.vehicles.find({
      where: { device_id: In(page.items.map((item) => item.id)) },
      withDeleted: false,
    });
    const byDevice = new Map(linked.map((vehicle) => [vehicle.device_id, vehicle]));
    return page.items.map((item) => {
      const vehicle = byDevice.get(item.id);
      const ownSchool = vehicle?.school_id === schoolId;
      return {
        id: item.id,
        imei: item.imei,
        name: item.name,
        vehicle_no: item.vehicle_no,
        last_seen_at: item.last_seen_at,
        linked_vehicle: vehicle
          ? { id: ownSchool ? vehicle.id : 0, name: ownSchool ? vehicle.registration_no : 'Another school' }
          : null,
      };
    });
  }

  async drivers(schoolId: number): Promise<DriverDto[]> {
    const today = todayIn(this.app.timeZone);
    const rows: {
      user_id: number;
      name: string;
      mobile: string;
      role: string;
      licence_no: string | null;
      licence_expiry: string | null;
    }[] = await this.dataSource.query(
      `SELECT DISTINCT ON (u.id) u.id AS user_id, u.name, u.mobile, r.code AS role,
              st.licence_no, to_char(st.licence_expiry, 'YYYY-MM-DD') AS licence_expiry
       FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
       LEFT JOIN staff st ON st.user_id = u.id AND st.deleted_at IS NULL
       WHERE u.school_id = $1 AND u.deleted_at IS NULL AND u.status = 'active' AND r.code = ANY($2)
       ORDER BY u.id, r.code`,
      [schoolId, [ROLES.DRIVER, ROLES.ATTENDANT]],
    );
    const vehicles = await this.vehicles.findBy({ school_id: schoolId });
    return rows
      .map((row) => {
        const isDriver = row.role === ROLES.DRIVER;
        const vehicle = vehicles.find((item) =>
          isDriver ? item.driver_user_id === Number(row.user_id) : item.attendant_user_id === Number(row.user_id),
        );
        return {
          user_id: Number(row.user_id),
          name: row.name,
          mobile: row.mobile,
          role: isDriver ? ('driver' as const) : ('attendant' as const),
          licence_no: row.licence_no,
          licence_expiry: row.licence_expiry,
          licence: isDriver ? expiryState('licence', row.licence_expiry, today) : null,
          vehicle: vehicle ? { id: vehicle.id, name: vehicle.registration_no } : null,
        };
      })
      .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  }

  async setLicence(schoolId: number, userId: number, dto: LicenceInputDto): Promise<DriverDto> {
    const driver = (await this.drivers(schoolId)).find((item) => item.user_id === userId && item.role === 'driver');
    if (!driver) throw AppException.notFound('Driver not found', 'DRIVER_NOT_FOUND');
    const staff = await this.dataSource.getRepository(Staff).findOneBy({ school_id: schoolId, user_id: userId });
    if (!staff) {
      throw AppException.badRequest('Add this driver to Staff first, then save the licence', 'STAFF_RECORD_MISSING');
    }
    await this.dataSource
      .getRepository(Staff)
      .update(staff.id, { licence_no: dto.licence_no, licence_expiry: dto.licence_expiry ?? null });
    return (await this.drivers(schoolId)).find((item) => item.user_id === userId)!;
  }

  async upcoming(schoolId: number, days: number): Promise<ExpiryDto[]> {
    return (await this.dueDocuments(schoolId, days)).map((item) => ({
      kind: item.kind,
      label: item.label,
      subject: item.subject,
      ref_id: item.ref_id,
      vehicle_id: item.vehicle_id,
      date: item.date,
      days_left: item.days_left,
    }));
  }

  private async dueDocuments(schoolId: number | null, days: number): Promise<(ExpiryDto & { school_id: number })[]> {
    const today = todayIn(this.app.timeZone);
    const vehicles = await this.vehicles.find({
      where: { ...(schoolId ? { school_id: schoolId } : {}), status: 'active' },
    });
    const items: (ExpiryDto & { school_id: number })[] = [];
    for (const vehicle of vehicles) {
      for (const [kind, field] of VEHICLE_DOCUMENTS) {
        const date = vehicle[field] as string | null;
        if (!date) continue;
        const daysLeft = daysBetween(today, date);
        if (daysLeft <= days) {
          items.push({
            school_id: vehicle.school_id,
            kind,
            label: EXPIRY_LABELS[kind],
            subject: vehicle.registration_no,
            ref_id: vehicle.id,
            vehicle_id: vehicle.id,
            date,
            days_left: daysLeft,
          });
        }
      }
    }
    const licences: { school_id: number; user_id: number; name: string; licence_expiry: string }[] =
      await this.dataSource.query(
        `SELECT st.school_id, st.user_id, u.name, to_char(st.licence_expiry, 'YYYY-MM-DD') AS licence_expiry
         FROM staff st JOIN users u ON u.id = st.user_id
         WHERE st.deleted_at IS NULL AND st.status <> 'resigned' AND st.licence_expiry IS NOT NULL
           AND st.licence_expiry <= ($1::date + $2::int) ${schoolId ? 'AND st.school_id = $3' : ''}`,
        schoolId ? [today, days, schoolId] : [today, days],
      );
    for (const row of licences) {
      items.push({
        school_id: Number(row.school_id),
        kind: 'licence',
        label: EXPIRY_LABELS.licence,
        subject: row.name,
        ref_id: Number(row.user_id),
        vehicle_id: null,
        date: row.licence_expiry,
        days_left: daysBetween(today, row.licence_expiry),
      });
    }
    return items.sort((a, b) => a.days_left - b.days_left);
  }

  @Cron('0 7 * * *', { name: 'fleet-expiry', timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata' })
  async dailyExpiryCheck(): Promise<void> {
    const sent = await this.sendExpiryAlerts(null);
    if (sent) this.logger.log(`Sent ${sent} document expiry alerts`);
  }

  async runExpiryCheck(schoolId: number): Promise<ExpiryRunDto> {
    const sent = await this.sendExpiryAlerts(schoolId);
    return { alerts_sent: sent, upcoming: await this.upcoming(schoolId, 30) };
  }

  async sendExpiryAlerts(schoolId: number | null): Promise<number> {
    const due = await this.dueDocuments(schoolId, 30);
    let sent = 0;
    for (const item of due) {
      const threshold = alertThreshold(item.days_left);
      if (threshold === null) continue;
      const inserted = await this.alerts
        .createQueryBuilder()
        .insert()
        .values({
          school_id: item.school_id,
          kind: item.kind,
          ref_id: item.ref_id,
          expiry_date: item.date,
          threshold_days: threshold,
        })
        .orIgnore()
        .execute();
      if (!(inserted.raw as unknown[] | undefined)?.length) continue;
      await this.notifications
        .dispatch({
          template: 'FLEET_DOCUMENT_EXPIRY',
          audience: { roles: [ROLES.TRANSPORT_INCHARGE, ROLES.ADMIN], school_id: item.school_id },
          data: {
            document: item.label,
            subject: item.subject,
            date: item.date.split('-').reverse().join('-'),
            days: String(Math.max(item.days_left, 0)),
          },
        })
        .then(() => (sent += 1))
        .catch((error: Error) =>
          this.logger.warn(`Expiry alert ${item.kind} ${item.ref_id} not sent: ${error.message}`),
        );
    }
    return sent;
  }

  private async validate(schoolId: number, dto: Partial<VehicleInputDto>, id?: number): Promise<void> {
    if (dto.registration_no) {
      const clash = await this.vehicles.findOneBy({ school_id: schoolId, registration_no: dto.registration_no });
      if (clash && clash.id !== id) {
        throw AppException.conflict(`${dto.registration_no} is already added`, 'VEHICLE_EXISTS');
      }
    }
    if (dto.device_id) {
      const clash = await this.vehicles.findOneBy({ device_id: dto.device_id });
      if (clash && clash.id !== id) {
        throw AppException.conflict(
          clash.school_id === schoolId
            ? `This tracker is already fitted to ${clash.registration_no}`
            : 'This tracker belongs to another school',
          'DEVICE_IN_USE',
        );
      }
    }
    const people = await this.drivers(schoolId);
    if (dto.driver_user_id && !people.some((item) => item.user_id === dto.driver_user_id && item.role === 'driver')) {
      throw AppException.validation([{ field: 'driver_user_id', message: 'Choose a user with the Driver role' }]);
    }
    if (
      dto.attendant_user_id &&
      !people.some((item) => item.user_id === dto.attendant_user_id && item.role === 'attendant')
    ) {
      throw AppException.validation([{ field: 'attendant_user_id', message: 'Choose a user with the Attendant role' }]);
    }
  }

  private async device(deviceId: number | null): Promise<TelematicsDevice | null> {
    if (!deviceId) return null;
    return this.telematics.get<TelematicsDevice>(`/devices/${deviceId}`).catch((error: AppException) => {
      if (error.getStatus?.() === 404) {
        throw AppException.validation([{ field: 'device_id', message: 'This tracker is not registered' }]);
      }
      throw error;
    });
  }

  private async find(schoolId: number, id: number): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOneBy({ id, school_id: schoolId });
    if (!vehicle) throw AppException.notFound('Bus not found', 'VEHICLE_NOT_FOUND');
    return vehicle;
  }

  private async present(schoolId: number, rows: Vehicle[]): Promise<VehicleDto[]> {
    if (!rows.length) return [];
    const today = todayIn(this.app.timeZone);
    const userIds = [
      ...new Set(rows.flatMap((row) => [row.driver_user_id, row.attendant_user_id]).filter((id): id is number => !!id)),
    ];
    const [people, routes]: [PersonContactDto[], { id: number; name: string; vehicle_id: number; students: string }[]] =
      await Promise.all([
        userIds.length
          ? this.dataSource.query(`SELECT id, name, mobile FROM users WHERE id = ANY($1)`, [userIds])
          : Promise.resolve([]),
        this.dataSource.query(
          `SELECT r.id, r.name, r.vehicle_id,
                  (SELECT COUNT(*) FROM student_transport t WHERE t.route_id = r.id AND t.deleted_at IS NULL) AS students
           FROM transport_routes r WHERE r.school_id = $1 AND r.deleted_at IS NULL AND r.vehicle_id = ANY($2)`,
          [schoolId, rows.map((row) => row.id)],
        ),
      ]);
    const person = (id: number | null) => {
      const found = people.find((item) => Number(item.id) === id);
      return found ? { id: Number(found.id), name: found.name, mobile: found.mobile } : null;
    };
    return rows.map((row) => {
      const own = routes.filter((route) => Number(route.vehicle_id) === row.id);
      return {
        id: row.id,
        registration_no: row.registration_no,
        name: row.name,
        make_model: row.make_model,
        capacity: row.capacity,
        device: row.device_id ? { id: row.device_id, imei: row.device_imei } : null,
        driver: person(row.driver_user_id),
        attendant: person(row.attendant_user_id),
        insurance_expiry: row.insurance_expiry,
        fitness_expiry: row.fitness_expiry,
        puc_expiry: row.puc_expiry,
        permit_expiry: row.permit_expiry,
        expiries: VEHICLE_DOCUMENTS.map(([kind, field]) => expiryState(kind, row[field] as string | null, today)),
        routes: own.map((route) => ({ id: Number(route.id), name: route.name })),
        students: own.reduce((sum, route) => sum + Number(route.students), 0),
        status: row.status,
      };
    });
  }
}
