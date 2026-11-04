import { affectedPeriods, balanceAfter, impactSummary, sectionsOf } from './teacher-insights.logic';

const slots = [
  { day_of_week: 2, period_no: 3, start_time: '10:35', section: '8 - C', subject: 'Science' },
  { day_of_week: 2, period_no: 1, start_time: '08:50', section: '6 - A', subject: 'Mathematics' },
  { day_of_week: 3, period_no: 2, start_time: '09:35', section: '7 - B', subject: 'Mathematics' },
];

describe('leave impact', () => {
  it('lists my periods on each leave day in period order', () => {
    const periods = affectedPeriods(['2026-11-10', '2026-11-11'], slots);
    expect(periods.map((period) => `${period.date} P${period.period_no} ${period.section}`)).toEqual([
      '2026-11-10 P1 6 - A',
      '2026-11-10 P3 8 - C',
      '2026-11-11 P2 7 - B',
    ]);
    expect(sectionsOf(periods)).toEqual(['6 - A', '8 - C', '7 - B']);
  });

  it('works out the balance after the leave', () => {
    expect(balanceAfter(8, 2)).toBe(6);
    expect(balanceAfter(1, 0.5)).toBe(0.5);
    expect(balanceAfter(null, 3)).toBeNull();
  });

  it('writes the warning line', () => {
    const periods = affectedPeriods(['2026-11-10', '2026-11-11'], slots);
    expect(impactSummary(periods, ['6 - A'], ['2026-11-10'])).toBe(
      'You have 3 periods, including 6 - A morning attendance on these days.',
    );
    expect(impactSummary([], [], ['2026-11-10'])).toBe('No classes on these days.');
  });
});
