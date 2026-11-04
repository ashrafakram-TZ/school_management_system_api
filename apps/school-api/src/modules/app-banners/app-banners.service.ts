import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AppException, AuthUser, listQuery, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { FilesService } from '../files/files.service';
import { audiencesFor, bannerState, datesError } from './app-banners.logic';
import {
  AppBannerDto,
  AppBannerInputDto,
  AppBannerInsightsDto,
  AppBannerQueryDto,
  UpdateAppBannerDto,
} from './dto/app-banner.dto';
import { AppBanner } from './entities/app-banner.entity';

@Injectable()
export class AppBannersService {
  constructor(
    @InjectRepository(AppBanner) private readonly banners: Repository<AppBanner>,
    private readonly files: FilesService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async list(schoolId: number, query: AppBannerQueryDto): Promise<Paginated<AppBannerDto>> {
    const today = this.today();
    const qb = this.banners.createQueryBuilder('b').where('b.school_id = :schoolId', { schoolId });
    if (query.audience) qb.andWhere('b.audience = :audience', { audience: query.audience });
    if (query.state === 'paused') qb.andWhere('b.is_active = false');
    if (query.state === 'scheduled') qb.andWhere('b.is_active AND b.starts_on > :today', { today });
    if (query.state === 'ended') qb.andWhere('b.is_active AND b.ends_on < :today', { today });
    if (query.state === 'live') {
      qb.andWhere(
        new Brackets((where) =>
          where.where('b.is_active AND b.starts_on <= :today AND b.ends_on >= :today', { today }),
        ),
      );
    }
    const page = await listQuery(qb, query, {
      searchable: ['b.title', 'b.message'],
      sortable: { created_at: 'b.created_at', starts_on: 'b.starts_on', sort_order: 'b.sort_order', title: 'b.title' },
      defaultSort: 'starts_on',
    });
    return { ...page, items: await this.present(page.items) };
  }

  async insights(schoolId: number): Promise<AppBannerInsightsDto> {
    const today = this.today();
    const rows = await this.banners.find({ where: { school_id: schoolId } });
    const count = (state: string) => rows.filter((row) => bannerState(row, today) === state).length;
    return { live: count('live'), scheduled: count('scheduled'), ended: count('ended'), paused: count('paused') };
  }

  async get(schoolId: number, id: number): Promise<AppBannerDto> {
    return (await this.present([await this.find(schoolId, id)]))[0]!;
  }

  async create(schoolId: number, dto: AppBannerInputDto, actor: AuthUser): Promise<AppBannerDto> {
    this.assertDates(dto.starts_on, dto.ends_on);
    if (dto.image_file_id) await this.assertImage(schoolId, dto.image_file_id);
    const saved = await this.banners.save(
      this.banners.create({
        school_id: schoolId,
        title: dto.title,
        message: dto.message ?? null,
        image_file_id: dto.image_file_id ?? null,
        audience: dto.audience ?? 'all',
        starts_on: dto.starts_on,
        ends_on: dto.ends_on,
        link_url: dto.link_url ?? null,
        sort_order: dto.sort_order ?? 0,
        is_active: dto.is_active ?? true,
        created_by: actor.id,
      }),
    );
    return this.get(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: UpdateAppBannerDto): Promise<AppBannerDto> {
    const row = await this.find(schoolId, id);
    const merged = this.banners.merge(row, dto);
    this.assertDates(merged.starts_on, merged.ends_on);
    if (dto.image_file_id && dto.image_file_id !== row.image_file_id)
      await this.assertImage(schoolId, dto.image_file_id);
    await this.banners.save(merged);
    return this.get(schoolId, id);
  }

  async remove(schoolId: number, id: number): Promise<void> {
    const row = await this.find(schoolId, id);
    await this.banners.softDelete(row.id);
  }

  async liveFor(schoolId: number, viewer: 'staff' | 'parents'): Promise<AppBannerDto[]> {
    const today = this.today();
    const rows = await this.banners.find({
      where: {
        school_id: schoolId,
        is_active: true,
        audience: In(audiencesFor(viewer)),
        starts_on: LessThanOrEqual(today),
        ends_on: MoreThanOrEqual(today),
      },
      order: { sort_order: 'ASC', starts_on: 'DESC', id: 'DESC' },
      take: 5,
    });
    return this.present(rows);
  }

  private today(): string {
    return todayIn(this.app.timeZone);
  }

  private assertDates(startsOn: string, endsOn: string): void {
    const message = datesError(startsOn, endsOn);
    if (message) throw AppException.validation([{ field: 'ends_on', message }]);
  }

  private async assertImage(schoolId: number, fileId: number): Promise<void> {
    const file = await this.files.assertAttachable(fileId, schoolId, 'image_file_id');
    if (!file.mime_type.startsWith('image/')) {
      throw AppException.validation([
        { field: 'image_file_id', message: 'The banner must be an image (PNG, JPG or WEBP)' },
      ]);
    }
  }

  private async find(schoolId: number, id: number): Promise<AppBanner> {
    const row = await this.banners.findOneBy({ id, school_id: schoolId });
    if (!row) throw AppException.notFound('Banner not found', 'BANNER_NOT_FOUND');
    return row;
  }

  private async present(rows: AppBanner[]): Promise<AppBannerDto[]> {
    const today = this.today();
    const files = await this.files.presentMany(rows.map((row) => row.image_file_id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      image: row.image_file_id ? (files.get(row.image_file_id) ?? null) : null,
      audience: row.audience,
      starts_on: row.starts_on,
      ends_on: row.ends_on,
      link_url: row.link_url,
      sort_order: row.sort_order,
      is_active: row.is_active,
      state: bannerState(row, today),
      created_at: row.created_at,
    }));
  }
}
