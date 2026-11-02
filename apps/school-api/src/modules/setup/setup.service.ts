import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AcademicYearsService } from './academic-years.service';
import { SetupSummaryDto } from './dto/setup.dto';
import { HolidaysService } from './holidays.service';

@Injectable()
export class SetupService {
  constructor(
    private readonly years: AcademicYearsService,
    private readonly holidays: HolidaysService,
    private readonly dataSource: DataSource,
  ) {}

  async summary(schoolId: number): Promise<SetupSummaryDto> {
    const currentYear = await this.years.currentOrNull(schoolId);
    const [counts] = await this.dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM classes WHERE school_id = $1 AND deleted_at IS NULL) AS classes,
         (SELECT COUNT(*) FROM subjects WHERE school_id = $1 AND deleted_at IS NULL) AS subjects,
         (SELECT COUNT(*) FROM sections WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL) AS sections,
         (SELECT COUNT(*) FROM sections WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL
            AND class_teacher_user_id IS NULL) AS sections_without_teacher`,
      [schoolId, currentYear?.id ?? 0],
    );
    return {
      current_year: currentYear,
      classes: Number(counts.classes),
      sections: Number(counts.sections),
      subjects: Number(counts.subjects),
      sections_without_teacher: Number(counts.sections_without_teacher),
      next_holiday: await this.holidays.next(schoolId),
    };
  }
}
