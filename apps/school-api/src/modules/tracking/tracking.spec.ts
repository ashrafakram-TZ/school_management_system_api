import { createHmac } from 'crypto';
import { TripStop } from './entities/transport-trip.entity';
import { applyStopEvent, childBusStatus, minutesFrom, orderStops, ridesOn, signatureValid } from './tracking.logic';

const stop = (stopId: number, sequence: number): TripStop => ({
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
});

describe('ridesOn', () => {
  it('matches the transport mode with the trip kind', () => {
    expect(ridesOn('both', 'pickup')).toBe(true);
    expect(ridesOn('both', 'drop')).toBe(true);
    expect(ridesOn('pickup', 'pickup')).toBe(true);
    expect(ridesOn('pickup', 'drop')).toBe(false);
    expect(ridesOn('drop', 'pickup')).toBe(false);
  });
});

describe('orderStops', () => {
  const stops = [{ sequence: 2 }, { sequence: 1 }, { sequence: 3 }];

  it('runs a pickup from the first stop towards school', () => {
    expect(orderStops(stops, 'pickup').map((item) => item.sequence)).toEqual([1, 2, 3]);
  });

  it('runs a drop from school back out to the last stop', () => {
    expect(orderStops(stops, 'drop').map((item) => item.sequence)).toEqual([3, 2, 1]);
  });
});

describe('signatureValid', () => {
  const secret = 'x'.repeat(40);
  const body = Buffer.from('{"type":"trip.started"}');
  const signed = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts the HMAC of the exact raw body', () => {
    expect(signatureValid(body, signed, secret)).toBe(true);
  });

  it('rejects a changed body, a wrong secret or no header', () => {
    expect(signatureValid(Buffer.from('{"type":"trip.ended"}'), signed, secret)).toBe(false);
    expect(signatureValid(body, signed, 'y'.repeat(40))).toBe(false);
    expect(signatureValid(body, undefined, secret)).toBe(false);
  });
});

describe('applyStopEvent', () => {
  const stops = [stop(10, 1), stop(11, 2), stop(12, 3)];

  it('marks a stop approaching with its ETA, then arrived and departed', () => {
    let next = applyStopEvent(stops, 'stop.approaching', 10, '07:01', 240);
    expect(next[0]).toMatchObject({ status: 'approaching', eta_seconds: 240, approached_at: '07:01' });
    next = applyStopEvent(next, 'stop.arrived', 10, '07:05', null);
    expect(next[0]).toMatchObject({ status: 'arrived', eta_seconds: 0, arrived_at: '07:05' });
    next = applyStopEvent(next, 'stop.departed', 10, '07:06', null);
    expect(next[0]).toMatchObject({ status: 'departed', departed_at: '07:06' });
  });

  it('never moves a stop backwards', () => {
    const arrived = applyStopEvent(stops, 'stop.arrived', 10, '07:05', null);
    expect(applyStopEvent(arrived, 'stop.approaching', 10, '07:06', 60)[0]!.status).toBe('arrived');
  });

  it('skips earlier stops the bus never reached when it arrives at a later one', () => {
    const next = applyStopEvent(stops, 'stop.arrived', 12, '07:20', null);
    expect(next.map((item) => item.status)).toEqual(['skipped', 'skipped', 'arrived']);
  });

  it('ignores unknown stops and event types', () => {
    expect(applyStopEvent(stops, 'stop.arrived', 99, '07:20', null)).toBe(stops);
    expect(applyStopEvent(stops, 'trip.position', 10, '07:20', null)).toBe(stops);
  });
});

describe('childBusStatus', () => {
  const trip = (status: string, stops: TripStop[]) => ({ status, stops });

  it('follows the child’s own stop', () => {
    expect(childBusStatus(null, 10)).toBe('no_trip');
    expect(childBusStatus(trip('active', [stop(10, 1)]), 10)).toBe('on_the_way');
    expect(childBusStatus(trip('active', [{ ...stop(10, 1), status: 'approaching' }]), 10)).toBe('approaching');
    expect(childBusStatus(trip('active', [{ ...stop(10, 1), status: 'arrived' }]), 10)).toBe('at_stop');
    expect(childBusStatus(trip('active', [{ ...stop(10, 1), status: 'departed' }]), 10)).toBe('passed');
    expect(childBusStatus(trip('ended', [stop(10, 1)]), 10)).toBe('trip_ended');
  });
});

describe('minutesFrom', () => {
  it('rounds to whole minutes, at least 1', () => {
    expect(minutesFrom(240)).toBe(4);
    expect(minutesFrom(20)).toBe(1);
    expect(minutesFrom(null)).toBe(1);
  });
});
