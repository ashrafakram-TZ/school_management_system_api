import { summarise } from './attendance.service';

describe('summarise', () => {
  it('counts each status and weighs half days as half', () => {
    expect(summarise(['present', 'late', 'half_day', 'absent', 'leave'])).toEqual({
      total: 5,
      present: 1,
      absent: 1,
      late: 1,
      half_day: 1,
      leave: 1,
      percent: 50,
    });
  });

  it('returns no percent when nothing is marked', () => {
    expect(summarise([]).percent).toBeNull();
  });

  it('treats late as attended', () => {
    expect(summarise(['late', 'present']).percent).toBe(100);
  });
});
