import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AppException, AuthUser, listQuery, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { monthStartIn } from '../../shared/dates';
import { ROLES } from '../access/access.catalog';
import { NotificationsService } from '../notifications/notifications.service';
import { Vehicle } from '../transport/entities/vehicle.entity';
import {
  BusRefDto,
  CloseTicketDto,
  CreateTicketDto,
  TicketDto,
  TicketInsightsDto,
  TicketQueryDto,
  UpdateTicketDto,
} from './dto/fleet-ops.dto';
import { MaintenanceTicket } from './entities/maintenance-ticket.entity';
import { closedAtFor, faultTicket, VehicleFaultEvent } from './fleet-ops.logic';

export const VEHICLE_FAULT_TEMPLATE = 'VEHICLE_FAULT';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger('Maintenance');

  constructor(
    @InjectRepository(MaintenanceTicket) private readonly tickets: Repository<MaintenanceTicket>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number, query: TicketQueryDto): Promise<Paginated<TicketDto>> {
    const qb = this.tickets
      .createQueryBuilder('t')
      .leftJoin(Vehicle, 'v', 'v.id = t.vehicle_id')
      .where('t.school_id = :schoolId', { schoolId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.source) qb.andWhere('t.source = :source', { source: query.source });
    if (query.vehicle_id) qb.andWhere('t.vehicle_id = :vehicle', { vehicle: query.vehicle_id });
    const page = await listQuery(qb, query, {
      searchable: ['t.title', 't.fault_code', 't.vendor', 'v.registration_no', 'v.name'],
      sortable: { opened_at: 't.opened_at', closed_at: 't.closed_at', cost: 't.cost', status: 't.status' },
      defaultSort: 'opened_at',
    });
    return { ...page, items: await this.present(page.items) };
  }

  async insights(schoolId: number, vehicleId?: number): Promise<TicketInsightsDto> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open,
              COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
              COUNT(*) FILTER (WHERE status = 'done')::int AS done,
              COUNT(*) FILTER (WHERE status <> 'done' AND source = 'obd')::int AS obd_open,
              COALESCE(SUM(cost) FILTER (WHERE status = 'done' AND (closed_at AT TIME ZONE $2)::date >= $3::date), 0)::float AS cost_this_month
       FROM maintenance_tickets
       WHERE school_id = $1 AND deleted_at IS NULL ${vehicleId ? 'AND vehicle_id = $4' : ''}`,
      [schoolId, this.app.timeZone, monthStartIn(this.app.timeZone), ...(vehicleId ? [vehicleId] : [])],
    );
    return {
      total: row.total,
      open: row.open,
      in_progress: row.in_progress,
      done: row.done,
      obd_open: row.obd_open,
      cost_this_month: Math.round(row.cost_this_month * 100) / 100,
    };
  }

  async get(schoolId: number, id: number): Promise<TicketDto> {
    return (await this.present([await this.find(schoolId, id)]))[0]!;
  }

  async create(schoolId: number, dto: CreateTicketDto, actor: AuthUser): Promise<TicketDto> {
    await this.bus(schoolId, dto.vehicle_id);
    const saved = await this.tickets.save(
      this.tickets.create({
        school_id: schoolId,
        vehicle_id: dto.vehicle_id,
        source: 'manual',
        fault_code: dto.fault_code ?? null,
        severity: dto.severity ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: 'open',
        opened_at: new Date(),
        closed_at: null,
        cost: dto.cost ?? null,
        vendor: dto.vendor ?? null,
        odometer_km: dto.odometer_km ?? null,
        notes: dto.notes ?? null,
        telematics_fault_id: null,
        created_by: actor.id,
      }),
    );
    return this.get(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: UpdateTicketDto): Promise<TicketDto> {
    const ticket = await this.find(schoolId, id);
    const changes: Partial<MaintenanceTicket> = {};
    for (const key of [
      'title',
      'description',
      'fault_code',
      'severity',
      'vendor',
      'cost',
      'odometer_km',
      'notes',
    ] as const) {
      if (dto[key] !== undefined) Object.assign(changes, { [key]: dto[key] });
    }
    if (dto.status && dto.status !== ticket.status) {
      changes.status = dto.status;
      changes.closed_at = closedAtFor(ticket.status, dto.status, ticket.closed_at, new Date());
    }
    await this.tickets.save(this.tickets.merge(ticket, changes));
    return this.get(schoolId, id);
  }

  async close(schoolId: number, id: number, dto: CloseTicketDto): Promise<TicketDto> {
    const ticket = await this.find(schoolId, id);
    if (ticket.status === 'done') throw AppException.conflict('This ticket is already closed', 'TICKET_CLOSED');
    const changes: Partial<MaintenanceTicket> = { status: 'done', closed_at: new Date() };
    for (const key of ['cost', 'vendor', 'odometer_km', 'notes'] as const) {
      if (dto[key] !== undefined) Object.assign(changes, { [key]: dto[key] });
    }
    await this.tickets.save(this.tickets.merge(ticket, changes));
    return this.get(schoolId, id);
  }

  async openCount(schoolId: number, vehicleId: number): Promise<number> {
    return this.tickets.count({
      where: { school_id: schoolId, vehicle_id: vehicleId, status: In(['open', 'in_progress']) },
    });
  }

  async fromTelematics(event: VehicleFaultEvent): Promise<{ accepted: boolean }> {
    const draft = faultTicket(event);
    if (!draft) return { accepted: false };
    const vehicle = await this.vehicles.findOneBy({ device_id: draft.device_id });
    if (!vehicle) return { accepted: false };
    const already = await this.tickets.findOneBy({
      school_id: vehicle.school_id,
      vehicle_id: vehicle.id,
      fault_code: draft.fault_code,
      status: In(['open', 'in_progress']),
    });
    if (already) return { accepted: true };
    const inserted = await this.tickets
      .createQueryBuilder()
      .insert()
      .values({
        school_id: vehicle.school_id,
        vehicle_id: vehicle.id,
        source: 'obd',
        fault_code: draft.fault_code,
        severity: draft.severity,
        title: draft.title,
        description: draft.description,
        status: 'open',
        opened_at: draft.opened_at,
        closed_at: null,
        odometer_km: draft.odometer_km,
        telematics_fault_id: draft.telematics_fault_id,
      })
      .orIgnore()
      .returning('id')
      .execute();
    if (!(inserted.raw as unknown[] | undefined)?.length) return { accepted: true };
    this.logger.log(`Bus ${vehicle.registration_no}: ticket opened for ${draft.fault_code}`);
    await this.notifications
      .dispatch({
        template: VEHICLE_FAULT_TEMPLATE,
        audience: { roles: [ROLES.TRANSPORT_INCHARGE, ROLES.ADMIN], school_id: vehicle.school_id },
        data: {
          bus: `${vehicle.name} (${vehicle.registration_no})`,
          code: draft.fault_code,
          fault: draft.description,
          severity: draft.severity ?? 'medium',
        },
      })
      .catch((error: Error) =>
        this.logger.warn(`VEHICLE_FAULT for ${vehicle.registration_no} not sent: ${error.message}`),
      );
    return { accepted: true };
  }

  async bus(schoolId: number, vehicleId: number): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOneBy({ id: vehicleId, school_id: schoolId });
    if (!vehicle) throw AppException.notFound('Bus not found', 'VEHICLE_NOT_FOUND');
    return vehicle;
  }

  private async find(schoolId: number, id: number): Promise<MaintenanceTicket> {
    const ticket = await this.tickets.findOneBy({ id, school_id: schoolId });
    if (!ticket) throw AppException.notFound('Maintenance ticket not found', 'TICKET_NOT_FOUND');
    return ticket;
  }

  private async present(rows: MaintenanceTicket[]): Promise<TicketDto[]> {
    if (!rows.length) return [];
    const buses = await this.busRefs(rows.map((row) => row.vehicle_id));
    return rows.map((row) => ({
      id: row.id,
      vehicle: buses.get(row.vehicle_id) ?? { id: row.vehicle_id, registration_no: '', name: '' },
      source: row.source,
      fault_code: row.fault_code,
      severity: row.severity,
      title: row.title,
      description: row.description,
      status: row.status,
      opened_at: row.opened_at,
      closed_at: row.closed_at,
      cost: row.cost,
      vendor: row.vendor,
      odometer_km: row.odometer_km,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async busRefs(ids: number[]): Promise<Map<number, BusRefDto>> {
    const rows = await this.vehicles.find({ where: { id: In([...new Set(ids)]) }, withDeleted: true });
    return new Map(rows.map((row) => [row.id, { id: row.id, registration_no: row.registration_no, name: row.name }]));
  }
}
