import { teacherBanners, TeacherDayFacts } from './banner.logic';

const day = (patch: Partial<TeacherDayFacts> = {}): TeacherDayFacts => ({
  holiday: null,
  sunday: false,
  leaveType: null,
  checkedIn: true,
  reportingTime: '08:45',
  now: '10:00',
  proxies: [],
  combined: [],
  unmarkedSections: [],
  pendingLeaves: 0,
  staffApprovals: 0,
  unread: 0,
  ...patch,
});

describe('teacherBanners', () => {
  it('is empty when everything is done', () => {
    expect(teacherBanners(day())).toEqual([]);
  });

  it('warns after the reporting time and only informs before it', () => {
    expect(teacherBanners(day({ checkedIn: false }))[0]).toMatchObject({
      code: 'CHECK_IN_PENDING',
      severity: 'warning',
      action: { screen: 'check_in' },
    });
    expect(teacherBanners(day({ checkedIn: false, now: '08:10' }))[0]).toMatchObject({
      code: 'CHECK_IN_PENDING',
      severity: 'info',
    });
  });

  it('puts warnings before information', () => {
    const banners = teacherBanners(
      day({
        unread: 3,
        pendingLeaves: 2,
        unmarkedSections: [{ id: 5, name: '3 - A' }],
        proxies: [{ period_no: 3, section: '6 - A', subject: 'Science', start_time: '10:35' }],
      }),
    );
    expect(banners.map((banner) => banner.code)).toEqual([
      'ATTENDANCE_NOT_MARKED',
      'PROXY_TODAY',
      'LEAVE_REQUESTS_PENDING',
      'UNREAD_ALERTS',
    ]);
    expect(banners[0]!.action.params).toEqual({ section_id: 5 });
    expect(banners[1]!.message).toBe('P3 10:35 · 6 - A Science');
  });

  it('skips check-in and attendance on a holiday or while on leave', () => {
    const holiday = teacherBanners(
      day({ holiday: 'Deepavali', checkedIn: false, unmarkedSections: [{ id: 5, name: '3 - A' }] }),
    );
    expect(holiday.map((banner) => banner.code)).toEqual(['HOLIDAY_TODAY']);
    const leave = teacherBanners(day({ leaveType: 'Casual leave', checkedIn: false, pendingLeaves: 1 }));
    expect(leave.map((banner) => banner.code)).toEqual(['ON_LEAVE_TODAY', 'LEAVE_REQUESTS_PENDING']);
    expect(leave[0]!.title).toBe('You are on casual leave today');
  });

  it('tells the teacher when another section joins the class', () => {
    const [banner] = teacherBanners(
      day({ combined: [{ period_no: 2, from: '6 - A', group: 'the boys', section: '6 - B', start_time: '09:35' }] }),
    );
    expect(banner).toMatchObject({
      code: 'COMBINED_CLASS_TODAY',
      title: '6 - A joins your class',
      message: 'In P2 (09:35), the boys of 6 - A sit with 6 - B.',
    });
  });

  it('informs the teacher about an upcoming holiday', () => {
    const [banner] = teacherBanners(day({ upcomingHoliday: { name: 'Deepavali', date: '2026-11-08', daysUntil: 2 } }));
    expect(banner).toMatchObject({
      code: 'UPCOMING_HOLIDAY',
      title: 'Upcoming Holiday: Deepavali',
      message: 'Deepavali on 2026-11-08 (in 2 days). School will remain closed.',
      action: { screen: 'holidays' },
    });
  });
});
