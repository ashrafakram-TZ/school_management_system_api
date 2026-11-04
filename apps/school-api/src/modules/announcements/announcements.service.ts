import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AppException, AuthUser, listQuery, offset, paginate, Paginated } from '@app/common';
import { currentYearId, currentYearSql, onlyCurrentYear } from '../../shared/academic-year';
import { FilesService } from '../files/files.service';
import { TEMPLATES } from '../notifications/notification-templates.catalog';
import { NotificationsService } from '../notifications/notifications.service';
import {
  audienceErrors,
  canEdit,
  isVisible,
  preview,
  readPercent,
  statusForPublish,
  timingErrors,
} from './announcements.logic';
import {
  AnnouncementDto,
  AnnouncementInputDto,
  AnnouncementInsightsDto,
  AnnouncementPublishDto,
  AnnouncementQueryDto,
  AnnouncementReaderDto,
  AnnouncementReadersQueryDto,
  MyAnnouncementDto,
  MyAnnouncementsQueryDto,
} from './dto/announcement.dto';
import {
  Announcement,
  AnnouncementAttachment,
  AnnouncementRecipient,
  AnnouncementStatus,
  AnnouncementTarget,
} from './entities/announcement.entity';

interface Targets {
  class_ids: number[];
  section_ids: number[];
}

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger('Announcements');

  constructor(
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(AnnouncementTarget) private readonly targets: Repository<AnnouncementTarget>,
    @InjectRepository(AnnouncementRecipient) private readonly recipients: Repository<AnnouncementRecipient>,
    @InjectRepository(AnnouncementAttachment) private readonly attachments: Repository<AnnouncementAttachment>,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(schoolId: number, dto: AnnouncementInputDto, actor: AuthUser): Promise<AnnouncementDto> {
    const yearId = await currentYearId(this.dataSource.manager, schoolId);
    const plan = await this.validate(schoolId, yearId, dto);
    const saved = await this.dataSource.transaction(async (manager) => {
      const announcement = await manager.save(
        manager.create(Announcement, {
          school_id: schoolId,
          academic_year_id: yearId,
          title: dto.title,
          body: dto.body,
          audience: dto.audience,
          priority: dto.priority ?? 'normal',
          status: plan.status === 'published' ? 'draft' : plan.status,
          publish_at: plan.publishAt,
          expires_at: plan.expiresAt,
          created_by: actor.id,
        }),
      );
      await this.saveTargets(manager, announcement.id, plan.targets);
      await this.saveAttachments(manager, announcement.id, dto.file_ids ?? []);
      return announcement;
    });
    if (plan.status === 'published') await this.deliver(saved, actor.id);
    return this.get(schoolId, saved.id);
  }

  async update(schoolId: number, id: number, dto: AnnouncementInputDto, actor: AuthUser): Promise<AnnouncementDto> {
    const announcement = await this.find(schoolId, id);
    if (!canEdit(announcement.status)) {
      throw AppException.conflict(
        `Only a draft or scheduled announcement can be edited. This one is ${announcement.status}.`,
        'ANNOUNCEMENT_NOT_EDITABLE',
      );
    }
    const plan = await this.validate(schoolId, announcement.academic_year_id, dto);
    const saved = await this.dataSource.transaction(async (manager) => {
      Object.assign(announcement, {
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        priority: dto.priority ?? announcement.priority,
        status: plan.status === 'published' ? 'draft' : plan.status,
        publish_at: plan.publishAt,
        expires_at: plan.expiresAt,
      });
      await manager.delete(AnnouncementTarget, { announcement_id: announcement.id });
      await this.saveTargets(manager, announcement.id, plan.targets);
      if (dto.file_ids) {
        await manager.delete(AnnouncementAttachment, { announcement_id: announcement.id });
        await this.saveAttachments(manager, announcement.id, dto.file_ids);
      }
      return manager.save(announcement);
    });
    if (plan.status === 'published') await this.deliver(saved, actor.id);
    return this.get(schoolId, saved.id);
  }

  async publish(schoolId: number, id: number, dto: AnnouncementPublishDto, actor: AuthUser): Promise<AnnouncementDto> {
    const announcement = await this.find(schoolId, id);
    if (!canEdit(announcement.status)) {
      throw AppException.conflict(`This announcement is already ${announcement.status}`, 'ANNOUNCEMENT_NOT_EDITABLE');
    }
    const now = new Date();
    const publishAt = dto.publish_at ? new Date(dto.publish_at) : null;
    const errors = timingErrors(publishAt, announcement.expires_at, now);
    if (errors.length) throw AppException.validation(errors);
    if (statusForPublish(publishAt, now) === 'scheduled') {
      await this.announcements.update(announcement.id, { status: 'scheduled', publish_at: publishAt });
      return this.get(schoolId, id);
    }
    await this.deliver(announcement, actor.id);
    return this.get(schoolId, id);
  }

  async archive(schoolId: number, id: number): Promise<AnnouncementDto> {
    const announcement = await this.find(schoolId, id);
    if (announcement.status !== 'published') {
      throw AppException.conflict('Only a published announcement can be archived', 'ANNOUNCEMENT_NOT_PUBLISHED');
    }
    await this.announcements.update(id, { status: 'archived', archived_at: new Date() });
    return this.get(schoolId, id);
  }

  async remove(schoolId: number, id: number): Promise<void> {
    const announcement = await this.find(schoolId, id);
    if (!canEdit(announcement.status)) {
      throw AppException.conflict(
        'A published announcement cannot be deleted. Archive it instead.',
        'ANNOUNCEMENT_NOT_EDITABLE',
      );
    }
    await this.announcements.softDelete(id);
  }

  async list(schoolId: number, query: AnnouncementQueryDto): Promise<Paginated<AnnouncementDto>> {
    const qb = onlyCurrentYear(
      this.announcements.createQueryBuilder('a').where('a.school_id = :schoolId', { schoolId }),
    );
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.audience) qb.andWhere('a.audience = :audience', { audience: query.audience });
    if (query.priority) qb.andWhere('a.priority = :priority', { priority: query.priority });
    const page = await listQuery(qb, query.sort ? query : { ...query, sort: 'created_at', order: 'desc' }, {
      searchable: ['a.title', 'a.body'],
      sortable: {
        created_at: 'a.created_at',
        published_at: 'a.published_at',
        publish_at: 'a.publish_at',
        title: 'a.title',
        status: 'a.status',
      },
      defaultSort: 'created_at',
    });
    return { ...page, items: await this.present(page.items) };
  }

  async insights(schoolId: number): Promise<AnnouncementInsightsDto> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) FILTER (WHERE a.status = 'draft') AS drafts,
              COUNT(*) FILTER (WHERE a.status = 'scheduled') AS scheduled,
              COUNT(*) FILTER (WHERE a.status = 'published') AS published,
              COUNT(*) FILTER (WHERE a.status = 'archived') AS archived,
              COUNT(*) FILTER (WHERE a.status = 'published' AND a.priority = 'urgent'
                               AND (a.expires_at IS NULL OR a.expires_at > now())) AS urgent_live,
              COALESCE(ROUND(AVG(CASE WHEN a.status IN ('published', 'archived') AND a.recipient_count > 0
                THEN 100.0 * (SELECT COUNT(*) FROM announcement_recipients r WHERE r.announcement_id = a.id AND r.read_at IS NOT NULL)
                     / a.recipient_count END)), 0) AS average_read_percent
       FROM announcements a ${currentYearSql('a')}
       WHERE a.school_id = $1 AND a.deleted_at IS NULL`,
      [schoolId],
    );
    return {
      drafts: Number(row.drafts),
      scheduled: Number(row.scheduled),
      published: Number(row.published),
      archived: Number(row.archived),
      urgent_live: Number(row.urgent_live),
      average_read_percent: Number(row.average_read_percent),
    };
  }

  async get(schoolId: number, id: number): Promise<AnnouncementDto> {
    return (await this.present([await this.find(schoolId, id)]))[0];
  }

  async readers(
    schoolId: number,
    id: number,
    query: AnnouncementReadersQueryDto,
  ): Promise<Paginated<AnnouncementReaderDto>> {
    await this.find(schoolId, id);
    const where = ['r.announcement_id = $1'];
    const params: unknown[] = [id];
    if (query.state === 'read') where.push('r.read_at IS NOT NULL');
    if (query.state === 'unread') where.push('r.read_at IS NULL');
    if (query.segment) {
      params.push(query.segment);
      where.push(`r.segment = $${params.length}`);
    }
    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM announcement_recipients r WHERE ${where.join(' AND ')}`,
      params,
    );
    const rows: { user_id: number; name: string; mobile: string; segment: 'parent' | 'staff'; read_at: Date | null }[] =
      await this.dataSource.query(
        `SELECT r.user_id, u.name, u.mobile, r.segment, r.read_at
         FROM announcement_recipients r JOIN users u ON u.id = r.user_id
         WHERE ${where.join(' AND ')}
         ORDER BY r.read_at DESC NULLS LAST, u.name
         LIMIT ${query.limit} OFFSET ${offset(query.page, query.limit)}`,
        params,
      );
    return paginate(
      [
        rows.map((row) => ({
          user: { id: Number(row.user_id), name: row.name },
          mobile: row.mobile,
          segment: row.segment,
          read_at: row.read_at,
        })),
        Number(total),
      ],
      query.page,
      query.limit,
    );
  }

  async mine(actor: AuthUser, query: MyAnnouncementsQueryDto): Promise<Paginated<MyAnnouncementDto>> {
    const qb = this.myQuery(actor.id);
    if (query.unread) qb.andWhere('r.read_at IS NULL');
    qb.orderBy('a.published_at', 'DESC').addOrderBy('a.id', 'DESC');
    qb.skip(offset(query.page, query.limit)).take(query.limit);
    const page = paginate(await qb.getManyAndCount(), query.page, query.limit);
    return { ...page, items: await this.presentMine(actor.id, page.items) };
  }

  async unreadCount(actor: AuthUser): Promise<{ unread: number }> {
    return { unread: await this.myQuery(actor.id).andWhere('r.read_at IS NULL').getCount() };
  }

  async myOne(actor: AuthUser, id: number): Promise<MyAnnouncementDto> {
    const announcement = await this.myQuery(actor.id).andWhere('a.id = :id', { id }).getOne();
    if (!announcement) throw AppException.notFound('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    return (await this.presentMine(actor.id, [announcement]))[0];
  }

  async markRead(actor: AuthUser, id: number): Promise<MyAnnouncementDto> {
    await this.myOne(actor, id);
    await this.dataSource.query(
      `UPDATE announcement_recipients SET read_at = now() WHERE announcement_id = $1 AND user_id = $2 AND read_at IS NULL`,
      [id, actor.id],
    );
    return this.myOne(actor, id);
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'announcements-scheduled' })
  async publishDue(now = new Date()): Promise<number> {
    const due = await this.announcements
      .createQueryBuilder()
      .update(Announcement)
      .set({ status: 'draft' })
      .where("status = 'scheduled' AND publish_at <= :now AND deleted_at IS NULL", { now })
      .returning('*')
      .execute()
      .then((result) => (result.raw as Announcement[]).map((row) => this.announcements.create(row)))
      .catch((error: Error) => {
        this.logger.warn(`Scheduled announcements failed: ${error.message}`);
        return [] as Announcement[];
      });
    for (const announcement of due) {
      await this.deliver(announcement, announcement.created_by).catch((error: Error) =>
        this.logger.warn(`Announcement ${announcement.id} not delivered: ${error.message}`),
      );
    }
    return due.length;
  }

  private myQuery(userId: number) {
    return onlyCurrentYear(this.announcements.createQueryBuilder('a'))
      .innerJoin('announcement_recipients', 'r', 'r.announcement_id = a.id AND r.user_id = :userId', { userId })
      .where("a.status = 'published' AND (a.expires_at IS NULL OR a.expires_at > now())");
  }

  private async validate(schoolId: number, yearId: number, dto: AnnouncementInputDto) {
    const now = new Date();
    const publishAt = dto.publish_at ? new Date(dto.publish_at) : null;
    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : null;
    const errors = [
      ...audienceErrors(dto.audience, dto.class_ids, dto.section_ids),
      ...timingErrors(publishAt, expiresAt, now),
    ];
    if (errors.length) throw AppException.validation(errors);
    const targets: Targets =
      dto.audience === 'classes'
        ? await this.checkTargets(schoolId, yearId, dto.class_ids ?? [], dto.section_ids ?? [])
        : { class_ids: [], section_ids: [] };
    for (const fileId of dto.file_ids ?? []) await this.files.assertAttachable(fileId, schoolId, 'file_ids');
    const status: AnnouncementStatus = publishAt
      ? statusForPublish(publishAt, now)
      : dto.publish_now
        ? 'published'
        : 'draft';
    return { status, publishAt, expiresAt, targets };
  }

  private async checkTargets(schoolId: number, yearId: number, classIds: number[], sectionIds: number[]) {
    const classes = [...new Set(classIds)];
    const sections = [...new Set(sectionIds)];
    if (classes.length) {
      const found: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM classes WHERE id = ANY($1) AND school_id = $2 AND deleted_at IS NULL`,
        [classes, schoolId],
      );
      if (found.length !== classes.length) {
        throw AppException.validation([{ field: 'class_ids', message: 'A class was not found in this school' }]);
      }
    }
    if (sections.length) {
      const found: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM sections WHERE id = ANY($1) AND school_id = $2 AND academic_year_id = $3 AND deleted_at IS NULL`,
        [sections, schoolId, yearId],
      );
      if (found.length !== sections.length) {
        throw AppException.validation([
          { field: 'section_ids', message: 'A section was not found in this academic year' },
        ]);
      }
    }
    return { class_ids: classes, section_ids: sections };
  }

  private async deliver(announcement: Announcement, actorId: number | null): Promise<Announcement> {
    const audience = await this.audienceOf(announcement);
    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      if (audience.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(AnnouncementRecipient)
          .values(
            audience.map((row) => ({ announcement_id: announcement.id, user_id: row.user_id, segment: row.segment })),
          )
          .orIgnore()
          .execute();
      }
      await manager.update(Announcement, announcement.id, {
        status: 'published',
        published_at: now,
        published_by: actorId,
        recipient_count: audience.length,
      });
    });
    Object.assign(announcement, { status: 'published', published_at: now, published_by: actorId });
    announcement.recipient_count = audience.length;
    if (audience.length) {
      const [school] = await this.dataSource.query(`SELECT name FROM schools WHERE id = $1`, [announcement.school_id]);
      await this.notifications
        .dispatch({
          template: announcement.priority === 'urgent' ? TEMPLATES.ANNOUNCEMENT_URGENT : TEMPLATES.ANNOUNCEMENT,
          audience: { user_ids: audience.map((row) => row.user_id) },
          data: {
            title: announcement.title,
            preview: preview(announcement.body),
            school: school?.name ?? 'the school',
            announcement_id: String(announcement.id),
          },
        })
        .catch((error: Error) => this.logger.warn(`Announcement ${announcement.id} push failed: ${error.message}`));
    }
    return announcement;
  }

  private async audienceOf(announcement: Announcement): Promise<{ user_id: number; segment: 'parent' | 'staff' }[]> {
    const staff = ['everyone', 'staff'].includes(announcement.audience)
      ? ((await this.dataSource.query(
          `SELECT DISTINCT u.id AS user_id FROM users u
           JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
           WHERE u.school_id = $1 AND u.status = 'active' AND u.deleted_at IS NULL AND r.code <> 'PARENT'`,
          [announcement.school_id],
        )) as { user_id: number }[])
      : [];
    let parents: { user_id: number }[] = [];
    if (announcement.audience !== 'staff') {
      const targets = await this.targets.findBy({ announcement_id: announcement.id });
      const classIds = targets.map((row) => row.class_id).filter((id): id is number => Boolean(id));
      const sectionIds = targets.map((row) => row.section_id).filter((id): id is number => Boolean(id));
      const filter = announcement.audience === 'classes' ? 'AND (e.class_id = ANY($3) OR e.section_id = ANY($4))' : '';
      parents = await this.dataSource.query(
        `SELECT DISTINCT g.user_id FROM student_enrollments e
         JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL AND s.status = 'active'
         JOIN student_guardians sg ON sg.student_id = s.id
         JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL AND g.user_id IS NOT NULL
         JOIN users u ON u.id = g.user_id AND u.status = 'active' AND u.deleted_at IS NULL
         WHERE s.school_id = $1 AND e.academic_year_id = $2 ${filter}`,
        announcement.audience === 'classes'
          ? [announcement.school_id, announcement.academic_year_id, classIds, sectionIds]
          : [announcement.school_id, announcement.academic_year_id],
      );
    }
    const result = new Map<number, 'parent' | 'staff'>();
    staff.forEach((row) => result.set(Number(row.user_id), 'staff'));
    parents.forEach((row) => {
      if (!result.has(Number(row.user_id))) result.set(Number(row.user_id), 'parent');
    });
    return [...result].map(([user_id, segment]) => ({ user_id, segment }));
  }

  private async find(schoolId: number, id: number): Promise<Announcement> {
    const announcement = await onlyCurrentYear(this.announcements.createQueryBuilder('a'))
      .where('a.id = :id AND a.school_id = :schoolId', { id, schoolId })
      .getOne();
    if (!announcement) throw AppException.notFound('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    return announcement;
  }

  private async saveTargets(manager: EntityManager, id: number, targets: Targets): Promise<void> {
    const rows = [
      ...targets.class_ids.map((classId) => ({ announcement_id: id, class_id: classId, section_id: null })),
      ...targets.section_ids.map((sectionId) => ({ announcement_id: id, class_id: null, section_id: sectionId })),
    ];
    if (rows.length) await manager.insert(AnnouncementTarget, rows);
  }

  private async saveAttachments(manager: EntityManager, id: number, fileIds: number[]): Promise<void> {
    if (!fileIds.length) return;
    await manager.insert(
      AnnouncementAttachment,
      [...new Set(fileIds)].map((fileId, index) => ({ announcement_id: id, file_id: fileId, sort_order: index })),
    );
  }

  private async attachmentsOf(ids: number[]) {
    const list = ids.length
      ? await this.attachments.find({ where: { announcement_id: In(ids) }, order: { sort_order: 'ASC' } })
      : [];
    const presented = await this.files.presentMany(list.map((item) => item.file_id));
    return (id: number) =>
      list
        .filter((item) => item.announcement_id === id)
        .map((item) => presented.get(item.file_id))
        .filter((file): file is NonNullable<typeof file> => Boolean(file));
  }

  private async presentMine(userId: number, rows: Announcement[]): Promise<MyAnnouncementDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [reads, schools, files] = await Promise.all([
      this.recipients.findBy({ announcement_id: In(ids), user_id: userId }),
      this.dataSource.query(`SELECT id, name FROM schools WHERE id = ANY($1)`, [
        [...new Set(rows.map((row) => row.school_id))],
      ]) as Promise<{ id: number; name: string }[]>,
      this.attachmentsOf(ids),
    ]);
    const readMap = new Map(reads.map((row) => [row.announcement_id, row.read_at]));
    const schoolMap = new Map(schools.map((row) => [Number(row.id), row.name]));
    const now = new Date();
    return rows
      .filter((row) => isVisible(row, now))
      .map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        school: { id: row.school_id, name: schoolMap.get(row.school_id) ?? '' },
        attachments: files(row.id),
        published_at: row.published_at as Date,
        expires_at: row.expires_at,
        is_read: Boolean(readMap.get(row.id)),
        read_at: readMap.get(row.id) ?? null,
      }));
  }

  private async present(rows: Announcement[]): Promise<AnnouncementDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [targets, reads, users, years, files] = await Promise.all([
      this.dataSource.query(
        `SELECT t.announcement_id, t.class_id, t.section_id, c.name AS class_name,
                sc.name AS section_class, s.name AS section_name
         FROM announcement_targets t
         LEFT JOIN classes c ON c.id = t.class_id
         LEFT JOIN sections s ON s.id = t.section_id
         LEFT JOIN classes sc ON sc.id = s.class_id
         WHERE t.announcement_id = ANY($1)`,
        [ids],
      ) as Promise<
        {
          announcement_id: number;
          class_id: number | null;
          section_id: number | null;
          class_name: string | null;
          section_class: string | null;
          section_name: string | null;
        }[]
      >,
      this.dataSource.query(
        `SELECT announcement_id, COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS read FROM announcement_recipients
         WHERE announcement_id = ANY($1) GROUP BY announcement_id`,
        [ids],
      ) as Promise<{ announcement_id: number; read: string }[]>,
      this.dataSource.query(`SELECT id, name FROM users WHERE id = ANY($1)`, [
        [...new Set(rows.map((row) => row.created_by).filter(Boolean))],
      ]) as Promise<{ id: number; name: string }[]>,
      this.dataSource.query(`SELECT id, name FROM academic_years WHERE id = ANY($1)`, [
        [...new Set(rows.map((row) => row.academic_year_id))],
      ]) as Promise<{ id: number; name: string }[]>,
      this.attachmentsOf(ids),
    ]);
    const readMap = new Map(reads.map((row) => [Number(row.announcement_id), Number(row.read)]));
    const userMap = new Map(users.map((row) => [Number(row.id), row.name]));
    const yearMap = new Map(years.map((row) => [Number(row.id), row.name]));
    return rows.map((row) => {
      const mine = targets.filter((target) => Number(target.announcement_id) === row.id);
      const classes = mine
        .filter((target) => target.class_id)
        .map((target) => ({ id: Number(target.class_id), name: target.class_name ?? '' }));
      const sections = mine
        .filter((target) => target.section_id)
        .map((target) => ({
          id: Number(target.section_id),
          name: [target.section_class, target.section_name].filter(Boolean).join(' - '),
        }));
      const read = readMap.get(row.id) ?? 0;
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        audience: row.audience,
        audience_label: this.audienceLabel(row.audience, classes, sections),
        classes,
        sections,
        priority: row.priority,
        status: row.status,
        publish_at: row.publish_at,
        published_at: row.published_at,
        expires_at: row.expires_at,
        attachments: files(row.id),
        recipient_count: row.recipient_count,
        read_count: read,
        read_percent: readPercent(row.recipient_count, read),
        author: { id: row.created_by ?? 0, name: (row.created_by && userMap.get(row.created_by)) || '' },
        academic_year: { id: row.academic_year_id, name: yearMap.get(row.academic_year_id) ?? '' },
        created_at: row.created_at,
      };
    });
  }

  private audienceLabel(
    audience: Announcement['audience'],
    classes: { name: string }[],
    sections: { name: string }[],
  ): string {
    if (audience === 'everyone') return 'Everyone: parents and staff';
    if (audience === 'parents') return 'All parents';
    if (audience === 'staff') return 'All staff';
    const names = [...classes.map((item) => `Class ${item.name}`), ...sections.map((item) => item.name)];
    return `Parents of ${names.join(', ')}`;
  }
}
