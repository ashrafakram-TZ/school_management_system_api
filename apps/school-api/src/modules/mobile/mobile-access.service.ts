import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { FilesService } from '../files/files.service';
import { StudentRecordsService } from '../student-records/student-records.service';
import { GuardiansService } from '../students/guardians.service';
import { ChildCardDto } from './dto/mobile.dto';

@Injectable()
export class MobileAccessService {
  constructor(
    private readonly guardians: GuardiansService,
    private readonly records: StudentRecordsService,
    private readonly files: FilesService,
    private readonly dataSource: DataSource,
  ) {}

  async childSchool(userId: number, studentId: number): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT s.school_id FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL
       JOIN students s ON s.id = sg.student_id AND s.deleted_at IS NULL AND s.status = 'active'
       WHERE g.user_id = $1 AND sg.student_id = $2 LIMIT 1`,
      [userId, studentId],
    );
    if (!row) throw AppException.notFound('This child is not linked to your mobile number', 'CHILD_NOT_FOUND');
    return Number(row.school_id);
  }

  async childCard(userId: number, studentId: number): Promise<ChildCardDto> {
    const schoolId = await this.childSchool(userId, studentId);
    const child = (await this.guardians.childrenForUser(userId)).find((item) => item.id === studentId);
    if (!child) throw AppException.notFound('This child is not linked to your mobile number', 'CHILD_NOT_FOUND');
    const [row] = await this.dataSource.query(
      `SELECT s.blood_group, s.house, to_char(s.admission_date, 'YYYY-MM-DD') AS admission_date, y.name AS academic_year
       FROM students s
       LEFT JOIN academic_years y ON y.school_id = s.school_id AND y.is_current = true AND y.deleted_at IS NULL
       WHERE s.id = $1`,
      [studentId],
    );
    const [photos, counts] = await Promise.all([
      this.files.presentMany([child.photo_file_id]),
      this.records.counts(schoolId, studentId),
    ]);
    return {
      ...child,
      photo_url: child.photo_file_id ? (photos.get(child.photo_file_id)?.url ?? null) : null,
      blood_group: row?.blood_group ?? null,
      house: row?.house ?? null,
      admission_date: row?.admission_date,
      academic_year: row?.academic_year ?? null,
      counts,
    };
  }

  teacherSchool(user: AuthUser): number {
    if (!user.school_id) throw AppException.forbidden('Your account is not linked to a school', 'NO_SCHOOL');
    return user.school_id;
  }
}
