import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { holidaySet, monthRange, percent, WEEKLY_OFF, weekday, workingDays } from '../../shared/school-days';
import { NotificationsService } from '../notifications/notifications.service';
import { AcademicYear } from '../setup/entities/academic-year.entity';
import {
  AttendanceBoardDto,
  AttendanceSummaryDto,
  MarkAttendanceDto,
  MonthlyAttendanceDto,
  RosterDto,
  SectionReportDto,
} from './dto/attendance.dto';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { AttendanceSession } from './entities/attendance-session.entity';

interface SectionRow {
  id: number;
  name: string;
  class_name: string;
  class_teacher_user_id: number | null;
  academic_year_id: number;
}

interface StudentRow {
  student_id: number;
  first_name: string;
  last_name: string | null;
  admission_no: string;
  roll_no: number | null;
}

export const PRESENT_WEIGHT: Record<AttendanceStatus, number> = {
  present: 1,
  late: 1,
  half_day: 0.5,
  absent: 0,
  leave: 0,
};

export function summarise(statuses: AttendanceStatus[]): AttendanceSummaryDto {
  const count = (status: AttendanceStatus) => statuses.filter((item) => item === status).length;
  const attended = statuses.reduce((sum, status) => sum + PRESENT_WEIGHT[status], 0);
  return {
    total: statuses.length,
    present: count('present'),
    absent: count('absent'),
    late: count('late'),
    half_day: count('half_day'),
    leave: count('leave'),
    percent: percent(attended, statuses.length),
  };
}

const fullName = (row: { first_name: string; last_name: string | null }) =>
  [row.first_name, row.last_name].filter(Boolean).join(' ');

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger('Attendance');

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async roster(schoolId: number, sectionId: number, date: string, period = 0): Promise<RosterDto> {
    const manager = this.dataSource.manager;
    const section = await this.section(manager, schoolId, sectionId);
    const [students, session, holiday, leaves] = await Promise.all([
      this.students(manager, sectionId),
      manager.findOne(AttendanceSession, {
        where: { section_id: sectionId, date, period },
        relations: { records: true },
      }),
      this.holidayName(manager, schoolId, date),
      this.leaveStudents(manager, schoolId, date),
    ]);
    const saved = new Map((session?.records ?? []).map((record) => [record.student_id, record]));
    const takenBy = session?.taken_by
      ? await manager.query(`SELECT id, name FROM users WHERE id = $1`, [session.taken_by])
      : [];
    const rows = students.map((student) => {
      const record = saved.get(Number(student.student_id));
      const onLeave = leaves.has(Number(student.student_id));
      return {
        student_id: Number(student.student_id),
        full_name: fullName(student),
        admission_no: student.admission_no,
        roll_no: student.roll_no,
        status: record?.status ?? (onLeave ? ('leave' as const) : ('present' as const)),
        remarks: record?.remarks ?? null,
        on_leave: onLeave,
      };
    });
    return {
      section: { id: section.id, name: `${section.class_name} - ${section.name}` },
      date,
      period,
      working_day: !holiday && !WEEKLY_OFF.includes(weekday(date)),
      holiday,
      marked: Boolean(session),
      taken_by: takenBy[0] ? { id: Number(takenBy[0].id), name: takenBy[0].name } : null,
      taken_at: session?.updated_at ?? null,
      summary: summarise(rows.map((row) => row.status)),
      students: rows,
    };
  }

  async mark(schoolId: number, sectionId: number, dto: MarkAttendanceDto, actor: AuthUser): Promise<RosterDto> {
    const period = dto.period ?? 0;
    const today = todayIn(this.app.timeZone);
    if (dto.date > today) throw AppException.badRequest('Attendance cannot be taken for a future date', 'FUTURE_DATE');
    const absentees = await this.dataSource.transaction(async (manager) => {
      const section = await this.section(manager, schoolId, sectionId);
      const year = await manager.findOneByOrFail(AcademicYear, { id: section.academic_year_id });
      if (dto.date < year.start_date || dto.date > year.end_date) {
        throw AppException.badRequest(`The date is outside the ${year.name} academic year`, 'OUTSIDE_YEAR');
      }
      if (WEEKLY_OFF.includes(weekday(dto.date))) {
        throw AppException.badRequest('Attendance is not taken on Sundays', 'NOT_A_SCHOOL_DAY');
      }
      const holiday = await this.holidayName(manager, schoolId, dto.date);
      if (holiday) throw AppException.badRequest(`${dto.date} is a holiday: ${holiday}`, 'HOLIDAY');

      const students = await this.students(manager, sectionId);
      const enrolled = new Set(students.map((student) => Number(student.student_id)));
      const given = dto.items.map((item) => item.student_id);
      if (new Set(given).size !== given.length) {
        throw AppException.badRequest('A student appears twice in the list', 'DUPLICATE_STUDENT');
      }
      const stranger = given.find((id) => !enrolled.has(id));
      if (stranger)
        throw AppException.badRequest(`Student ${stranger} is not in this section`, 'STUDENT_NOT_IN_SECTION');
      const missing = students.filter((student) => !given.includes(Number(student.student_id)));
      if (missing.length) {
        throw AppException.badRequest(
          `Mark every student. Missing: ${missing.slice(0, 3).map(fullName).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`,
          'ATTENDANCE_INCOMPLETE',
        );
      }

      let session = await manager.findOneBy(AttendanceSession, { section_id: sectionId, date: dto.date, period });
      const previous = new Map<number, AttendanceRecord>();
      if (session) {
        for (const record of await manager.findBy(AttendanceRecord, { session_id: session.id })) {
          previous.set(record.student_id, record);
        }
        await manager.update(AttendanceSession, session.id, {
          taken_by: actor.id,
          subject_id: dto.subject_id ?? session.subject_id,
        });
        await manager.delete(AttendanceRecord, { session_id: session.id });
      } else {
        session = await manager.save(
          manager.create(AttendanceSession, {
            school_id: schoolId,
            academic_year_id: section.academic_year_id,
            section_id: sectionId,
            date: dto.date,
            period,
            subject_id: dto.subject_id ?? null,
            taken_by: actor.id,
          }),
        );
      }
      await manager.insert(
        AttendanceRecord,
        dto.items.map((item) => ({
          session_id: session!.id,
          school_id: schoolId,
          student_id: item.student_id,
          date: dto.date,
          period,
          status: item.status,
          remarks: item.remarks ?? null,
          alert_sent: previous.get(item.student_id)?.alert_sent ?? false,
        })),
      );
      if (period !== 0 || dto.date !== today) return [];
      return dto.items
        .filter((item) => item.status === 'absent' && !previous.get(item.student_id)?.alert_sent)
        .map((item) => item.student_id);
    });

    if (absentees.length) await this.sendAbsentAlerts(schoolId, sectionId, dto.date, absentees);
    return this.roster(schoolId, sectionId, dto.date, period);
  }

  async board(schoolId: number, date: string): Promise<AttendanceBoardDto> {
    const manager = this.dataSource.manager;
    const year = await manager.findOneBy(AcademicYear, { school_id: schoolId, is_current: true });
    const holiday = await this.holidayName(manager, schoolId, date);
    const rows: {
      section_id: number;
      class_name: string;
      section_name: string;
      class_teacher: string | null;
      total: string;
      statuses: AttendanceStatus[] | null;
      taken_by: string | null;
      taken_at: Date | null;
    }[] = year
      ? await manager.query(
          `SELECT sec.id AS section_id, c.name AS class_name, sec.name AS section_name, t.name AS class_teacher,
                  (SELECT COUNT(*) FROM student_enrollments e JOIN students s ON s.id = e.student_id
                    WHERE e.section_id = sec.id AND s.deleted_at IS NULL AND s.status = 'active') AS total,
                  (SELECT array_agg(r.status) FROM attendance_records r WHERE r.session_id = a.id) AS statuses,
                  u.name AS taken_by, a.updated_at AS taken_at
           FROM sections sec
           JOIN classes c ON c.id = sec.class_id
           LEFT JOIN users t ON t.id = sec.class_teacher_user_id
           LEFT JOIN attendance_sessions a ON a.section_id = sec.id AND a.date = $3 AND a.period = 0
           LEFT JOIN users u ON u.id = a.taken_by
           WHERE sec.school_id = $1 AND sec.academic_year_id = $2 AND sec.deleted_at IS NULL
           ORDER BY c.grade_level, sec.name`,
          [schoolId, year.id, date],
        )
      : [];
    const sections = rows.map((row) => {
      const statuses = row.statuses ?? [];
      return {
        section_id: Number(row.section_id),
        name: `${row.class_name} - ${row.section_name}`,
        class_teacher: row.class_teacher,
        ...summarise(statuses),
        total: statuses.length || Number(row.total),
        marked: Boolean(row.taken_at),
        taken_by: row.taken_by,
        taken_at: row.taken_at,
      };
    });
    const withStudents = sections.filter((section) => section.total > 0);
    const allStatuses = rows.flatMap((row) => row.statuses ?? []);
    const { from } = monthRange(date.slice(0, 7));
    const [below, pending] = await Promise.all([
      this.belowCount(manager, schoolId, from, date),
      manager.query(
        `SELECT COUNT(*) AS count FROM student_leave_requests WHERE school_id = $1 AND status = 'pending' AND deleted_at IS NULL`,
        [schoolId],
      ),
    ]);
    return {
      date,
      working_day: !holiday && !WEEKLY_OFF.includes(weekday(date)),
      holiday,
      summary: summarise(allStatuses),
      sections_total: withStudents.length,
      sections_not_marked: withStudents.filter((section) => !section.marked).length,
      below_75: below,
      leave_pending: Number(pending[0]?.count ?? 0),
      sections: withStudents,
    };
  }

  async monthly(schoolId: number, studentId: number, month: string): Promise<MonthlyAttendanceDto> {
    const manager = this.dataSource.manager;
    const today = todayIn(this.app.timeZone);
    const range = monthRange(month);
    const to = range.to < today ? range.to : today;
    const holidays = await holidaySet(manager, schoolId, range.from, range.to);
    const records: { date: string; status: AttendanceStatus }[] = await manager.query(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date, status FROM attendance_records
       WHERE student_id = $1 AND school_id = $2 AND period = 0 AND date BETWEEN $3 AND $4`,
      [studentId, schoolId, range.from, range.to],
    );
    const byDate = new Map(records.map((record) => [record.date, record.status]));
    const days = [];
    for (let date = range.from; date <= to && date <= range.to;) {
      days.push({
        date,
        status: WEEKLY_OFF.includes(weekday(date))
          ? ('weekly_off' as const)
          : holidays.has(date)
            ? ('holiday' as const)
            : (byDate.get(date) ?? ('not_marked' as const)),
      });
      const next = new Date(`${date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      date = next.toISOString().slice(0, 10);
    }
    const marked = days
      .map((day) => day.status)
      .filter((status): status is AttendanceStatus => status in PRESENT_WEIGHT);
    const summary = summarise(marked);
    return {
      month,
      working_days: workingDays(range.from, to, holidays).length,
      present: summary.present,
      half_day: summary.half_day,
      absent: summary.absent,
      late: summary.late,
      leave: summary.leave,
      percent: summary.percent,
      days,
    };
  }

  async sectionReport(schoolId: number, sectionId: number, month: string): Promise<SectionReportDto> {
    const manager = this.dataSource.manager;
    await this.section(manager, schoolId, sectionId);
    const range = monthRange(month);
    const today = todayIn(this.app.timeZone);
    const to = range.to < today ? range.to : today;
    const holidays = await holidaySet(manager, schoolId, range.from, range.to);
    const [students, records, sessions] = await Promise.all([
      this.students(manager, sectionId),
      manager.query(
        `SELECT r.student_id, r.status FROM attendance_records r JOIN attendance_sessions a ON a.id = r.session_id
         WHERE a.section_id = $1 AND a.period = 0 AND a.date BETWEEN $2 AND $3`,
        [sectionId, range.from, to],
      ) as Promise<{ student_id: number; status: AttendanceStatus }[]>,
      manager.query(
        `SELECT COUNT(*) AS count FROM attendance_sessions WHERE section_id = $1 AND period = 0 AND date BETWEEN $2 AND $3`,
        [sectionId, range.from, to],
      ),
    ]);
    return {
      month,
      working_days: workingDays(range.from, to, holidays).length,
      marked_days: Number(sessions[0]?.count ?? 0),
      students: students.map((student) => {
        const summary = summarise(
          records
            .filter((record) => Number(record.student_id) === Number(student.student_id))
            .map((record) => record.status),
        );
        return {
          student_id: Number(student.student_id),
          full_name: fullName(student),
          roll_no: student.roll_no,
          present: summary.present,
          half_day: summary.half_day,
          absent: summary.absent,
          late: summary.late,
          leave: summary.leave,
          percent: summary.percent,
        };
      }),
    };
  }

  async todayStatus(studentId: number, schoolId: number): Promise<AttendanceStatus | null> {
    const [row] = await this.dataSource.query(
      `SELECT status FROM attendance_records WHERE student_id = $1 AND school_id = $2 AND period = 0 AND date = $3`,
      [studentId, schoolId, todayIn(this.app.timeZone)],
    );
    return row?.status ?? null;
  }

  private async sendAbsentAlerts(
    schoolId: number,
    sectionId: number,
    date: string,
    studentIds: number[],
  ): Promise<void> {
    const rows: {
      student_id: number;
      first_name: string;
      last_name: string | null;
      class_name: string;
      section_name: string;
      user_ids: number[];
    }[] = await this.dataSource.query(
      `SELECT s.id AS student_id, s.first_name, s.last_name, c.name AS class_name, sec.name AS section_name,
                array_remove(array_agg(DISTINCT g.user_id), NULL) AS user_ids
         FROM students s
         JOIN student_enrollments e ON e.student_id = s.id AND e.section_id = $1
         JOIN sections sec ON sec.id = e.section_id
         JOIN classes c ON c.id = sec.class_id
         LEFT JOIN student_guardians sg ON sg.student_id = s.id AND sg.receives_alerts = true
         LEFT JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL
         WHERE s.id = ANY($2)
         GROUP BY s.id, c.name, sec.name`,
      [sectionId, studentIds],
    );
    const shown = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
    for (const row of rows) {
      if (row.user_ids.length) {
        await this.notifications
          .dispatch({
            template: 'STUDENT_ABSENT',
            audience: { user_ids: row.user_ids.map(Number) },
            data: { student: fullName(row), class: `${row.class_name}-${row.section_name}`, date: shown },
          })
          .catch((error: Error) =>
            this.logger.warn(`Absent alert for student ${row.student_id} failed: ${error.message}`),
          );
      }
      await this.dataSource
        .getRepository(AttendanceRecord)
        .update({ student_id: Number(row.student_id), date, period: 0 }, { alert_sent: true });
    }
  }

  private async section(manager: EntityManager, schoolId: number, sectionId: number): Promise<SectionRow> {
    const [row] = await manager.query(
      `SELECT sec.id, sec.name, c.name AS class_name, sec.class_teacher_user_id, sec.academic_year_id
       FROM sections sec JOIN classes c ON c.id = sec.class_id
       WHERE sec.id = $1 AND sec.school_id = $2 AND sec.deleted_at IS NULL`,
      [sectionId, schoolId],
    );
    if (!row) throw AppException.notFound('Section not found', 'SECTION_NOT_FOUND');
    return { ...row, id: Number(row.id), academic_year_id: Number(row.academic_year_id) };
  }

  private students(manager: EntityManager, sectionId: number): Promise<StudentRow[]> {
    return manager.query(
      `SELECT s.id AS student_id, s.first_name, s.last_name, s.admission_no, e.roll_no
       FROM student_enrollments e JOIN students s ON s.id = e.student_id
       WHERE e.section_id = $1 AND s.deleted_at IS NULL AND s.status = 'active'
       ORDER BY e.roll_no NULLS LAST, s.first_name`,
      [sectionId],
    );
  }

  private async leaveStudents(manager: EntityManager, schoolId: number, date: string): Promise<Set<number>> {
    const rows: { student_id: number }[] = await manager.query(
      `SELECT student_id FROM student_leave_requests
       WHERE school_id = $1 AND status = 'approved' AND deleted_at IS NULL AND $2 BETWEEN from_date AND to_date`,
      [schoolId, date],
    );
    return new Set(rows.map((row) => Number(row.student_id)));
  }

  private async holidayName(manager: EntityManager, schoolId: number, date: string): Promise<string | null> {
    const [row] = await manager.query(
      `SELECT name FROM holidays WHERE school_id = $1 AND deleted_at IS NULL AND type <> 'event'
       AND $2 BETWEEN date AND COALESCE(end_date, date) LIMIT 1`,
      [schoolId, date],
    );
    return row?.name ?? null;
  }

  private async belowCount(manager: EntityManager, schoolId: number, from: string, to: string): Promise<number> {
    const [row] = await manager.query(
      `SELECT COUNT(*) AS count FROM (
         SELECT student_id,
                SUM(CASE status WHEN 'present' THEN 1 WHEN 'late' THEN 1 WHEN 'half_day' THEN 0.5 ELSE 0 END) / COUNT(*) AS ratio
         FROM attendance_records WHERE school_id = $1 AND period = 0 AND date BETWEEN $2 AND $3
         GROUP BY student_id) x WHERE ratio < 0.75`,
      [schoolId, from, to],
    );
    return Number(row?.count ?? 0);
  }
}
