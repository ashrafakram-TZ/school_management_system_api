import { passengerRef } from './routes.service';
import { alertThreshold, autoSequence, daysBetween, expiryState, pathKm } from './transport.logic';

const school = { lat: 13.0878, lng: 80.2101 };

describe('autoSequence', () => {
  it('starts at the stop farthest from school and ends nearest to it', () => {
    const stops = [
      { name: 'Roundtana', lat: 13.0849, lng: 80.2105 },
      { name: 'Mogappair', lat: 13.0846, lng: 80.1767 },
      { name: 'Thirumangalam', lat: 13.085, lng: 80.2017 },
      { name: 'West depot', lat: 13.0938, lng: 80.1956 },
    ];
    expect(autoSequence(stops, school).map((stop) => stop.name)).toEqual([
      'Mogappair',
      'West depot',
      'Thirumangalam',
      'Roundtana',
    ]);
  });

  it('gives a shorter path than a shuffled order', () => {
    const stops = [
      { lat: 13.0849, lng: 80.2105 },
      { lat: 13.0846, lng: 80.1767 },
      { lat: 13.0938, lng: 80.1956 },
      { lat: 13.085, lng: 80.2017 },
    ];
    expect(pathKm([...autoSequence(stops, school), school])).toBeLessThan(pathKm([...stops, school]));
  });

  it('works without a school location and with one stop', () => {
    expect(autoSequence([{ lat: 1, lng: 1 }], null)).toHaveLength(1);
    expect(
      autoSequence(
        [
          { lat: 13, lng: 80 },
          { lat: 13.1, lng: 80.1 },
        ],
        null,
      ),
    ).toHaveLength(2);
  });
});

describe('expiry', () => {
  it('counts days between dates', () => {
    expect(daysBetween('2026-11-03', '2026-11-20')).toBe(17);
    expect(daysBetween('2026-11-03', '2026-11-01')).toBe(-2);
  });

  it('labels documents ok, due soon, expired or missing', () => {
    expect(expiryState('puc', '2026-11-15', '2026-11-03').state).toBe('due_soon');
    expect(expiryState('insurance', '2027-03-31', '2026-11-03').state).toBe('ok');
    expect(expiryState('fitness', '2026-10-31', '2026-11-03')).toMatchObject({ state: 'expired', days_left: -3 });
    expect(expiryState('permit', null, '2026-11-03').state).toBe('missing');
  });

  it('alerts at 30, 7 and 1 days and on the day', () => {
    expect(alertThreshold(45)).toBeNull();
    expect(alertThreshold(30)).toBe(30);
    expect(alertThreshold(12)).toBe(30);
    expect(alertThreshold(7)).toBe(7);
    expect(alertThreshold(1)).toBe(1);
    expect(alertThreshold(0)).toBe(0);
    expect(alertThreshold(-4)).toBe(0);
  });
});

describe('passengerRef', () => {
  it('is opaque and unique', () => {
    const first = passengerRef();
    expect(first).toMatch(/^P[0-9a-f]{18}$/);
    expect(passengerRef()).not.toBe(first);
  });
});
