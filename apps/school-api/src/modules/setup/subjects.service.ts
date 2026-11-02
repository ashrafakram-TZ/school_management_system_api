import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException, listQuery, Paginated } from '@app/common';
import { SubjectDto, SubjectInputDto, SubjectQueryDto, UpdateSubjectDto } from './dto/setup.dto';
import { AcademicYear } from './entities/academic-year.entity';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(AcademicYear) private readonly years: Repository<AcademicYear>,
    private readonly dataSource: DataSource,
  ) {}

  async list(schoolId: number, query: SubjectQueryDto): Promise<Paginated<SubjectDto>> {
    const qb = this.subjects.createQueryBuilder('subject').where('subject.school_id = :schoolId', { schoolId });
    if (query.type) qb.andWhere('subject.type = :type', { type: query.type });
    const ordered = query.sort ? query : { ...query, sort: 'name', order: 'asc' as const };
    const page = await listQuery(qb, ordered, {
      searchable: ['subject.name', 'subject.code'],
      sortable: { name: 'subject.name', code: 'subject.code', created_at: 'subject.created_at' },
      defaultSort: 'name',
    });
    const counts = await this.classCounts(schoolId);
    return {
      ...page,
      items: page.items.map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        type: subject.type,
        class_count: counts.get(subject.id) ?? 0,
      })),
    };
  }

  async create(schoolId: number, dto: SubjectInputDto): Promise<SubjectDto> {
    await this.assertCodeFree(schoolId, dto.code);
    const subject = await this.subjects.save(
      this.subjects.create({ ...dto, school_id: schoolId, type: dto.type ?? 'theory' }),
    );
    return { id: subject.id, code: subject.code, name: subject.name, type: subject.type, class_count: 0 };
  }

  async update(schoolId: number, id: number, dto: UpdateSubjectDto): Promise<SubjectDto> {
    const subject = await this.find(schoolId, id);
    if (dto.code && dto.code !== subject.code) await this.assertCodeFree(schoolId, dto.code);
    await this.subjects.update(id, dto);
    const updated = await this.find(schoolId, id);
    const counts = await this.classCounts(schoolId);
    return { id, code: updated.code, name: updated.name, type: updated.type, class_count: counts.get(id) ?? 0 };
  }

  async remove(schoolId: number, id: number): Promise<{ id: number }> {
    await this.find(schoolId, id);
    const [{ used }] = await this.dataSource.query(
      `SELECT COUNT(*) AS used FROM class_subjects WHERE subject_id = $1`,
      [id],
    );
    if (Number(used)) throw AppException.conflict('Remove this subject from its classes first', 'SUBJECT_IN_USE');
    await this.subjects.softDelete(id);
    return { id };
  }

  private async find(schoolId: number, id: number): Promise<Subject> {
    const subject = await this.subjects.findOneBy({ id, school_id: schoolId });
    if (!subject) throw AppException.notFound('Subject not found', 'SUBJECT_NOT_FOUND');
    return subject;
  }

  private async assertCodeFree(schoolId: number, code: string): Promise<void> {
    if (await this.subjects.exists({ where: { school_id: schoolId, code } })) {
      throw AppException.conflict(`Subject code ${code} already exists`, 'SUBJECT_CODE_TAKEN');
    }
  }

  private async classCounts(schoolId: number): Promise<Map<number, number>> {
    const year = await this.years.findOneBy({ school_id: schoolId, is_current: true });
    if (!year) return new Map();
    const rows: { subject_id: number; count: string }[] = await this.dataSource.query(
      `SELECT subject_id, COUNT(*) AS count FROM class_subjects WHERE school_id = $1 AND academic_year_id = $2 GROUP BY subject_id`,
      [schoolId, year.id],
    );
    return new Map(rows.map((row) => [Number(row.subject_id), Number(row.count)]));
  }
}
