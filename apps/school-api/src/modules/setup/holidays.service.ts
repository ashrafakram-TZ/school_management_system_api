import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import {
  HolidayDto,
  HolidayInputDto,
  HolidayQueryDto,
  MobileHolidayDto,
  MobileHolidayOverviewDto,
  UpdateHolidayDto,
} from './dto/setup.dto';
import { Holiday } from './entities/holiday.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

export function holidayDays(date: string, endDate: string | null): number {
  if (!endDate) return 1;
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS) + 1;
}

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday) private readonly holidays: Repository<Holiday>,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number, query: HolidayQueryDto): Promise<HolidayDto[]> {
    const qb = this.holidays.createQueryBuilder('h').where('h.school_id = :schoolId', { schoolId });
    const from = query.upcoming ? todayIn(this.app.timeZone) : query.from;
    if (from) qb.andWhere('COALESCE(h.end_date, h.date) >= :from', { from });
    if (query.to) qb.andWhere('h.date <= :to', { to: query.to });
    if (query.type) qb.andWhere('h.type = :type', { type: query.type });
    const rows = await qb.orderBy('h.date', 'ASC').getMany();
    return rows.map((row) => this.present(row));
  }

  async next(schoolId: number): Promise<HolidayDto | null> {
    const [first] = await this.list(schoolId, { upcoming: true, type: 'holiday' });
    return first ?? null;
  }

  async overview(schoolId: number, query?: HolidayQueryDto): Promise<MobileHolidayOverviewDto> {
    const today = todayIn(this.app.timeZone);
    const all = await this.list(schoolId, { ...query, upcoming: false });
    const todayMs = Date.parse(`${today}T00:00:00Z`);

    const decorate = (h: HolidayDto): MobileHolidayDto => {
      const hMs = Date.parse(`${h.date}T00:00:00Z`);
      const daysUntil = Math.round((hMs - todayMs) / DAY_MS);
      return {
        ...h,
        days_until: daysUntil >= 0 ? daysUntil : null,
      };
    };

    const decoratedAll = all.map(decorate);
    const upcoming = decoratedAll.filter((h) => {
      const endOrStart = h.end_date ?? h.date;
      return endOrStart >= today;
    });
    const next = upcoming.find((h) => h.type === 'holiday') ?? upcoming[0] ?? null;

    return {
      next_holiday: next ?? null,
      upcoming,
      all: decoratedAll,
    };
  }

  async create(schoolId: number, dto: HolidayInputDto): Promise<HolidayDto> {
    this.assertRange(dto.date, dto.end_date ?? null);
    const holiday = await this.holidays.save(
      this.holidays.create({
        ...dto,
        school_id: schoolId,
        end_date: dto.end_date ?? null,
        type: dto.type ?? 'holiday',
      }),
    );
    return this.present(holiday);
  }

  async update(schoolId: number, id: number, dto: UpdateHolidayDto): Promise<HolidayDto> {
    const holiday = await this.find(schoolId, id);
    this.assertRange(dto.date ?? holiday.date, dto.end_date === undefined ? holiday.end_date : dto.end_date);
    await this.holidays.update(id, dto);
    return this.present(await this.find(schoolId, id));
  }

  async remove(schoolId: number, id: number): Promise<{ id: number }> {
    await this.find(schoolId, id);
    await this.holidays.softDelete(id);
    return { id };
  }

  private async find(schoolId: number, id: number): Promise<Holiday> {
    const holiday = await this.holidays.findOneBy({ id, school_id: schoolId });
    if (!holiday) throw AppException.notFound('Holiday not found', 'HOLIDAY_NOT_FOUND');
    return holiday;
  }

  private assertRange(date: string, endDate: string | null): void {
    if (endDate && endDate < date)
      throw AppException.badRequest('end_date cannot be before date', 'INVALID_DATE_RANGE');
  }

  private present(holiday: Holiday): HolidayDto {
    return {
      id: holiday.id,
      date: holiday.date,
      end_date: holiday.end_date,
      name: holiday.name,
      type: holiday.type,
      days: holidayDays(holiday.date, holiday.end_date),
    };
  }
}
