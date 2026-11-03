import { EntityManager } from 'typeorm';
import { ExamMark } from '../../modules/exams/entities/exam-mark.entity';
import { ExamSubject } from '../../modules/exams/entities/exam-subject.entity';
import { Exam } from '../../modules/exams/entities/exam.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { AcademicYear } from '../../modules/setup/entities/academic-year.entity';

const PRIMARY_SUBJECTS = ['ENG', 'TAM', 'MATH', 'EVS'];
const SUBJECT_SHIFT: Record<string, number> = { MATH: -6, SCI: -3, ENG: 4, TAM: 6, HIN: 2, SOC: 0, CS: 8, EVS: 5 };

function spread(seed: number): number {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
}

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export async function seedDemoExams(manager: EntityManager, school: School): Promise<void> {
  const schoolId = school.id;
  if (await manager.exists(Exam, { where: { school_id: schoolId, name: 'Quarterly exam' } })) {
    console.log(`Exams     ${school.code}  quarterly and half-yearly exams already set up: kept`);
    return;
  }
  const year = await manager.findOneByOrFail(AcademicYear, { school_id: schoolId, is_current: true });
  const startYear = year.start_date.slice(0, 4);
  const classes: { class_id: number }[] = await manager.query(
    `SELECT DISTINCT e.class_id FROM student_enrollments e
     JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL AND s.status = 'active'
     WHERE e.school_id = $1 AND e.academic_year_id = $2 AND e.section_id IS NOT NULL`,
    [schoolId, year.id],
  );
  if (!classes.length) return;
  const subjects: { id: number; code: string }[] = await manager.query(
    `SELECT id, code FROM subjects WHERE school_id = $1 AND deleted_at IS NULL ORDER BY id`,
    [schoolId],
  );
  const papersByClass = new Map<number, { id: number; code: string }[]>();
  for (const { class_id } of classes) {
    const own: { id: number; code: string }[] = await manager.query(
      `SELECT s.id, s.code FROM class_subjects cs JOIN subjects s ON s.id = cs.subject_id AND s.deleted_at IS NULL
       WHERE cs.class_id = $1 AND cs.academic_year_id = $2 AND s.type <> 'activity' ORDER BY s.name`,
      [class_id, year.id],
    );
    const fallback = PRIMARY_SUBJECTS.map((code) => subjects.find((subject) => subject.code === code)).filter(
      (subject): subject is { id: number; code: string } => Boolean(subject),
    );
    papersByClass.set(Number(class_id), own.length ? own : fallback);
  }

  const quarterly = await manager.save(
    manager.create(Exam, {
      school_id: schoolId,
      academic_year_id: year.id,
      name: 'Quarterly exam',
      start_date: `${startYear}-09-14`,
      end_date: `${startYear}-09-24`,
      status: 'published',
      published_at: new Date(`${startYear}-10-03T10:30:00+05:30`),
    }),
  );
  const halfYearly = await manager.save(
    manager.create(Exam, {
      school_id: schoolId,
      academic_year_id: year.id,
      name: 'Half-yearly exam',
      start_date: `${startYear}-12-07`,
      end_date: `${startYear}-12-18`,
      status: 'draft',
    }),
  );
  for (const exam of [quarterly, halfYearly]) {
    for (const [classId, papers] of papersByClass) {
      await manager.insert(
        ExamSubject,
        papers.map((paper, index) => ({
          school_id: schoolId,
          exam_id: exam.id,
          class_id: classId,
          subject_id: paper.id,
          max_marks: 100,
          pass_marks: 35,
          exam_date: addDays(exam.start_date, index + Math.floor(index / 5)),
        })),
      );
    }
  }

  let marks = 0;
  for (const [classId, papers] of papersByClass) {
    const students: { id: number; section_id: number }[] = await manager.query(
      `SELECT s.id, e.section_id FROM student_enrollments e
       JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL AND s.status = 'active'
       WHERE e.academic_year_id = $1 AND e.class_id = $2 AND e.section_id IS NOT NULL
       ORDER BY e.section_id, e.roll_no NULLS LAST, s.id`,
      [year.id, classId],
    );
    const sheet = new Map<number, (number | null)[]>();
    students.forEach((student, index) => {
      const ability = 42 + Math.round(spread(Number(student.id)) * 50);
      sheet.set(
        Number(student.id),
        papers.map((paper, paperIndex) => {
          const noise = Math.round((spread(Number(student.id) * 31 + paperIndex) - 0.5) * 16);
          const value = ability + (SUBJECT_SHIFT[paper.code] ?? 0) + noise;
          return Math.max(12, Math.min(100, value + (index === 0 ? 4 : 0)));
        }),
      );
    });
    if (students.length >= 3) {
      sheet.set(Number(students[2].id), [...sheet.get(Number(students[1].id))!]);
    }
    if (students.length >= 5) {
      const weak = sheet.get(Number(students[students.length - 1].id))!;
      weak[0] = 28;
    }
    if (students.length >= 4) {
      const absent = sheet.get(Number(students[3].id))!;
      absent[absent.length - 1] = null;
    }
    const rows = students.flatMap((student) =>
      papers.map((paper, paperIndex) => {
        const value = sheet.get(Number(student.id))![paperIndex];
        return {
          school_id: schoolId,
          exam_id: quarterly.id,
          student_id: Number(student.id),
          subject_id: paper.id,
          marks: value,
          is_absent: value === null,
          entered_by: null,
        };
      }),
    );
    if (rows.length) await manager.insert(ExamMark, rows);
    marks += rows.length;
  }
  console.log(
    `Exams     ${school.code}  Quarterly exam (published, ${papersByClass.size} classes, ${marks} marks) + Half-yearly exam (draft): created`,
  );
}
