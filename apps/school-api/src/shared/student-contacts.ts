import { EntityManager } from 'typeorm';

export interface TeacherContact {
  id: number;
  name: string;
  is_class_teacher: boolean;
  subjects: string[];
}

export interface ParentContact {
  id: number;
  name: string;
  relation: string;
  is_primary: boolean;
}

export async function teachersOfStudent(
  manager: EntityManager,
  schoolId: number,
  studentId: number,
): Promise<TeacherContact[]> {
  const rows: { id: number; name: string; is_class_teacher: boolean; subjects: string[] | null }[] =
    await manager.query(
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

export async function parentsOfStudent(
  manager: EntityManager,
  schoolId: number,
  studentId: number,
): Promise<ParentContact[]> {
  const rows: { id: number; name: string; relation: string; is_primary: boolean }[] = await manager.query(
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
