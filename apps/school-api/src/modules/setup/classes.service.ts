import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AppException } from '@app/common';
import { ROLES } from '../access/access.catalog';
import { AcademicYearsService } from './academic-years.service';
import {
  ClassDto,
  ClassInputDto,
  ClassSubjectDto,
  PersonRefDto,
  SectionDto,
  SectionInputDto,
  SectionQueryDto,
  SetClassSubjectsDto,
  UpdateClassDto,
  UpdateSectionDto,
} from './dto/setup.dto';
import { ClassSubject } from './entities/class-subject.entity';
import { SchoolClass } from './entities/school-class.entity';
import { Section } from './entities/section.entity';
import { Subject } from './entities/subject.entity';

const STANDARD_CLASSES: [string, number][] = [
  ['LKG', -1],
  ['UKG', 0],
  ...Array.from({ length: 12 }, (_, index): [string, number] => [String(index + 1), index + 1]),
];

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Section) private readonly sections: Repository<Section>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(ClassSubject) private readonly classSubjectRepo: Repository<ClassSubject>,
    private readonly years: AcademicYearsService,
    private readonly dataSource: DataSource,
  ) {}

  async list(schoolId: number, yearId?: number): Promise<ClassDto[]> {
    const year = await this.years.resolve(schoolId, yearId);
    const classes = await this.classes.find({
      where: { school_id: schoolId },
      order: { grade_level: 'ASC', name: 'ASC' },
    });
    const sections = await this.sectionsFor(schoolId, year.id);
    return classes.map((schoolClass) => {
      const own = sections.filter((section) => section.class_id === schoolClass.id);
      return {
        id: schoolClass.id,
        name: schoolClass.name,
        grade_level: schoolClass.grade_level,
        student_count: own.reduce((sum, section) => sum + section.student_count, 0),
        sections: own,
      };
    });
  }

  async listSections(schoolId: number, query: SectionQueryDto): Promise<SectionDto[]> {
    const year = await this.years.resolve(schoolId, query.academic_year_id);
    const sections = await this.sectionsFor(schoolId, year.id);
    return query.class_id ? sections.filter((section) => section.class_id === query.class_id) : sections;
  }

  async createClass(schoolId: number, dto: ClassInputDto): Promise<ClassDto> {
    await this.assertClassNameFree(schoolId, dto.name);
    const created = await this.classes.save(this.classes.create({ ...dto, school_id: schoolId }));
    return { id: created.id, name: created.name, grade_level: created.grade_level, student_count: 0, sections: [] };
  }

  async createStandard(schoolId: number): Promise<ClassDto[]> {
    const existing = await this.classes.find({ where: { school_id: schoolId } });
    const names = new Set(existing.map((item) => item.name.toUpperCase()));
    const missing = STANDARD_CLASSES.filter(([name]) => !names.has(name.toUpperCase()));
    if (missing.length) {
      await this.classes.save(
        missing.map(([name, grade]) => this.classes.create({ school_id: schoolId, name, grade_level: grade })),
      );
    }
    return this.list(schoolId);
  }

  async updateClass(schoolId: number, id: number, dto: UpdateClassDto): Promise<{ id: number }> {
    const schoolClass = await this.findClass(schoolId, id);
    if (dto.name && dto.name.toUpperCase() !== schoolClass.name.toUpperCase())
      await this.assertClassNameFree(schoolId, dto.name);
    await this.classes.update(id, dto);
    return { id };
  }

  async removeClass(schoolId: number, id: number): Promise<{ id: number }> {
    await this.findClass(schoolId, id);
    const [{ used }] = await this.dataSource.query(
      `SELECT (SELECT COUNT(*) FROM sections WHERE class_id = $1 AND deleted_at IS NULL)
            + (SELECT COUNT(*) FROM student_enrollments WHERE class_id = $1)
            + (SELECT COUNT(*) FROM admissions WHERE class_id = $1 AND deleted_at IS NULL) AS used`,
      [id],
    );
    if (Number(used)) throw AppException.conflict('This class has sections, students or applications', 'CLASS_IN_USE');
    await this.classes.softDelete(id);
    return { id };
  }

  async createSection(schoolId: number, dto: SectionInputDto): Promise<SectionDto> {
    await this.findClass(schoolId, dto.class_id);
    const year = await this.years.resolve(schoolId, dto.academic_year_id);
    await this.assertSectionNameFree(dto.class_id, year.id, dto.name);
    if (dto.class_teacher_user_id) await this.assertTeacher(schoolId, dto.class_teacher_user_id);
    const section = await this.sections.save(
      this.sections.create({
        school_id: schoolId,
        class_id: dto.class_id,
        academic_year_id: year.id,
        name: dto.name,
        room: dto.room ?? null,
        capacity: dto.capacity ?? 40,
        class_teacher_user_id: dto.class_teacher_user_id ?? null,
      }),
    );
    return this.getSection(schoolId, section.id);
  }

  async updateSection(schoolId: number, id: number, dto: UpdateSectionDto): Promise<SectionDto> {
    const section = await this.findSection(schoolId, id);
    if (dto.class_id && dto.class_id !== section.class_id) {
      throw AppException.badRequest(
        'A section cannot move to another class. Create a new section instead.',
        'SECTION_CLASS_FIXED',
      );
    }
    if (dto.name && dto.name !== section.name)
      await this.assertSectionNameFree(section.class_id, section.academic_year_id, dto.name);
    if (dto.class_teacher_user_id) await this.assertTeacher(schoolId, dto.class_teacher_user_id);
    const fields = Object.fromEntries(
      Object.entries(dto).filter(
        ([key, value]) => value !== undefined && key !== 'class_id' && key !== 'academic_year_id',
      ),
    );
    if (Object.keys(fields).length) await this.sections.update(id, fields);
    return this.getSection(schoolId, id);
  }

  async removeSection(schoolId: number, id: number): Promise<{ id: number }> {
    await this.findSection(schoolId, id);
    const [{ used }] = await this.dataSource.query(
      `SELECT COUNT(*) AS used FROM student_enrollments WHERE section_id = $1`,
      [id],
    );
    if (Number(used)) throw AppException.conflict('Move the students out of this section first', 'SECTION_IN_USE');
    await this.sections.softDelete(id);
    return { id };
  }

  async teachers(schoolId: number): Promise<PersonRefDto[]> {
    const rows: { id: number; name: string }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id, u.name FROM users u
       JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
       WHERE u.school_id = $1 AND u.deleted_at IS NULL AND u.status = 'active' AND r.code = ANY($2)
       ORDER BY u.name`,
      [schoolId, [ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL]],
    );
    return rows.map((row) => ({ id: Number(row.id), name: row.name }));
  }

  async classSubjects(schoolId: number, classId: number, yearId?: number): Promise<ClassSubjectDto[]> {
    await this.findClass(schoolId, classId);
    const year = await this.years.resolve(schoolId, yearId);
    const rows = await this.classSubjectRepo.find({
      where: { class_id: classId, academic_year_id: year.id },
      relations: { subject: true },
    });
    return rows
      .filter((row) => row.subject && !row.subject.deleted_at)
      .sort((a, b) => a.subject!.name.localeCompare(b.subject!.name))
      .map((row) => ({
        subject_id: row.subject_id,
        code: row.subject!.code,
        name: row.subject!.name,
        type: row.subject!.type,
        periods_per_week: row.periods_per_week,
        is_optional: row.is_optional,
      }));
  }

  async setClassSubjects(schoolId: number, classId: number, dto: SetClassSubjectsDto): Promise<ClassSubjectDto[]> {
    await this.findClass(schoolId, classId);
    const year = await this.years.resolve(schoolId, dto.academic_year_id);
    const ids = [...new Set(dto.items.map((item) => item.subject_id))];
    if (ids.length !== dto.items.length)
      throw AppException.badRequest('A subject is listed twice', 'DUPLICATE_SUBJECT');
    const found = ids.length ? await this.subjects.countBy({ id: In(ids), school_id: schoolId }) : 0;
    if (found !== ids.length)
      throw AppException.badRequest('One of the subjects does not exist in this school', 'SUBJECT_NOT_FOUND');

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ClassSubject, { class_id: classId, academic_year_id: year.id });
      if (dto.items.length) {
        await manager.insert(
          ClassSubject,
          dto.items.map((item) => ({
            school_id: schoolId,
            class_id: classId,
            academic_year_id: year.id,
            subject_id: item.subject_id,
            periods_per_week: item.periods_per_week ?? 0,
            is_optional: item.is_optional ?? false,
          })),
        );
      }
    });
    return this.classSubjects(schoolId, classId, year.id);
  }

  async findClass(schoolId: number, id: number): Promise<SchoolClass> {
    const schoolClass = await this.classes.findOneBy({ id, school_id: schoolId });
    if (!schoolClass) throw AppException.notFound('Class not found', 'CLASS_NOT_FOUND');
    return schoolClass;
  }

  async findSection(schoolId: number, id: number): Promise<Section> {
    const section = await this.sections.findOneBy({ id, school_id: schoolId });
    if (!section) throw AppException.notFound('Section not found', 'SECTION_NOT_FOUND');
    return section;
  }

  private async getSection(schoolId: number, id: number): Promise<SectionDto> {
    const section = await this.findSection(schoolId, id);
    const all = await this.sectionsFor(schoolId, section.academic_year_id);
    return all.find((item) => item.id === id)!;
  }

  private async sectionsFor(schoolId: number, yearId: number): Promise<SectionDto[]> {
    const rows: {
      id: number;
      class_id: number;
      class_name: string;
      grade_level: number;
      name: string;
      room: string | null;
      capacity: number;
      teacher_id: number | null;
      teacher_name: string | null;
      student_count: string;
    }[] = await this.dataSource.query(
      `SELECT s.id, s.class_id, c.name AS class_name, c.grade_level, s.name, s.room, s.capacity,
              u.id AS teacher_id, u.name AS teacher_name,
              (SELECT COUNT(*) FROM student_enrollments e JOIN students st ON st.id = e.student_id
                 WHERE e.section_id = s.id AND st.deleted_at IS NULL AND st.status = 'active') AS student_count
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.class_teacher_user_id AND u.deleted_at IS NULL
       WHERE s.school_id = $1 AND s.academic_year_id = $2 AND s.deleted_at IS NULL
       ORDER BY c.grade_level, s.name`,
      [schoolId, yearId],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      class_id: Number(row.class_id),
      class_name: row.class_name,
      name: row.name,
      room: row.room,
      capacity: Number(row.capacity),
      class_teacher: row.teacher_id ? { id: Number(row.teacher_id), name: row.teacher_name ?? '' } : null,
      student_count: Number(row.student_count),
    }));
  }

  private async assertTeacher(schoolId: number, userId: number): Promise<void> {
    const teachers = await this.teachers(schoolId);
    if (!teachers.some((teacher) => teacher.id === userId)) {
      throw AppException.badRequest('The class teacher must be an active teacher in this school', 'NOT_A_TEACHER');
    }
  }

  private async assertClassNameFree(schoolId: number, name: string): Promise<void> {
    const taken = await this.classes
      .createQueryBuilder('c')
      .where('c.school_id = :schoolId AND UPPER(c.name) = UPPER(:name)', { schoolId, name })
      .getExists();
    if (taken) throw AppException.conflict(`Class ${name} already exists`, 'CLASS_EXISTS');
  }

  private async assertSectionNameFree(classId: number, yearId: number, name: string): Promise<void> {
    if (await this.sections.exists({ where: { class_id: classId, academic_year_id: yearId, name } })) {
      throw AppException.conflict(`Section ${name} already exists in this class`, 'SECTION_EXISTS');
    }
  }
}
