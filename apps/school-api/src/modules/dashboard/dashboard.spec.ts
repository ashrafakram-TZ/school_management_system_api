import { PERMISSIONS } from '../access/access.catalog';
import { busCounts, staffToday, studentsToday, visibleSections, whenAllowed } from './dashboard.logic';

describe('visibleSections', () => {
  it('shows a section only with its permission', () => {
    const show = visibleSections([PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.FLEET_VIEW]);
    expect(show).toEqual({
      students: true,
      staff: false,
      attendance: false,
      buses: true,
      alerts: true,
      fees: false,
      exams: false,
    });
  });

  it('hides everything without permissions', () => {
    expect(Object.values(visibleSections([])).every((value) => !value)).toBe(true);
  });
});

describe('whenAllowed', () => {
  it('skips the loader when not allowed', async () => {
    const load = jest.fn().mockResolvedValue(5);
    await expect(whenAllowed(false, load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
    await expect(whenAllowed(true, load)).resolves.toBe(5);
  });
});

describe('studentsToday', () => {
  it('counts late and half day as present and keeps the board percent', () => {
    expect(
      studentsToday({
        working_day: true,
        sections_total: 14,
        sections_not_marked: 2,
        summary: { present: 300, late: 10, half_day: 2, absent: 20, leave: 4, percent: 92.6 },
      }),
    ).toEqual({
      working_day: true,
      marked_sections: 12,
      total_sections: 14,
      present: 312,
      absent: 20,
      on_leave: 4,
      percent: 92.6,
    });
  });
});

describe('staffToday', () => {
  it('rounds the check-in percent to one decimal and leaves out staff on leave', () => {
    const today = staffToday({ total: 31, present: 24, late: 2, on_leave: 2, not_checked_in: 3 });
    expect(today).toEqual({ total: 31, checked_in: 26, late: 2, on_leave: 2, absent: 3, percent: 89.7 });
  });

  it('gives null percent when nobody is expected', () => {
    expect(staffToday({ total: 2, present: 0, late: 0, on_leave: 2, not_checked_in: 0 }).percent).toBeNull();
    expect(staffToday({ total: 0, present: 0, late: 0, on_leave: 0, not_checked_in: 0 }).percent).toBeNull();
  });
});

describe('busCounts', () => {
  it('counts only the school buses from the live list', () => {
    const live = {
      vehicles: [
        { id: 1, state: 'moving' },
        { id: 2, state: 'idle' },
        { id: 3, state: 'offline' },
        { id: 99, state: 'moving' },
      ],
    };
    expect(busCounts([1, 2, 3, null], live)).toEqual({
      telematics_available: true,
      total: 4,
      with_tracker: 3,
      live: 2,
      moving: 1,
      offline: 2,
    });
  });

  it('degrades when Telematics is down', () => {
    expect(busCounts([1, 2], null)).toEqual({
      telematics_available: false,
      total: 2,
      with_tracker: 2,
      live: null,
      moving: null,
      offline: null,
    });
  });
});
