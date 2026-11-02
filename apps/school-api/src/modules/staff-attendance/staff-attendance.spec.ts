import { insideGeofence, isLate } from './staff-attendance.service';

describe('isLate', () => {
  const at = (time: string) => new Date(`2026-11-02T${time}:00+05:30`);

  it('allows a 10 minute grace after the reporting time', () => {
    expect(isLate(at('08:55'), '08:45', 'Asia/Kolkata')).toBe(false);
  });

  it('marks late after the grace', () => {
    expect(isLate(at('08:56'), '08:45', 'Asia/Kolkata')).toBe(true);
  });

  it('uses the school time zone, not UTC', () => {
    expect(isLate(new Date('2026-11-02T03:10:00Z'), '08:45', 'Asia/Kolkata')).toBe(false);
  });
});

describe('insideGeofence', () => {
  it('accepts a phone inside the radius', () => {
    expect(insideGeofence(150, 200)).toBe(true);
  });

  it('rejects a phone outside the radius', () => {
    expect(insideGeofence(450, 200, 10)).toBe(false);
  });

  it('allows for GPS accuracy, but at most 50 m', () => {
    expect(insideGeofence(230, 200, 40)).toBe(true);
    expect(insideGeofence(260, 200, 500)).toBe(false);
  });
});
