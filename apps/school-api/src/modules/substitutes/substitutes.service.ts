import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { addDays, weekday } from '../../shared/school-days';
import { NotificationsService } from '../notifications/notifications.service';
import { BellPeriodDto } from '../timetable/dto/timetable.dto';
import { TimetableService } from '../timetable/timetable.service';
import {
  AbsentPeriodDto,
  AbsentTeacherDto,
  AssignSubstituteDto,
  AutoAssignResultDto,
  FreeTeacherDto,
  FreeTeachersDto,
  MySubstitutionDto,
  SubstituteBoardDto,
} from './dto/substitute.dto';
import { Substitution } from './entities/substitution.entity';

interface SlotRow {
  id: number;
  day_of_week: number;
  period_no: number;
  section_id: number;
  class_name: string;
  section_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  teacher_user_id: number | null;
  room: string | null;
}

interface CandidateRow {
  user_id: number;
  name: string;
  department: string | null;
  periods_today: string;
  substitutions_this_week: string;
  same_subject: boolean;
  knows_section: boolean;
}

export interface CandidateScore {
  same_subject: boolean;
  knows_section: boolean;
  periods_today: number;
  substitutions_this_week: number;
  name: string;
}

export function rankCandidates<T extends CandidateScore>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.same_subject) - Number(a.same_subject) ||
      Number(b.knows_section) - Number(a.knows_section) ||
      a.periods_today - b.periods_today ||
      a.substitutions_this_week - b.substitutions_this_week ||
      a.name.localeCompare(b.name),
  );
}

export function weekRange(date: string): { from: string; to: string } {
  const day = weekday(date);
  const monday = addDays(date, day === 0 ? -6 : 1 - day);
  return { from: monday, to: addDays(monday, 5) };
}

const SLOT_SELECT = `SELECT t.id, t.day_of_week, t.period_no, t.section_id, c.name AS class_name, sec.name AS section_name,
  t.subject_id, s.name AS subject_name, s.code AS subject_code, t.teacher_user_id, t.room
  FROM timetable_slots t
  JOIN sections sec ON sec.id = t.section_id JOIN classes c ON c.id = sec.class_id
  JOIN subjects s ON s.id = t.subject_id
  JOIN academic_years y ON y.id = t.academic_year_id AND y.is_current`;

const displayDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });

@Injectable()
export class SubstitutesService {
  private readonly logger = new Logger('Substitutes');

  constructor(
    @InjectRepository(Substitution) private readonly substitutions: Repository<Substitution>,
    private readonly timetable: TimetableService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async board(schoolId: number, date: string): Promise<SubstituteBoardDto> {
    const day = weekday(date);
    const holiday = await this.holidayName(schoolId, date);
    const empty = {
      date,
      day_of_week: day,
      working_day: day !== 0 && !holiday,
      holiday,
      absent_teachers: 0,
      periods: 0,
      covered: 0,
      uncovered: 0,
      teachers: [] as AbsentTeacherDto[],
    };
    if (!empty.working_day) return empty;
    const absent = await this.absentTeachers(schoolId, date);
    if (!absent.size) return empty;
    const [periods, slots, covers] = await Promise.all([
      this.timetable.periods(schoolId),
      this.dataSource.query(
        `${SLOT_SELECT} WHERE t.school_id = $1 AND t.day_of_week = $2 AND t.teacher_user_id = ANY($3) ORDER BY t.period_no`,
        [schoolId, day, [...absent.keys()]],
      ) as Promise<SlotRow[]>,
      this.dataSource.query(
        `SELECT sb.id, sb.slot_id, sb.note, u.id AS user_id, u.name FROM substitutions sb
         JOIN users u ON u.id = sb.substitute_user_id WHERE sb.school_id = $1 AND sb.date = $2`,
        [schoolId, date],
      ) as Promise<{ id: number; slot_id: number; note: string | null; user_id: number; name: string }[]>,
    ]);
    const coverBySlot = new Map(covers.map((row) => [Number(row.slot_id), row]));
    const teachers = [...absent.entries()].map(([userId, info]) => ({
      teacher: { id: userId, name: info.name },
      reason: info.reason,
      periods: slots
        .filter((slot) => Number(slot.teacher_user_id) === userId)
        .map((slot) => {
          const cover = coverBySlot.get(Number(slot.id));
          return {
            ...this.presentSlot(slot, periods),
            substitution_id: cover ? Number(cover.id) : null,
            substitute: cover ? { id: Number(cover.user_id), name: cover.name } : null,
            note: cover?.note ?? null,
          };
        }),
    }));
    const all = teachers.flatMap((teacher) => teacher.periods);
    const covered = all.filter((period) => period.substitute).length;
    return {
      ...empty,
      absent_teachers: teachers.length,
      periods: all.length,
      covered,
      uncovered: all.length - covered,
      teachers: teachers.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name)),
    };
  }

  async free(schoolId: number, date: string, slotId: number): Promise<FreeTeachersDto> {
    const slot = await this.slot(schoolId, slotId);
    const periods = await this.timetable.periods(schoolId);
    const absent = await this.absentTeachers(schoolId, date);
    const week = weekRange(date);
    const rows: CandidateRow[] = await this.dataSource.query(
      `SELECT st.user_id, u.name, st.department,
         (SELECT COUNT(*) FROM timetable_slots t JOIN academic_years y ON y.id = t.academic_year_id AND y.is_current
            WHERE t.teacher_user_id = st.user_id AND t.day_of_week = $3)
         + (SELECT COUNT(*) FROM substitutions sb WHERE sb.substitute_user_id = st.user_id AND sb.date = $2) AS periods_today,
         (SELECT COUNT(*) FROM substitutions sb WHERE sb.substitute_user_id = st.user_id
            AND sb.date BETWEEN $5 AND $6) AS substitutions_this_week,
         EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_user_id = st.user_id
            AND ta.subject_id = $7 AND ta.deleted_at IS NULL) AS same_subject,
         EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_user_id = st.user_id
            AND ta.section_id = $8 AND ta.deleted_at IS NULL) AS knows_section
       FROM staff st JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL AND u.status = 'active'
       WHERE st.school_id = $1 AND st.deleted_at IS NULL AND st.status = 'active' AND st.staff_type = 'teaching'
         AND NOT (st.user_id = ANY($9))
         AND NOT EXISTS (SELECT 1 FROM timetable_slots t JOIN academic_years y ON y.id = t.academic_year_id AND y.is_current
            WHERE t.teacher_user_id = st.user_id AND t.day_of_week = $3 AND t.period_no = $4)
         AND NOT EXISTS (SELECT 1 FROM substitutions sb WHERE sb.substitute_user_id = st.user_id
            AND sb.date = $2 AND sb.period_no = $4 AND sb.slot_id <> $10)`,
      [
        schoolId,
        date,
        slot.day_of_week,
        slot.period_no,
        week.from,
        week.to,
        slot.subject_id,
        slot.section_id,
        [...absent.keys()],
        slot.id,
      ],
    );
    const cover = await this.substitutions.findOneBy({ slot_id: slot.id, date });
    const coverUser = cover
      ? ((await this.dataSource.query(`SELECT id, name FROM users WHERE id = $1`, [cover.substitute_user_id]))[0] as
          { id: number; name: string } | undefined)
      : undefined;
    const teachers: FreeTeacherDto[] = rankCandidates(
      rows.map((row) => ({
        teacher: { id: Number(row.user_id), name: row.name },
        name: row.name,
        department: row.department,
        periods_today: Number(row.periods_today),
        substitutions_this_week: Number(row.substitutions_this_week),
        same_subject: Boolean(row.same_subject),
        knows_section: Boolean(row.knows_section),
      })),
    ).map((row) => ({
      teacher: row.teacher,
      department: row.department,
      periods_today: row.periods_today,
      substitutions_this_week: row.substitutions_this_week,
      same_subject: row.same_subject,
      knows_section: row.knows_section,
    }));
    return {
      period: {
        ...this.presentSlot(slot, periods),
        substitution_id: cover?.id ?? null,
        substitute: coverUser ? { id: Number(coverUser.id), name: coverUser.name } : null,
        note: cover?.note ?? null,
      },
      teachers,
    };
  }

  async assign(schoolId: number, dto: AssignSubstituteDto, actor: AuthUser): Promise<SubstituteBoardDto> {
    await this.assertBookable(schoolId, dto.date);
    const slot = await this.slot(schoolId, dto.slot_id);
    if (slot.day_of_week !== weekday(dto.date)) {
      throw AppException.validation([{ field: 'slot_id', message: 'This period is not on that day of the week' }]);
    }
    const absent = await this.absentTeachers(schoolId, dto.date);
    if (!slot.teacher_user_id || !absent.has(Number(slot.teacher_user_id))) {
      throw AppException.conflict(
        'The teacher of this period is not on leave or absent that day',
        'TEACHER_NOT_ABSENT',
      );
    }
    const options = await this.free(schoolId, dto.date, slot.id);
    const chosen = options.teachers.find((row) => row.teacher.id === dto.substitute_user_id);
    if (!chosen) {
      throw AppException.conflict(
        'This teacher is not free in that period. Choose one from the free list.',
        'SUBSTITUTE_BUSY',
      );
    }
    await this.save(schoolId, slot, dto.date, dto.substitute_user_id, dto.note ?? null, actor.id);
    await this.notify(schoolId, slot, dto.date, dto.substitute_user_id, absent.get(Number(slot.teacher_user_id))!.name);
    return this.board(schoolId, dto.date);
  }

  async autoAssign(schoolId: number, date: string, actor: AuthUser): Promise<AutoAssignResultDto> {
    await this.assertBookable(schoolId, date);
    const before = await this.board(schoolId, date);
    let assigned = 0;
    let left = 0;
    for (const teacher of before.teachers) {
      for (const period of teacher.periods.filter((item) => !item.substitute)) {
        const options = await this.free(schoolId, date, period.slot_id);
        const best = options.teachers[0];
        if (!best) {
          left += 1;
          continue;
        }
        const slot = await this.slot(schoolId, period.slot_id);
        await this.save(schoolId, slot, date, best.teacher.id, null, actor.id);
        await this.notify(schoolId, slot, date, best.teacher.id, teacher.teacher.name);
        assigned += 1;
      }
    }
    return { assigned, left_uncovered: left, board: await this.board(schoolId, date) };
  }

  async cancel(schoolId: number, id: number): Promise<SubstituteBoardDto> {
    const row = await this.substitutions.findOneBy({ id, school_id: schoolId });
    if (!row) throw AppException.notFound('Substitution not found', 'SUBSTITUTION_NOT_FOUND');
    await this.substitutions.delete(id);
    return this.board(schoolId, row.date);
  }

  async mine(user: AuthUser): Promise<MySubstitutionDto[]> {
    if (!user.school_id) return [];
    const today = todayIn(this.app.timeZone);
    const periods = await this.timetable.periods(user.school_id);
    const rows: (SlotRow & {
      substitution_id: number;
      date: string;
      note: string | null;
      absent_id: number | null;
      absent_name: string | null;
    })[] = await this.dataSource.query(
      `SELECT sb.id AS substitution_id, to_char(sb.date, 'YYYY-MM-DD') AS date, sb.note, a.id AS absent_id, a.name AS absent_name,
                t.id, t.day_of_week, t.period_no, t.section_id, c.name AS class_name, sec.name AS section_name,
                t.subject_id, s.name AS subject_name, s.code AS subject_code, t.teacher_user_id, t.room
         FROM substitutions sb
         JOIN timetable_slots t ON t.id = sb.slot_id
         JOIN sections sec ON sec.id = t.section_id JOIN classes c ON c.id = sec.class_id
         JOIN subjects s ON s.id = t.subject_id
         LEFT JOIN users a ON a.id = sb.absent_user_id
         WHERE sb.substitute_user_id = $1 AND sb.date BETWEEN $2 AND $3
         ORDER BY sb.date, t.period_no`,
      [user.id, today, addDays(today, 7)],
    );
    return rows.map((row) => {
      const slot = this.presentSlot(row, periods);
      return {
        id: Number(row.substitution_id),
        date: row.date,
        period_no: slot.period_no,
        start_time: slot.start_time,
        end_time: slot.end_time,
        section: slot.section,
        subject: slot.subject,
        room: slot.room,
        absent_teacher: row.absent_id ? { id: Number(row.absent_id), name: row.absent_name ?? '' } : null,
        note: row.note,
      };
    });
  }

  async absentTeachers(schoolId: number, date: string): Promise<Map<number, { name: string; reason: string }>> {
    const rows: { user_id: number; name: string; reason: string; source: string }[] = await this.dataSource.query(
      `SELECT l.user_id, u.name, lt.name AS reason, 'leave' AS source FROM staff_leave_requests l
         JOIN users u ON u.id = l.user_id JOIN leave_types lt ON lt.id = l.leave_type_id
         WHERE l.school_id = $1 AND l.status = 'approved' AND l.deleted_at IS NULL AND l.from_date <= $2 AND l.to_date >= $2
       UNION ALL
       SELECT a.user_id, u.name, 'Absent' AS reason, 'attendance' AS source FROM staff_attendance a
         JOIN users u ON u.id = a.user_id
         WHERE a.school_id = $1 AND a.date = $2 AND a.status = 'absent'`,
      [schoolId, date],
    );
    const absent = new Map<number, { name: string; reason: string }>();
    for (const row of rows.sort((a, b) => (a.source === 'leave' ? -1 : 1) - (b.source === 'leave' ? -1 : 1))) {
      if (!absent.has(Number(row.user_id))) absent.set(Number(row.user_id), { name: row.name, reason: row.reason });
    }
    return absent;
  }

  private async save(
    schoolId: number,
    slot: SlotRow,
    date: string,
    substituteId: number,
    note: string | null,
    actorId: number,
  ): Promise<void> {
    const existing = await this.substitutions.findOneBy({ slot_id: slot.id, date });
    await this.substitutions.save(
      this.substitutions.merge(existing ?? this.substitutions.create(), {
        school_id: schoolId,
        date,
        slot_id: Number(slot.id),
        section_id: Number(slot.section_id),
        period_no: Number(slot.period_no),
        subject_id: Number(slot.subject_id),
        absent_user_id: slot.teacher_user_id ? Number(slot.teacher_user_id) : null,
        substitute_user_id: substituteId,
        note,
        assigned_by: actorId,
      }),
    );
  }

  private async notify(schoolId: number, slot: SlotRow, date: string, userId: number, absentName: string) {
    const periods = await this.timetable.periods(schoolId);
    const period = periods.find((item) => item.period_no === Number(slot.period_no));
    const [school] = await this.dataSource.query(`SELECT name FROM schools WHERE id = $1`, [schoolId]);
    await this.notifications
      .dispatch({
        template: 'SUBSTITUTE_ASSIGNED',
        audience: { user_ids: [userId] },
        data: {
          section: `${slot.class_name} - ${slot.section_name}`,
          period: String(slot.period_no),
          time: period ? `${period.start_time}-${period.end_time}` : '',
          subject: slot.subject_name,
          date: displayDate(date),
          absent: absentName,
          room: slot.room ? ` Room ${slot.room}.` : '',
          school: school?.name ?? '',
        },
      })
      .catch((error: Error) => this.logger.warn(`Substitute alert for slot ${slot.id} not sent: ${error.message}`));
  }

  private async assertBookable(schoolId: number, date: string): Promise<void> {
    if (date < todayIn(this.app.timeZone)) {
      throw AppException.validation([{ field: 'date', message: 'Substitutes can be set for today or later' }]);
    }
    if (weekday(date) === 0) throw AppException.badRequest('That day is a Sunday', 'NOT_A_SCHOOL_DAY');
    const holiday = await this.holidayName(schoolId, date);
    if (holiday) throw AppException.badRequest(`${date} is a holiday: ${holiday}`, 'HOLIDAY');
  }

  private async slot(schoolId: number, slotId: number): Promise<SlotRow> {
    const [slot]: SlotRow[] = await this.dataSource.query(`${SLOT_SELECT} WHERE t.school_id = $1 AND t.id = $2`, [
      schoolId,
      slotId,
    ]);
    if (!slot) throw AppException.notFound('Timetable period not found', 'SLOT_NOT_FOUND');
    return { ...slot, id: Number(slot.id), day_of_week: Number(slot.day_of_week), period_no: Number(slot.period_no) };
  }

  private async holidayName(schoolId: number, date: string): Promise<string | null> {
    const [row] = await this.dataSource.query(
      `SELECT name FROM holidays WHERE school_id = $1 AND deleted_at IS NULL AND type <> 'event'
       AND date <= $2 AND COALESCE(end_date, date) >= $2 LIMIT 1`,
      [schoolId, date],
    );
    return row?.name ?? null;
  }

  private presentSlot(
    slot: SlotRow,
    periods: BellPeriodDto[],
  ): Omit<AbsentPeriodDto, 'substitution_id' | 'substitute' | 'note'> {
    const period = periods.find((item) => item.period_no === Number(slot.period_no));
    return {
      slot_id: Number(slot.id),
      period_no: Number(slot.period_no),
      start_time: period?.start_time ?? '',
      end_time: period?.end_time ?? '',
      section: { id: Number(slot.section_id), name: `${slot.class_name} - ${slot.section_name}` },
      subject: { id: Number(slot.subject_id), name: slot.subject_name, code: slot.subject_code },
      room: slot.room,
    };
  }
}
