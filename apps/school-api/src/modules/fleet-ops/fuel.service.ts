import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException, AuthUser, FieldError, listQuery, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { monthStartIn, todayIn } from '../../shared/dates';
import { FilesService } from '../files/files.service';
import { FuelInputDto, FuelInsightsDto, FuelLogDto, FuelQueryDto, UpdateFuelDto } from './dto/fleet-ops.dto';
import { FuelLog } from './entities/fuel-log.entity';
import { averageKmPerLitre, fuelEconomy, OdometerReading, odometerProblem, pricePerLitre } from './fleet-ops.logic';
import { MaintenanceService } from './maintenance.service';

const ECONOMY_WINDOW_DAYS = 90;

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelLog) private readonly logs: Repository<FuelLog>,
    private readonly maintenance: MaintenanceService,
    private readonly files: FilesService,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number, query: FuelQueryDto): Promise<Paginated<FuelLogDto>> {
    const qb = this.logs
      .createQueryBuilder('f')
      .leftJoin('vehicles', 'v', 'v.id = f.vehicle_id')
      .where('f.school_id = :schoolId', { schoolId });
    if (query.vehicle_id) qb.andWhere('f.vehicle_id = :vehicle', { vehicle: query.vehicle_id });
    if (query.from) qb.andWhere('f.filled_on >= :from', { from: query.from });
    if (query.to) qb.andWhere('f.filled_on <= :to', { to: query.to });
    const page = await listQuery(qb, query, {
      searchable: ['f.station', 'v.registration_no', 'v.name'],
      sortable: { filled_on: 'f.filled_on', amount: 'f.amount', litres: 'f.litres', odometer_km: 'f.odometer_km' },
      defaultSort: 'filled_on',
    });
    return { ...page, items: await this.present(page.items) };
  }

  async insights(schoolId: number, vehicleId?: number): Promise<FuelInsightsDto> {
    const today = todayIn(this.app.timeZone);
    const params: unknown[] = [schoolId, monthStartIn(this.app.timeZone)];
    const busFilter = vehicleId ? `AND vehicle_id = $${params.push(vehicleId)}` : '';
    const [month] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS entries, COALESCE(SUM(litres), 0)::float AS litres, COALESCE(SUM(amount), 0)::float AS amount
       FROM fuel_logs WHERE school_id = $1 AND deleted_at IS NULL AND filled_on >= $2 ${busFilter}`,
      params,
    );
    const windowParams: unknown[] = [schoolId, today, ECONOMY_WINDOW_DAYS];
    const windowFilter = vehicleId ? `AND vehicle_id = $${windowParams.push(vehicleId)}` : '';
    const rows: { km: number | null; litres: number }[] = await this.dataSource.query(
      `SELECT km::float AS km, litres::float AS litres FROM (
         SELECT filled_on, litres,
                odometer_km - LAG(odometer_km) OVER (PARTITION BY vehicle_id ORDER BY filled_on, odometer_km, id) AS km
         FROM fuel_logs WHERE school_id = $1 AND deleted_at IS NULL ${windowFilter}
       ) fills WHERE filled_on > ($2::date - $3::int)`,
      windowParams,
    );
    return {
      entries_this_month: month.entries,
      litres_this_month: Math.round(month.litres * 100) / 100,
      amount_this_month: Math.round(month.amount * 100) / 100,
      avg_km_per_litre: averageKmPerLitre(rows),
    };
  }

  async get(schoolId: number, id: number): Promise<FuelLogDto> {
    return (await this.present([await this.find(schoolId, id)]))[0]!;
  }

  async create(schoolId: number, dto: FuelInputDto, actor: AuthUser): Promise<FuelLogDto> {
    await this.validate(schoolId, dto);
    const saved = await this.logs.save(
      this.logs.create({
        school_id: schoolId,
        vehicle_id: dto.vehicle_id,
        filled_on: dto.filled_on,
        litres: dto.litres,
        amount: dto.amount,
        odometer_km: dto.odometer_km,
        station: dto.station ?? null,
        bill_file_id: dto.bill_file_id ?? null,
        filled_by: dto.filled_by ?? null,
        created_by: actor.id,
      }),
    );
    return this.get(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: UpdateFuelDto): Promise<FuelLogDto> {
    const log = await this.find(schoolId, id);
    const merged = {
      vehicle_id: dto.vehicle_id ?? log.vehicle_id,
      filled_on: dto.filled_on ?? log.filled_on,
      odometer_km: dto.odometer_km ?? log.odometer_km,
      bill_file_id: dto.bill_file_id === undefined ? undefined : dto.bill_file_id,
      filled_by: dto.filled_by === undefined ? undefined : dto.filled_by,
    };
    await this.validate(schoolId, merged, log);
    const changes: Partial<FuelLog> = {};
    for (const key of [
      'vehicle_id',
      'filled_on',
      'litres',
      'amount',
      'odometer_km',
      'station',
      'bill_file_id',
      'filled_by',
    ] as const) {
      if (dto[key] !== undefined) Object.assign(changes, { [key]: dto[key] });
    }
    await this.logs.save(this.logs.merge(log, changes));
    return this.get(schoolId, id);
  }

  async remove(schoolId: number, id: number): Promise<void> {
    const log = await this.find(schoolId, id);
    await this.logs.softDelete(log.id);
  }

  private async validate(
    schoolId: number,
    dto: {
      vehicle_id: number;
      filled_on: string;
      odometer_km: number;
      bill_file_id?: number | null;
      filled_by?: number | null;
    },
    current?: FuelLog,
  ): Promise<void> {
    await this.maintenance.bus(schoolId, dto.vehicle_id);
    const errors: FieldError[] = [];
    if (dto.filled_on > todayIn(this.app.timeZone)) {
      errors.push({ field: 'filled_on', message: 'filled_on cannot be in the future' });
    }
    const [previous, next] = await this.neighbours(schoolId, dto.vehicle_id, dto.filled_on, current?.id ?? 0);
    const odometer = odometerProblem(dto.odometer_km, previous, next);
    if (odometer) errors.push({ field: 'odometer_km', message: odometer });
    if (dto.filled_by) {
      const [person] = await this.dataSource.query(
        `SELECT id FROM users WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
        [dto.filled_by, schoolId],
      );
      if (!person) errors.push({ field: 'filled_by', message: 'filled_by must be a user of this school' });
    }
    if (errors.length) throw AppException.validation(errors);
    if (dto.bill_file_id && dto.bill_file_id !== current?.bill_file_id) {
      await this.files.assertAttachable(dto.bill_file_id, schoolId, 'bill_file_id');
    }
  }

  private async neighbours(
    schoolId: number,
    vehicleId: number,
    filledOn: string,
    exceptId: number,
  ): Promise<[OdometerReading | null, OdometerReading | null]> {
    const query = (comparison: string, order: string) =>
      this.dataSource.query(
        `SELECT odometer_km::float AS odometer_km, to_char(filled_on, 'YYYY-MM-DD') AS filled_on FROM fuel_logs
         WHERE school_id = $1 AND vehicle_id = $2 AND deleted_at IS NULL AND id <> $3 AND filled_on ${comparison} $4
         ORDER BY filled_on ${order}, odometer_km ${order} LIMIT 1`,
        [schoolId, vehicleId, exceptId, filledOn],
      ) as Promise<OdometerReading[]>;
    const [[previous], [next]] = await Promise.all([query('<=', 'DESC'), query('>', 'ASC')]);
    return [previous ?? null, next ?? null];
  }

  private async find(schoolId: number, id: number): Promise<FuelLog> {
    const log = await this.logs.findOneBy({ id, school_id: schoolId });
    if (!log) throw AppException.notFound('Fuel entry not found', 'FUEL_LOG_NOT_FOUND');
    return log;
  }

  private async present(rows: FuelLog[]): Promise<FuelLogDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [buses, files, previous, people] = await Promise.all([
      this.maintenance.busRefs(rows.map((row) => row.vehicle_id)),
      this.files.presentMany(rows.map((row) => row.bill_file_id)),
      this.dataSource.query(
        `SELECT f.id, (SELECT p.odometer_km::float FROM fuel_logs p
                        WHERE p.vehicle_id = f.vehicle_id AND p.school_id = f.school_id AND p.deleted_at IS NULL
                          AND p.id <> f.id AND (p.filled_on, p.odometer_km, p.id) < (f.filled_on, f.odometer_km, f.id)
                        ORDER BY p.filled_on DESC, p.odometer_km DESC, p.id DESC LIMIT 1) AS previous
         FROM fuel_logs f WHERE f.id = ANY($1)`,
        [ids],
      ) as Promise<{ id: number; previous: number | null }[]>,
      this.dataSource.query(`SELECT id, name FROM users WHERE id = ANY($1)`, [
        [...new Set(rows.map((row) => row.filled_by).filter(Boolean))],
      ]) as Promise<{ id: number; name: string }[]>,
    ]);
    const previousById = new Map(previous.map((row) => [Number(row.id), row.previous]));
    return rows.map((row) => {
      const person = people.find((item) => Number(item.id) === row.filled_by);
      return {
        id: row.id,
        vehicle: buses.get(row.vehicle_id) ?? { id: row.vehicle_id, registration_no: '', name: '' },
        filled_on: row.filled_on,
        litres: row.litres,
        amount: row.amount,
        price_per_litre: pricePerLitre(row.amount, row.litres),
        odometer_km: row.odometer_km,
        ...fuelEconomy(row.odometer_km, previousById.get(row.id) ?? null, row.litres),
        station: row.station,
        bill_file: row.bill_file_id ? (files.get(row.bill_file_id) ?? null) : null,
        filled_by: person ? { id: Number(person.id), name: person.name } : null,
        created_at: row.created_at,
      };
    });
  }
}
