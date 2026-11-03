import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementDto, AchievementInputDto, UpdateAchievementDto } from './dto/achievement.dto';
import { StudentAchievement } from './entities/student-achievement.entity';

export const LEVEL_LABELS: Record<string, string> = {
  class: 'Class',
  school: 'School',
  zone: 'Zone',
  district: 'District',
  state: 'State',
  national: 'National',
  international: 'International',
};

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger('Achievements');

  constructor(
    @InjectRepository(StudentAchievement) private readonly achievements: Repository<StudentAchievement>,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async list(schoolId: number, studentId: number, options: { parent?: boolean } = {}): Promise<AchievementDto[]> {
    await this.student(schoolId, studentId);
    const rows = await this.achievements.find({
      where: { school_id: schoolId, student_id: studentId, ...(options.parent ? { visible_to_parent: true } : {}) },
      order: { achieved_on: 'DESC', id: 'DESC' },
    });
    return this.present(rows);
  }

  async create(
    schoolId: number,
    studentId: number,
    dto: AchievementInputDto,
    actor: AuthUser,
  ): Promise<AchievementDto> {
    const student = await this.student(schoolId, studentId);
    if (dto.file_id) await this.files.assertAttachable(dto.file_id, schoolId);
    const saved = await this.achievements.save(
      this.achievements.create({
        school_id: schoolId,
        student_id: studentId,
        title: dto.title,
        category: dto.category,
        level: dto.level ?? 'school',
        position: dto.position ?? null,
        achieved_on: dto.achieved_on,
        description: dto.description ?? null,
        file_id: dto.file_id ?? null,
        visible_to_parent: dto.visible_to_parent ?? true,
        created_by: actor.id,
      }),
    );
    if (saved.visible_to_parent) await this.notifyParents(saved, student.name);
    return (await this.present([saved]))[0]!;
  }

  async update(schoolId: number, studentId: number, id: number, dto: UpdateAchievementDto): Promise<AchievementDto> {
    const row = await this.find(schoolId, studentId, id);
    if (dto.file_id && dto.file_id !== row.file_id) await this.files.assertAttachable(dto.file_id, schoolId);
    await this.achievements.save(this.achievements.merge(row, dto));
    return (await this.present([row]))[0]!;
  }

  async remove(schoolId: number, studentId: number, id: number): Promise<void> {
    const row = await this.find(schoolId, studentId, id);
    await this.achievements.softDelete(row.id);
  }

  async count(schoolId: number, studentId: number): Promise<number> {
    return this.achievements.countBy({ school_id: schoolId, student_id: studentId });
  }

  private async notifyParents(row: StudentAchievement, studentName: string): Promise<void> {
    const parents: { user_id: number }[] = await this.dataSource.query(
      `SELECT DISTINCT g.user_id FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL AND g.user_id IS NOT NULL
       WHERE sg.student_id = $1 AND sg.receives_alerts = true`,
      [row.student_id],
    );
    if (!parents.length) return;
    await this.notifications
      .dispatch({
        template: 'ACHIEVEMENT_ADDED',
        audience: { user_ids: parents.map((parent) => Number(parent.user_id)) },
        data: {
          student: studentName,
          title: row.title,
          level: LEVEL_LABELS[row.level] ?? row.level,
          position: row.position ? ` (${row.position})` : '',
        },
      })
      .catch((error: Error) => this.logger.warn(`Achievement ${row.id} alert not sent: ${error.message}`));
  }

  private async student(schoolId: number, studentId: number): Promise<{ id: number; name: string }> {
    const [row] = await this.dataSource.query(
      `SELECT id, concat_ws(' ', first_name, last_name) AS name FROM students
       WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
      [studentId, schoolId],
    );
    if (!row) throw AppException.notFound('Student not found', 'STUDENT_NOT_FOUND');
    return { id: Number(row.id), name: row.name };
  }

  private async find(schoolId: number, studentId: number, id: number): Promise<StudentAchievement> {
    const row = await this.achievements.findOneBy({ id, school_id: schoolId, student_id: studentId });
    if (!row) throw AppException.notFound('Achievement not found', 'ACHIEVEMENT_NOT_FOUND');
    return row;
  }

  private async present(rows: StudentAchievement[]): Promise<AchievementDto[]> {
    if (!rows.length) return [];
    const [files, people] = await Promise.all([
      this.files.presentMany(rows.map((row) => row.file_id)),
      this.dataSource.query(`SELECT id, name FROM users WHERE id = ANY($1)`, [
        [...new Set(rows.map((row) => row.created_by).filter(Boolean))],
      ]) as Promise<{ id: number; name: string }[]>,
    ]);
    return rows.map((row) => {
      const person = people.find((item) => Number(item.id) === row.created_by);
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        level: row.level,
        position: row.position,
        achieved_on: row.achieved_on,
        description: row.description,
        file: row.file_id ? (files.get(row.file_id) ?? null) : null,
        visible_to_parent: row.visible_to_parent,
        added_by: person ? { id: Number(person.id), name: person.name } : null,
        created_at: row.created_at,
      };
    });
  }
}
