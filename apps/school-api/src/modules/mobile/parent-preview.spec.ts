import { DataSource } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { AchievementsService } from '../achievements/achievements.service';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TripsService } from '../tracking/trips.service';
import { MobileAccessService } from './mobile-access.service';
import { ParentPreviewService } from './parent-preview.service';

const build = (rows: { student: unknown[]; parent: unknown[] }) => {
  const query = jest.fn((sql: string) =>
    Promise.resolve(sql.includes('student_guardians') ? rows.parent : rows.student),
  );
  const access = { childCard: jest.fn().mockResolvedValue({ id: 7, full_name: 'Kavin' }) };
  const attendance = { todayStatus: jest.fn().mockResolvedValue('present') };
  const notifications = { mine: jest.fn().mockResolvedValue({ items: [{ id: 1 }], total: 1 }) };
  const service = new ParentPreviewService(
    access as unknown as MobileAccessService,
    attendance as unknown as AttendanceService,
    {} as TripsService,
    {} as AchievementsService,
    notifications as unknown as NotificationsService,
    { query } as unknown as DataSource,
    { timeZone: 'Asia/Kolkata' } as AppConfig,
  );
  return { service, access, notifications };
};

describe('ParentPreviewService', () => {
  it('shows the child card of the primary parent with today’s attendance', async () => {
    const { service, access } = build({
      student: [{ id: 7 }],
      parent: [{ user_id: '42', name: 'Lakshmi', relation: 'mother' }],
    });
    const home = await service.home(1, 7);
    expect(access.childCard).toHaveBeenCalledWith(42, 7);
    expect(home.parent).toEqual({ user_id: 42, name: 'Lakshmi', relation: 'mother' });
    expect(home.child).toMatchObject({ full_name: 'Kavin' });
    expect(home.today.status).toBe('present');
  });

  it('returns no child card and no notifications when no parent can sign in', async () => {
    const { service, access, notifications } = build({ student: [{ id: 7 }], parent: [] });
    expect((await service.home(1, 7)).child).toBeNull();
    expect(access.childCard).not.toHaveBeenCalled();
    const page = await service.notifications(1, 7, { page: 1, limit: 10 });
    expect(page.items).toEqual([]);
    expect(notifications.mine).not.toHaveBeenCalled();
  });

  it('rejects a student of another school', async () => {
    const { service } = build({ student: [], parent: [] });
    await expect(service.home(1, 7)).rejects.toMatchObject({ response: { code: 'STUDENT_NOT_FOUND' } });
  });
});
