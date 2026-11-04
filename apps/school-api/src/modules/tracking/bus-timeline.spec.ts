import { TripStop } from './entities/transport-trip.entity';
import {
  boardingStatus,
  liveTimeline,
  minutesLate,
  nextScheduledTrip,
  plannedAt,
  plannedTimeline,
  zoneOffset,
} from './bus-timeline.logic';

const stop = (stopId: number, sequence: number, changes: Partial<TripStop> = {}): TripStop => ({
  stop_id: stopId,
  name: `Stop ${stopId}`,
  sequence,
  lat: 13,
  lng: 80,
  radius_m: 120,
  planned_time: null,
  status: 'pending',
  eta_seconds: null,
  approached_at: null,
  arrived_at: null,
  departed_at: null,
  ...changes,
});

describe('zoneOffset and plannedAt', () => {
  it('reads the India offset and builds the planned instant', () => {
    expect(zoneOffset('Asia/Kolkata', new Date('2026-11-04T00:00:00Z'))).toBe('+05:30');
    expect(zoneOffset('UTC', new Date('2026-11-04T00:00:00Z'))).toBe('+00:00');
    expect(plannedAt('2026-11-04', '07:25', '+05:30')?.toISOString()).toBe('2026-11-04T01:55:00.000Z');
    expect(plannedAt('2026-11-04', null, '+05:30')).toBeNull();
    expect(plannedAt('2026-11-04', '7:5', '+05:30')).toBeNull();
  });
});

describe('minutesLate', () => {
  it('is positive when late, negative when early, null when unknown', () => {
    const planned = new Date('2026-11-04T02:00:00Z');
    expect(minutesLate(planned, new Date('2026-11-04T02:06:20Z'))).toBe(6);
    expect(minutesLate(planned, new Date('2026-11-04T01:57:00Z'))).toBe(-3);
    expect(minutesLate(null, new Date())).toBeNull();
    expect(minutesLate(planned, null)).toBeNull();
  });
});

describe('liveTimeline', () => {
  const now = new Date('2026-11-04T02:10:00Z');
  const positionAt = new Date('2026-11-04T02:09:30Z');
  const stops = [
    stop(1, 1, { planned_time: '07:20', status: 'skipped' }),
    stop(2, 2, {
      planned_time: '07:30',
      status: 'departed',
      arrived_at: '2026-11-04T02:02:00.000Z',
      departed_at: '2026-11-04T02:03:00.000Z',
    }),
    stop(3, 3, { planned_time: '07:38', status: 'approaching', eta_seconds: 120 }),
    stop(4, 4, { planned_time: '07:50', status: 'pending', eta_seconds: 600 }),
    stop(5, 5, { planned_time: '07:30', status: 'pending', eta_seconds: null }),
  ];
  const timeline = liveTimeline(stops, { childStopId: 4, tripDate: '2026-11-04', offset: '+05:30', positionAt, now });

  it('keeps travel order and flags the child stop', () => {
    expect(timeline.map((item) => item.stop_id)).toEqual([1, 2, 3, 4, 5]);
    expect(timeline.filter((item) => item.is_child_stop).map((item) => item.stop_id)).toEqual([4]);
  });

  it('gives past stops their times and lateness from the arrival', () => {
    expect(timeline[1]).toMatchObject({ status: 'departed', eta_seconds: null, eta_at: null, minutes_late: 2 });
    expect(timeline[1]!.arrived_at?.toISOString()).toBe('2026-11-04T02:02:00.000Z');
    expect(timeline[0]).toMatchObject({ status: 'skipped', minutes_late: null, arrived_at: null });
  });

  it('gives upcoming stops an ETA from the last position', () => {
    expect(timeline[2]!.eta_at?.toISOString()).toBe('2026-11-04T02:11:30.000Z');
    expect(timeline[2]).toMatchObject({ eta_seconds: 120, arrived_at: null, minutes_late: 4 });
    expect(timeline[3]!.eta_at?.toISOString()).toBe('2026-11-04T02:19:30.000Z');
    expect(timeline[3]!.minutes_late).toBe(0);
  });

  it('counts an overdue stop with no ETA as late until now', () => {
    expect(timeline[4]).toMatchObject({ eta_at: null, minutes_late: 10 });
  });

  it('falls back to now when there is no position', () => {
    const [item] = liveTimeline([stop(3, 1, { status: 'approaching', eta_seconds: 60 })], {
      childStopId: 3,
      tripDate: '2026-11-04',
      offset: '+05:30',
      positionAt: null,
      now,
    });
    expect(item!.eta_at?.toISOString()).toBe('2026-11-04T02:11:00.000Z');
  });
});

describe('plannedTimeline', () => {
  const stops = [
    { id: 11, name: 'A', sequence: 1, pickup_time: '07:10', drop_time: '16:40' },
    { id: 12, name: 'B', sequence: 2, pickup_time: '07:20', drop_time: '16:30' },
  ];

  it('orders pickup stops forward with pickup times', () => {
    const items = plannedTimeline(stops, { kind: 'pickup', childStopId: 12, tripDate: '2026-11-05', offset: '+05:30' });
    expect(items.map((item) => [item.stop_id, item.planned_time, item.is_child_stop, item.status])).toEqual([
      [11, '07:10', false, 'pending'],
      [12, '07:20', true, 'pending'],
    ]);
    expect(items[0]!.planned_at?.toISOString()).toBe('2026-11-05T01:40:00.000Z');
  });

  it('orders drop stops backward with drop times', () => {
    const items = plannedTimeline(stops, { kind: 'drop', childStopId: 12, tripDate: '2026-11-05', offset: '+05:30' });
    expect(items.map((item) => [item.stop_id, item.planned_time])).toEqual([
      [12, '16:30'],
      [11, '16:40'],
    ]);
  });
});

describe('boardingStatus', () => {
  it('maps the latest scan', () => {
    expect(boardingStatus(null)).toBe('not_yet');
    expect(boardingStatus(undefined)).toBe('not_yet');
    expect(boardingStatus('boarded')).toBe('boarded');
    expect(boardingStatus('alighted')).toBe('alighted');
  });
});

describe('nextScheduledTrip', () => {
  const base = {
    mode: 'both' as const,
    today: '2026-11-04',
    nowTime: '06:30',
    ranToday: [] as ('pickup' | 'drop')[],
    lastPlanned: { pickup: '07:40', drop: '16:50' },
    isDayOff: (date: string) => date === '2026-11-08',
  };

  it('is the morning pickup before it runs', () => {
    expect(nextScheduledTrip(base)).toEqual({ trip_date: '2026-11-04', kind: 'pickup' });
  });

  it('is the evening drop after the pickup ran', () => {
    expect(nextScheduledTrip({ ...base, nowTime: '09:00', ranToday: ['pickup'] })).toEqual({
      trip_date: '2026-11-04',
      kind: 'drop',
    });
  });

  it('skips a trip whose planned times have passed', () => {
    expect(nextScheduledTrip({ ...base, nowTime: '09:00' })).toEqual({ trip_date: '2026-11-04', kind: 'drop' });
  });

  it('moves to the next working day after both trips', () => {
    expect(nextScheduledTrip({ ...base, nowTime: '18:00', ranToday: ['pickup', 'drop'] })).toEqual({
      trip_date: '2026-11-05',
      kind: 'pickup',
    });
    expect(nextScheduledTrip({ ...base, today: '2026-11-07', nowTime: '18:00' })).toEqual({
      trip_date: '2026-11-09',
      kind: 'pickup',
    });
  });

  it('follows the transport mode', () => {
    expect(nextScheduledTrip({ ...base, mode: 'drop' })).toEqual({ trip_date: '2026-11-04', kind: 'drop' });
    expect(nextScheduledTrip({ ...base, mode: 'pickup', nowTime: '09:00' })).toEqual({
      trip_date: '2026-11-05',
      kind: 'pickup',
    });
  });

  it('gives up after the look-ahead window', () => {
    expect(nextScheduledTrip({ ...base, isDayOff: () => true })).toBeNull();
  });
});
