import { addDays, datesBetween, distanceMetres, monthRange, percent, workingDays } from './school-days';

describe('school days', () => {
  it('adds days across a month end', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('lists every date in a range', () => {
    expect(datesBetween('2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('knows the length of a month', () => {
    expect(monthRange('2027-02')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
  });

  it('skips Sundays and holidays', () => {
    expect(workingDays('2026-11-07', '2026-11-10', new Set(['2026-11-09']))).toEqual(['2026-11-07', '2026-11-10']);
  });

  it('measures distance between two points', () => {
    const metres = distanceMetres(13.0827, 80.2707, 13.0827, 80.2737);
    expect(metres).toBeGreaterThan(320);
    expect(metres).toBeLessThan(330);
  });

  it('rounds a percent to one decimal and returns null for nothing', () => {
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(0, 0)).toBeNull();
  });
});
