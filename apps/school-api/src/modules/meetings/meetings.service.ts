import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { AppException, AuthUser, listQuery, offset, paginate, Paginated } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { TEMPLATES } from '../notifications/notification-templates.catalog';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentsService } from '../staff/assignments.service';
import { AgoraTokenService } from './agora-token.service';
import {
  CancelMeetingDto,
  JoinMeetingDto,
  MeetingCallLogDto,
  MeetingDetailDto,
  MeetingDto,
  MeetingInsightsDto,
  MeetingJoinDto,
  MeetingParentOptionDto,
  MeetingQueryDto,
  MeetingTeacherOptionDto,
  MobileMeetingQueryDto,
  ParentMeetingInputDto,
  TeacherMeetingInputDto,
} from './dto/meeting.dto';
import { MeetingCallLog } from './entities/meeting-call-log.entity';
import { Meeting, MeetingParty } from './entities/meeting.entity';
import {
  canJoin,
  channelName,
  endsAt,
  JOIN_EARLY_MINUTES,
  JOIN_GRACE_MINUTES,
  joinBlockReason,
  joinWindow,
  minutesBetween,
  OPEN_STATUSES,
  REMINDER_MINUTES,
  scheduleError,
  formatMeetingTime,
} from './meetings.logic';

const DEFAULT_DURATION = 15;

interface NewMeeting {
  schoolId: number;
  studentId: number;
  teacherUserId: number;
  parentUserId: number;
  scheduledBy: MeetingParty;
  dto: TeacherMeetingInputDto | ParentMeetingInputDto;
  actor: AuthUser;
}

interface PersonRow {
  id: number;
  name: string;
}

interface StudentRow {
  id: number;
  name: string;
  class_name: string | null;
  section_name: string | null;
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger('Meetings');

  constructor(
    @InjectRepository(Meeting) private readonly meetings: Repository<Meeting>,
    @InjectRepository(MeetingCallLog) private readonly logs: Repository<MeetingCallLog>,
    private readonly agora: AgoraTokenService,
    private readonly assignments: AssignmentsService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async scheduleByTeacher(actor: AuthUser, dto: TeacherMeetingInputDto): Promise<MeetingDto> {
    const schoolId = this.teacherSchool(actor);
    await this.assignments.assertTeachesStudent(schoolId, actor.id, dto.student_id);
    const parents = await this.parentsForStudent(schoolId, dto.student_id);
    if (!parents.length) {
      throw AppException.conflict('No parent of this student has the app yet', 'NO_PARENT_ACCOUNT');
    }
    const parent = dto.parent_user_id ? parents.find((item) => item.id === dto.parent_user_id) : parents[0];
    if (!parent) {
      throw AppException.validation([
        { field: 'parent_user_id', message: 'This person is not a parent of the student with the app' },
      ]);
    }
    return this.create({
      schoolId,
      studentId: dto.student_id,
      teacherUserId: actor.id,
      parentUserId: parent.id,
      scheduledBy: 'teacher',
      dto,
      actor,
    });
  }

  async scheduleByParent(
    schoolId: number,
    studentId: number,
    dto: ParentMeetingInputDto,
    actor: AuthUser,
  ): Promise<MeetingDto> {
    const teachers = await this.teachersForStudent(schoolId, studentId);
    if (!teachers.some((teacher) => teacher.id === dto.teacher_user_id)) {
      throw AppException.validation([{ field: 'teacher_user_id', message: 'This teacher does not teach your child' }]);
    }
    return this.create({
      schoolId,
      studentId,
      teacherUserId: dto.teacher_user_id,
      parentUserId: actor.id,
      scheduledBy: 'parent',
      dto,
      actor,
    });
  }

  async listForParty(
    actor: AuthUser,
    party: MeetingParty,
    query: MobileMeetingQueryDto,
  ): Promise<Paginated<MeetingDto>> {
    const qb = this.meetings.createQueryBuilder('m');
    this.scopeToParty(qb, actor, party);
    if (query.student_id) qb.andWhere('m.student_id = :studentId', { studentId: query.student_id });
    if (query.scope === 'upcoming') {
      qb.andWhere('m.status IN (:...open)', { open: OPEN_STATUSES }).orderBy('m.scheduled_at', 'ASC');
    } else if (query.scope === 'past') {
      qb.andWhere('m.status NOT IN (:...open)', { open: OPEN_STATUSES }).orderBy('m.scheduled_at', 'DESC');
    } else {
      qb.orderBy('m.scheduled_at', 'DESC');
    }
    qb.addOrderBy('m.id', 'DESC').skip(offset(query.page, query.limit)).take(query.limit);
    const page = paginate(await qb.getManyAndCount(), query.page, query.limit);
    return { ...page, items: await this.present(page.items) };
  }

  async getForParty(actor: AuthUser, party: MeetingParty, id: number): Promise<MeetingDetailDto> {
    return this.withCallLog(await this.findForParty(actor, party, id));
  }

  async join(actor: AuthUser, party: MeetingParty, id: number, dto: JoinMeetingDto): Promise<MeetingJoinDto> {
    const meeting = await this.findForParty(actor, party, id);
    const now = new Date();
    this.assertJoinable(meeting, now);
    const grant = this.agora.issue(
      meeting.channel_name,
      actor.id,
      joinWindow(meeting.scheduled_at, meeting.duration_minutes).closes_at,
      now,
    );
    const saved = await this.dataSource.transaction(async (manager) => {
      if (meeting.status === 'scheduled') {
        meeting.status = 'live';
        meeting.started_at = now;
      }
      await this.closeOpenLogs(manager, meeting.id, now, actor.id);
      await manager.save(
        manager.create(MeetingCallLog, {
          school_id: meeting.school_id,
          meeting_id: meeting.id,
          user_id: actor.id,
          party,
          platform: dto.platform ?? 'android',
          joined_at: now,
        }),
      );
      return manager.save(meeting);
    });
    return {
      provider: 'agora',
      app_id: grant.app_id,
      channel_name: saved.channel_name,
      uid: actor.id,
      token: grant.token,
      expires_at: grant.expires_at,
      meeting: (await this.present([saved]))[0],
    };
  }

  async renewToken(actor: AuthUser, party: MeetingParty, id: number): Promise<MeetingJoinDto> {
    const meeting = await this.findForParty(actor, party, id);
    const now = new Date();
    this.assertJoinable(meeting, now);
    const grant = this.agora.issue(
      meeting.channel_name,
      actor.id,
      joinWindow(meeting.scheduled_at, meeting.duration_minutes).closes_at,
      now,
    );
    return {
      provider: 'agora',
      app_id: grant.app_id,
      channel_name: meeting.channel_name,
      uid: actor.id,
      token: grant.token,
      expires_at: grant.expires_at,
      meeting: (await this.present([meeting]))[0],
    };
  }

  async leave(actor: AuthUser, party: MeetingParty, id: number): Promise<MeetingDto> {
    const meeting = await this.findForParty(actor, party, id);
    await this.closeOpenLogs(this.dataSource.manager, meeting.id, new Date(), actor.id);
    return (await this.present([meeting]))[0];
  }

  async end(actor: AuthUser, party: MeetingParty, id: number): Promise<MeetingDto> {
    const meeting = await this.findForParty(actor, party, id);
    if (meeting.status !== 'live') {
      throw AppException.conflict(
        meeting.status === 'scheduled'
          ? 'Nobody has joined yet. Cancel the meeting instead.'
          : `This meeting is already ${meeting.status}`,
        'MEETING_NOT_LIVE',
      );
    }
    const now = new Date();
    const saved = await this.dataSource.transaction(async (manager) => {
      Object.assign(meeting, { status: 'completed', ended_at: now, ended_by: actor.id });
      await this.closeOpenLogs(manager, meeting.id, now);
      return manager.save(meeting);
    });
    return (await this.present([saved]))[0];
  }

  async cancel(actor: AuthUser, party: MeetingParty, id: number, dto: CancelMeetingDto): Promise<MeetingDto> {
    const meeting = await this.findForParty(actor, party, id);
    if (meeting.status !== 'scheduled') {
      throw AppException.conflict(
        `Only a meeting that has not started can be cancelled. This one is ${meeting.status}.`,
        'MEETING_NOT_CANCELLABLE',
      );
    }
    Object.assign(meeting, { status: 'cancelled', cancelled_by: actor.id, cancel_reason: dto.reason ?? null });
    const saved = await this.meetings.save(meeting);
    const [presented] = await this.present([saved]);
    const other = party === 'teacher' ? presented.parent : presented.teacher;
    await this.notify(TEMPLATES.MEETING_CANCELLED, other.id, {
      by: actor.name,
      student: presented.student.name,
      time: formatMeetingTime(saved.scheduled_at, this.app.timeZone),
      title: saved.title,
      reason: dto.reason ? ` Reason: ${dto.reason}` : '',
    });
    return presented;
  }

  async teachersForStudent(schoolId: number, studentId: number): Promise<MeetingTeacherOptionDto[]> {
    const rows: { id: number; name: string; is_class_teacher: boolean; subjects: string[] | null }[] =
      await this.dataSource.query(
        `WITH sec AS (
           SELECT e.section_id FROM student_enrollments e
           JOIN academic_years y ON y.id = e.academic_year_id AND y.is_current AND y.deleted_at IS NULL
           WHERE e.student_id = $1 AND y.school_id = $2 LIMIT 1
         ),
         teachers AS (
           SELECT s.class_teacher_user_id AS user_id, NULL::int AS subject_id, s.id AS section_id
           FROM sec JOIN sections s ON s.id = sec.section_id WHERE s.class_teacher_user_id IS NOT NULL
           UNION ALL
           SELECT ta.teacher_user_id, ta.subject_id, ta.section_id
           FROM sec JOIN teacher_assignments ta ON ta.section_id = sec.section_id AND ta.deleted_at IS NULL
         )
         SELECT u.id, u.name,
                bool_or(s.class_teacher_user_id = u.id) AS is_class_teacher,
                array_remove(array_agg(DISTINCT sub.name), NULL) AS subjects
         FROM teachers t
         JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL AND u.status = 'active'
         JOIN sections s ON s.id = t.section_id
         LEFT JOIN subjects sub ON sub.id = t.subject_id
         GROUP BY u.id, u.name
         ORDER BY bool_or(s.class_teacher_user_id = u.id) DESC, u.name`,
        [studentId, schoolId],
      );
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      is_class_teacher: Boolean(row.is_class_teacher),
      subjects: row.subjects ?? [],
    }));
  }

  async parentsForStudent(schoolId: number, studentId: number): Promise<MeetingParentOptionDto[]> {
    const rows: { id: number; name: string; relation: string; is_primary: boolean }[] = await this.dataSource.query(
      `SELECT DISTINCT ON (u.id) u.id, g.name, sg.relation, sg.is_primary
       FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL
       JOIN users u ON u.id = g.user_id AND u.deleted_at IS NULL AND u.status = 'active'
       WHERE sg.student_id = $1 AND sg.school_id = $2
       ORDER BY u.id, sg.is_primary DESC`,
      [studentId, schoolId],
    );
    return rows
      .map((row) => ({ id: Number(row.id), name: row.name, relation: row.relation, is_primary: row.is_primary }))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name));
  }

  async list(schoolId: number, query: MeetingQueryDto): Promise<Paginated<MeetingDto>> {
    const qb = this.meetings
      .createQueryBuilder('m')
      .innerJoin('users', 't', 't.id = m.teacher_user_id')
      .innerJoin('users', 'p', 'p.id = m.parent_user_id')
      .innerJoin('students', 's', 's.id = m.student_id')
      .where('m.school_id = :schoolId', { schoolId });
    if (query.status) qb.andWhere('m.status = :status', { status: query.status });
    if (query.scheduled_by) qb.andWhere('m.scheduled_by = :by', { by: query.scheduled_by });
    if (query.teacher_user_id) qb.andWhere('m.teacher_user_id = :teacher', { teacher: query.teacher_user_id });
    if (query.student_id) qb.andWhere('m.student_id = :student', { student: query.student_id });
    if (query.guardian_id) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM guardians g WHERE g.id = :guardian AND g.school_id = m.school_id AND g.user_id = m.parent_user_id)',
        { guardian: query.guardian_id },
      );
    }
    if (query.date_from) {
      qb.andWhere('(m.scheduled_at AT TIME ZONE :tz)::date >= :from', { tz: this.app.timeZone, from: query.date_from });
    }
    if (query.date_to) {
      qb.andWhere('(m.scheduled_at AT TIME ZONE :tz)::date <= :to', { tz: this.app.timeZone, to: query.date_to });
    }
    if (query.when === 'today') {
      qb.andWhere('(m.scheduled_at AT TIME ZONE :tz)::date = :today', {
        tz: this.app.timeZone,
        today: todayIn(this.app.timeZone),
      });
    } else if (query.when === 'upcoming') {
      qb.andWhere("m.status = 'scheduled' AND m.scheduled_at >= now()");
    } else if (query.when === 'past') {
      qb.andWhere('m.status NOT IN (:...open)', { open: OPEN_STATUSES });
    }
    const page = await listQuery(qb, query.sort ? query : { ...query, sort: 'scheduled_at', order: 'desc' }, {
      searchable: ['m.title', 't.name', 'p.name', 's.first_name', 's.last_name', 's.admission_no'],
      sortable: {
        scheduled_at: 'm.scheduled_at',
        created_at: 'm.created_at',
        status: 'm.status',
        title: 'm.title',
      },
      defaultSort: 'scheduled_at',
    });
    return { ...page, items: await this.present(page.items) };
  }

  async insights(schoolId: number): Promise<MeetingInsightsDto> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE (scheduled_at AT TIME ZONE $2)::date = $3::date) AS today,
              COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at >= now()) AS upcoming,
              COUNT(*) FILTER (WHERE status = 'live') AS live,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE status = 'missed') AS missed,
              COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
       FROM meetings WHERE school_id = $1 AND deleted_at IS NULL`,
      [schoolId, this.app.timeZone, todayIn(this.app.timeZone)],
    );
    return {
      total: Number(row.total),
      today: Number(row.today),
      upcoming: Number(row.upcoming),
      live: Number(row.live),
      completed: Number(row.completed),
      missed: Number(row.missed),
      cancelled: Number(row.cancelled),
    };
  }

  async detail(schoolId: number, id: number): Promise<MeetingDetailDto> {
    const meeting = await this.meetings.findOneBy({ id, school_id: schoolId });
    if (!meeting) throw AppException.notFound('Meeting not found', 'MEETING_NOT_FOUND');
    return this.withCallLog(meeting);
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'meeting-reminders' })
  async tick(): Promise<void> {
    const now = new Date();
    await this.sendReminders(now).catch((error: Error) => this.logger.warn(`Reminders failed: ${error.message}`));
    await this.closeExpired(now).catch((error: Error) => this.logger.warn(`Closing meetings failed: ${error.message}`));
  }

  async sendReminders(now: Date): Promise<number> {
    const due: Meeting[] = await this.meetings
      .createQueryBuilder()
      .update(Meeting)
      .set({ reminder_sent_at: now })
      .where("status = 'scheduled' AND reminder_sent_at IS NULL AND deleted_at IS NULL")
      .andWhere('scheduled_at <= :soon AND scheduled_at > :late', {
        soon: new Date(now.getTime() + REMINDER_MINUTES * 60_000),
        late: new Date(now.getTime() - JOIN_EARLY_MINUTES * 60_000),
      })
      .returning('*')
      .execute()
      .then((result) => (result.raw as Meeting[]).map((row) => this.meetings.create(row)));
    for (const meeting of due) {
      const [presented] = await this.present([meeting]);
      const time = formatMeetingTime(meeting.scheduled_at, this.app.timeZone);
      await this.notify(TEMPLATES.MEETING_REMINDER, presented.parent.id, {
        host: presented.teacher.name,
        student: presented.student.name,
        time,
      });
      await this.notify(TEMPLATES.MEETING_REMINDER, presented.teacher.id, {
        host: presented.parent.name,
        student: presented.student.name,
        time,
      });
    }
    return due.length;
  }

  async closeExpired(now: Date): Promise<number> {
    const [rows] = (await this.dataSource.query(
      `UPDATE meetings
       SET status = CASE WHEN status = 'live' THEN 'completed' ELSE 'missed' END,
           ended_at = CASE WHEN status = 'live' THEN $1 ELSE ended_at END,
           updated_at = now()
       WHERE status IN ('scheduled', 'live') AND deleted_at IS NULL
         AND scheduled_at + make_interval(mins => duration_minutes + $2) < $1
       RETURNING id`,
      [now, JOIN_GRACE_MINUTES],
    )) as [{ id: number }[], number];
    if (rows.length) {
      await this.logs.update(
        { meeting_id: In(rows.map((row) => Number(row.id))), left_at: IsNull() },
        { left_at: now },
      );
    }
    return rows.length;
  }

  private async create(input: NewMeeting): Promise<MeetingDto> {
    const now = new Date();
    const scheduledAt = new Date(input.dto.scheduled_at);
    const error = scheduleError(scheduledAt, now);
    if (error) throw AppException.validation([error]);
    const duration = input.dto.duration_minutes ?? DEFAULT_DURATION;
    const [clash] = await this.dataSource.query(
      `SELECT id FROM meetings
       WHERE deleted_at IS NULL AND status IN ('scheduled', 'live')
         AND (teacher_user_id = $1 OR parent_user_id = $2)
         AND scheduled_at < $4 AND scheduled_at + make_interval(mins => duration_minutes) > $3
       LIMIT 1`,
      [input.teacherUserId, input.parentUserId, scheduledAt, endsAt(scheduledAt, duration)],
    );
    if (clash) {
      throw AppException.conflict('The teacher or the parent already has a meeting at this time', 'MEETING_CLASH');
    }
    const saved = await this.meetings.save(
      this.meetings.create({
        school_id: input.schoolId,
        student_id: input.studentId,
        teacher_user_id: input.teacherUserId,
        parent_user_id: input.parentUserId,
        scheduled_by: input.scheduledBy,
        title: input.dto.title,
        agenda: input.dto.agenda ?? null,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        status: 'scheduled',
        channel_name: channelName(input.schoolId, randomBytes(8).toString('hex')),
        reminder_sent_at: scheduledAt.getTime() <= now.getTime() + REMINDER_MINUTES * 60_000 ? now : null,
        created_by: input.actor.id,
      }),
    );
    const [presented] = await this.present([saved]);
    await this.notify(TEMPLATES.MEETING_SCHEDULED, presented.to.id, {
      by: presented.from.name,
      student: presented.student.name,
      time: formatMeetingTime(saved.scheduled_at, this.app.timeZone),
      title: saved.title,
    });
    return presented;
  }

  private scopeToParty(
    qb: ReturnType<Repository<Meeting>['createQueryBuilder']>,
    actor: AuthUser,
    party: MeetingParty,
  ): void {
    if (party === 'teacher') {
      qb.where('m.teacher_user_id = :userId AND m.school_id = :schoolId', {
        userId: actor.id,
        schoolId: this.teacherSchool(actor),
      });
    } else {
      qb.where('m.parent_user_id = :userId', { userId: actor.id });
    }
  }

  private async findForParty(actor: AuthUser, party: MeetingParty, id: number): Promise<Meeting> {
    const meeting = await this.meetings.findOneBy(
      party === 'teacher'
        ? { id, teacher_user_id: actor.id, school_id: this.teacherSchool(actor) }
        : { id, parent_user_id: actor.id },
    );
    if (!meeting) throw AppException.notFound('Meeting not found', 'MEETING_NOT_FOUND');
    return meeting;
  }

  private assertJoinable(meeting: Meeting, now: Date): void {
    const blocked = joinBlockReason(meeting, now);
    if (blocked) throw AppException.conflict(blocked.message, blocked.code);
  }

  private teacherSchool(actor: AuthUser): number {
    if (!actor.school_id) throw AppException.forbidden('Your account is not linked to a school', 'NO_SCHOOL');
    return actor.school_id;
  }

  private async closeOpenLogs(manager: EntityManager, meetingId: number, at: Date, userId?: number): Promise<void> {
    await manager.update(
      MeetingCallLog,
      { meeting_id: meetingId, left_at: IsNull(), ...(userId ? { user_id: userId } : {}) },
      { left_at: at },
    );
  }

  private async notify(template: string, userId: number, data: Record<string, string>): Promise<void> {
    await this.notifications
      .dispatch({ template, audience: { user_ids: [userId] }, data })
      .catch((error: Error) => this.logger.warn(`${template} for user ${userId} not sent: ${error.message}`));
  }

  private async withCallLog(meeting: Meeting): Promise<MeetingDetailDto> {
    const [presented] = await this.present([meeting]);
    const rows = await this.logs.find({ where: { meeting_id: meeting.id }, order: { joined_at: 'ASC', id: 'ASC' } });
    const people = await this.people(rows.map((row) => row.user_id));
    const call_log: MeetingCallLogDto[] = rows.map((row) => ({
      user: { id: row.user_id, name: people.get(row.user_id) ?? '' },
      party: row.party,
      platform: row.platform,
      joined_at: row.joined_at,
      left_at: row.left_at,
      minutes: minutesBetween(row.joined_at, row.left_at),
    }));
    return { ...presented, call_log };
  }

  private async people(ids: (number | null)[]): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter((id): id is number => Boolean(id)))];
    if (!unique.length) return new Map();
    const rows: PersonRow[] = await this.dataSource.query(`SELECT id, name FROM users WHERE id = ANY($1)`, [unique]);
    return new Map(rows.map((row) => [Number(row.id), row.name]));
  }

  private async present(rows: Meeting[]): Promise<MeetingDto[]> {
    if (!rows.length) return [];
    const now = new Date();
    const studentIds = [...new Set(rows.map((row) => row.student_id))];
    const [people, students, relations] = await Promise.all([
      this.people(rows.flatMap((row) => [row.teacher_user_id, row.parent_user_id, row.cancelled_by])),
      this.dataSource.query(
        `SELECT s.id, concat_ws(' ', s.first_name, s.last_name) AS name, c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN academic_years y ON y.school_id = s.school_id AND y.is_current AND y.deleted_at IS NULL
         LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = y.id
         LEFT JOIN classes c ON c.id = e.class_id LEFT JOIN sections sec ON sec.id = e.section_id
         WHERE s.id = ANY($1)`,
        [studentIds],
      ) as Promise<StudentRow[]>,
      this.dataSource.query(
        `SELECT sg.student_id, g.user_id, sg.relation
         FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id
         WHERE sg.student_id = ANY($1) AND g.user_id IS NOT NULL`,
        [studentIds],
      ) as Promise<{ student_id: number; user_id: number; relation: string }[]>,
    ]);
    const studentMap = new Map(students.map((row) => [Number(row.id), row]));
    const relationMap = new Map(relations.map((row) => [`${row.student_id}:${row.user_id}`, row.relation]));
    return rows.map((row) => {
      const student = studentMap.get(row.student_id);
      const teacher = {
        id: row.teacher_user_id,
        name: people.get(row.teacher_user_id) ?? '',
        role: 'teacher' as const,
        label: 'Teacher',
      };
      const parent = {
        id: row.parent_user_id,
        name: people.get(row.parent_user_id) ?? '',
        role: 'parent' as const,
        label: relationMap.get(`${row.student_id}:${row.parent_user_id}`) ?? 'Parent',
      };
      const window = joinWindow(row.scheduled_at, row.duration_minutes);
      return {
        id: row.id,
        title: row.title,
        agenda: row.agenda,
        status: row.status,
        scheduled_at: row.scheduled_at,
        ends_at: endsAt(row.scheduled_at, row.duration_minutes),
        duration_minutes: row.duration_minutes,
        scheduled_by: row.scheduled_by,
        from: row.scheduled_by === 'teacher' ? teacher : parent,
        to: row.scheduled_by === 'teacher' ? parent : teacher,
        teacher,
        parent,
        student: {
          id: row.student_id,
          name: student?.name ?? '',
          class_section: student?.class_name
            ? [student.class_name, student.section_name].filter(Boolean).join(' - ')
            : null,
        },
        can_join: canJoin(row, now),
        join_opens_at: window.opens_at,
        join_closes_at: window.closes_at,
        started_at: row.started_at,
        ended_at: row.ended_at,
        call_minutes: minutesBetween(row.started_at, row.ended_at),
        cancelled_by: row.cancelled_by ? { id: row.cancelled_by, name: people.get(row.cancelled_by) ?? '' } : null,
        cancel_reason: row.cancel_reason,
        created_at: row.created_at,
      };
    });
  }
}
