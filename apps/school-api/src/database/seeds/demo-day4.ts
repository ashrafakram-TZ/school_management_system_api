import { EntityManager } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from '../../modules/attendance/entities/attendance-record.entity';
import { AttendanceSession } from '../../modules/attendance/entities/attendance-session.entity';
import { StudentLeave } from '../../modules/attendance/entities/student-leave.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { AcademicYear } from '../../modules/setup/entities/academic-year.entity';
import { StaffAttendance } from '../../modules/staff-attendance/entities/staff-attendance.entity';
import { LeaveType } from '../../modules/staff-leave/entities/leave-type.entity';
import { StaffLeave } from '../../modules/staff-leave/entities/staff-leave.entity';
import { DEFAULT_LEAVE_TYPES } from '../../modules/staff-leave/staff-leave.service';
import { BellPeriod } from '../../modules/timetable/entities/bell-period.entity';
import { TimetableSlot } from '../../modules/timetable/entities/timetable-slot.entity';
import { DEFAULT_BELL, SCHOOL_DAYS } from '../../modules/timetable/timetable.service';
import { todayIn } from '../../shared/dates';
import { addDays, holidaySet, workingDays } from '../../shared/school-days';

const ABSENT_PATTERN: AttendanceStatus[] = ['absent', 'late', 'present', 'half_day'];

export async function seedDemoDay4(manager: EntityManager, school: School): Promise<void> {
  const schoolId = school.id;
  if (await manager.exists(BellPeriod, { where: { school_id: schoolId } })) {
    console.log(`Day 4     ${school.code}  attendance, leave and timetable already set up: kept`);
    return;
  }
  const timeZone = process.env.APP_TIMEZONE ?? 'Asia/Kolkata';
  const today = todayIn(timeZone);
  const year = await manager.findOneByOrFail(AcademicYear, { school_id: schoolId, is_current: true });

  let periodNo = 0;
  await manager.insert(
    BellPeriod,
    DEFAULT_BELL.map(([name, start_time, end_time, is_break], index) => ({
      school_id: schoolId,
      name,
      start_time,
      end_time,
      is_break,
      period_no: is_break ? null : (periodNo += 1),
      sort_order: index + 1,
    })),
  );

  const [section]: { id: number; room: string | null; class_teacher_user_id: number | null }[] = await manager.query(
    `SELECT sec.id, sec.room, sec.class_teacher_user_id FROM sections sec JOIN classes c ON c.id = sec.class_id
     WHERE sec.school_id = $1 AND sec.academic_year_id = $2 AND c.name = '6' AND sec.name = 'A' AND sec.deleted_at IS NULL`,
    [schoolId, year.id],
  );
  if (!section) return;

  const plan: { subject_id: number; teacher_user_id: number; periods_per_week: number }[] = await manager.query(
    `SELECT subject_id, teacher_user_id, periods_per_week FROM teacher_assignments
     WHERE section_id = $1 AND deleted_at IS NULL ORDER BY periods_per_week DESC, subject_id`,
    [section.id],
  );
  const remaining = plan.map((row) => ({ ...row, left: Number(row.periods_per_week) }));
  const slots: Partial<TimetableSlot>[] = [];
  for (const day of SCHOOL_DAYS) {
    const usedToday = new Set<number>();
    for (let period = 1; period <= periodNo; period += 1) {
      const pick =
        remaining.find((row) => row.left > 0 && !usedToday.has(row.subject_id)) ??
        remaining.find((row) => row.left > 0);
      if (!pick) break;
      pick.left -= 1;
      usedToday.add(pick.subject_id);
      slots.push({
        school_id: schoolId,
        academic_year_id: year.id,
        section_id: section.id,
        day_of_week: day,
        period_no: period,
        subject_id: pick.subject_id,
        teacher_user_id: pick.teacher_user_id,
        room: section.room,
      });
    }
  }
  if (slots.length) await manager.insert(TimetableSlot, slots);

  const students: { id: number; guardian_user_id: number | null }[] = await manager.query(
    `SELECT s.id, (SELECT g.user_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id
                   WHERE sg.student_id = s.id AND g.user_id IS NOT NULL LIMIT 1) AS guardian_user_id
     FROM students s JOIN student_enrollments e ON e.student_id = s.id AND e.section_id = $1
     WHERE s.deleted_at IS NULL AND s.status = 'active' ORDER BY e.roll_no NULLS LAST, s.id`,
    [section.id],
  );
  const from = addDays(today, -20) < year.start_date ? year.start_date : addDays(today, -20);
  const days = workingDays(from, addDays(today, -1), await holidaySet(manager, schoolId, from, today));
  for (const [dayIndex, date] of days.entries()) {
    const session = await manager.save(
      manager.create(AttendanceSession, {
        school_id: schoolId,
        academic_year_id: year.id,
        section_id: section.id,
        date,
        period: 0,
        subject_id: null,
        taken_by: section.class_teacher_user_id,
      }),
    );
    if (!students.length) continue;
    await manager.insert(
      AttendanceRecord,
      students.map((student, index) => {
        const odd = (dayIndex + index) % 7 === 0;
        const status: AttendanceStatus = odd ? ABSENT_PATTERN[(dayIndex + index) % ABSENT_PATTERN.length] : 'present';
        return {
          session_id: session.id,
          school_id: schoolId,
          student_id: student.id,
          date,
          period: 0,
          status,
          remarks: status === 'late' ? 'Came after assembly' : null,
          alert_sent: status === 'absent',
        };
      }),
    );
  }

  const parentStudent = students.find((student) => student.guardian_user_id);
  if (parentStudent) {
    await manager.insert(StudentLeave, {
      school_id: schoolId,
      student_id: parentStudent.id,
      from_date: addDays(today, 2),
      to_date: addDays(today, 3),
      reason: 'Family function in Madurai',
      status: 'pending',
      created_by: parentStudent.guardian_user_id,
    });
  }

  const staff: { user_id: number; staff_type: string; department: string | null }[] = await manager.query(
    `SELECT user_id, staff_type, department FROM staff WHERE school_id = $1 AND deleted_at IS NULL AND status = 'active'
     ORDER BY id`,
    [schoolId],
  );
  const [reportH, reportM] = school.staff_reporting_time.split(':').map(Number);
  const punches: Partial<StaffAttendance>[] = [];
  for (const [dayIndex, date] of days.entries()) {
    for (const [index, member] of staff.entries()) {
      if ((dayIndex + index) % 11 === 5) continue;
      const lateBy = (dayIndex + index) % 6 === 0 ? 18 : -10 + ((dayIndex * 3 + index) % 9);
      const inAt = new Date(`${date}T00:00:00+05:30`);
      inAt.setMinutes(reportH * 60 + reportM + lateBy);
      const outAt = new Date(`${date}T16:${String(5 + ((index * 7) % 40)).padStart(2, '0')}:00+05:30`);
      punches.push({
        school_id: schoolId,
        user_id: member.user_id,
        date,
        check_in_at: inAt,
        check_out_at: outAt,
        check_in_lat: school.latitude,
        check_in_lng: school.longitude,
        check_in_distance_m: 20 + ((index * 13) % 90),
        check_out_distance_m: 30 + ((index * 7) % 80),
        source: index % 3 === 0 ? 'biometric' : 'app',
        status: lateBy > 10 ? 'late' : 'present',
      });
    }
  }
  if (punches.length) await manager.insert(StaffAttendance, punches);

  await manager.insert(
    LeaveType,
    DEFAULT_LEAVE_TYPES.map(([code, name, days_per_year, is_paid], index) => ({
      school_id: schoolId,
      code,
      name,
      days_per_year,
      is_paid,
      is_active: true,
      sort_order: index + 1,
    })),
  );
  const casual = await manager.findOneByOrFail(LeaveType, { school_id: schoolId, code: 'CL' });
  const teacher = staff.find((member) => member.staff_type === 'teaching' && member.department === 'Science');
  if (teacher) {
    await manager.insert(StaffLeave, {
      school_id: schoolId,
      user_id: teacher.user_id,
      leave_type_id: casual.id,
      academic_year_id: year.id,
      from_date: addDays(today, 4),
      to_date: addDays(today, 4),
      half_day: false,
      days: '1',
      reason: 'Personal work at the bank',
      status: 'pending_principal',
      created_by: teacher.user_id,
    });
  }
  console.log(
    `Day 4     ${school.code}  ${slots.length} timetable periods for 6-A, ${days.length} days of attendance, ${punches.length} staff check-ins, 2 leave requests`,
  );
}
