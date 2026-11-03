import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '@app/common';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from './achievements.service';
import { StudentAchievement } from './entities/student-achievement.entity';

const actor = { id: 9, school_id: 1 } as AuthUser;

function build(parents: number[]) {
  const saved: Partial<StudentAchievement>[] = [];
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      const row = { ...value, id: 5, created_at: new Date() };
      saved.push(row);
      return row;
    }),
  } as unknown as Repository<StudentAchievement>;
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('FROM students')) return [{ id: 12, name: 'Kavin Narayanan' }];
    if (sql.includes('student_guardians')) return parents.map((id) => ({ user_id: id }));
    if (sql.includes('FROM users')) return [{ id: 9, name: 'Priya Venkatesh' }];
    return [];
  });
  const files = {
    assertAttachable: jest.fn(),
    presentMany: jest.fn(async () => new Map()),
  } as unknown as FilesService;
  const dispatch = jest.fn(async () => undefined);
  const notifications = { dispatch } as unknown as NotificationsService;
  const service = new AchievementsService(repo, files, notifications, { query } as unknown as DataSource);
  return { service, dispatch, files, saved };
}

const input = { title: 'District chess', category: 'competition' as const, achieved_on: '2026-10-24' };

describe('AchievementsService.create', () => {
  it('saves with school defaults and tells the parents', async () => {
    const { service, dispatch, saved } = build([31, 32]);
    const result = await service.create(1, 12, { ...input, position: '1st place', level: 'district' }, actor);
    expect(saved[0]).toMatchObject({ level: 'district', visible_to_parent: true, created_by: 9 });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'ACHIEVEMENT_ADDED',
        audience: { user_ids: [31, 32] },
        data: expect.objectContaining({ student: 'Kavin Narayanan', level: 'District', position: ' (1st place)' }),
      }),
    );
    expect(result.added_by).toEqual({ id: 9, name: 'Priya Venkatesh' });
  });

  it('does not tell parents about a staff-only achievement', async () => {
    const { service, dispatch } = build([31]);
    await service.create(1, 12, { ...input, visible_to_parent: false }, actor);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('checks an attached certificate belongs to the school', async () => {
    const { service, files } = build([]);
    await service.create(1, 12, { ...input, file_id: 77 }, actor);
    expect(files.assertAttachable).toHaveBeenCalledWith(77, 1);
  });
});
