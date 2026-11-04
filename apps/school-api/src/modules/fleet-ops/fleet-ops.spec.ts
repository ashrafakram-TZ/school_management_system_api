import { playbackView, RemotePlayback } from './fleet-health.service';
import {
  averageKmPerLitre,
  closedAtFor,
  faultTicket,
  fuelEconomy,
  odometerProblem,
  pricePerLitre,
} from './fleet-ops.logic';

const now = new Date('2026-11-04T04:30:00.000Z');

describe('OBD fault to maintenance ticket', () => {
  it('turns a vehicle.fault event into a ticket draft', () => {
    expect(
      faultTicket({
        id: 12,
        type: 'vehicle.fault',
        at: '2026-11-04T09:45:00.000+05:30',
        device_id: 1,
        fault: { code: 'p0217', description: 'Engine coolant over temperature', severity: 'high' },
        odometer_km: 48213.74,
      }),
    ).toEqual({
      device_id: 1,
      fault_code: 'P0217',
      severity: 'high',
      title: 'P0217: Engine coolant over temperature',
      description: 'Engine coolant over temperature',
      odometer_km: 48213.7,
      opened_at: new Date('2026-11-04T04:15:00.000Z'),
      telematics_fault_id: 12,
    });
  });

  it('fills gaps and refuses events it cannot use', () => {
    const draft = faultTicket({ type: 'vehicle.fault', device_id: 2, fault: { code: 'U0100', severity: 'odd' } }, now);
    expect(draft).toMatchObject({
      severity: null,
      title: 'U0100: Fault code U0100',
      odometer_km: null,
      opened_at: now,
      telematics_fault_id: null,
    });
    expect(faultTicket({ type: 'vehicle.fault', device_id: 2, fault: { code: 'X123' } })).toBeNull();
    expect(faultTicket({ type: 'vehicle.fault', fault: { code: 'P0301' } })).toBeNull();
  });
});

describe('ticket status', () => {
  it('stamps closed_at when done and clears it when reopened', () => {
    const earlier = new Date('2026-11-01T10:00:00.000Z');
    expect(closedAtFor('open', 'done', null, now)).toBe(now);
    expect(closedAtFor('done', 'done', earlier, now)).toBe(earlier);
    expect(closedAtFor('done', 'in_progress', earlier, now)).toBeNull();
  });
});

describe('fuel log', () => {
  it('works out km since the last fill and km per litre', () => {
    expect(fuelEconomy(48633, 48213, 60.5)).toEqual({ km_since_last: 420, km_per_litre: 6.94 });
    expect(fuelEconomy(48213, null, 60)).toEqual({ km_since_last: null, km_per_litre: null });
    expect(fuelEconomy(48000, 48213, 60)).toEqual({ km_since_last: null, km_per_litre: null });
    expect(pricePerLitre(5800, 60.5)).toBe(95.87);
  });

  it('keeps the odometer between the neighbouring fills', () => {
    const previous = { odometer_km: 48100, filled_on: '2026-11-01' };
    const next = { odometer_km: 48700, filled_on: '2026-11-05' };
    expect(odometerProblem(48300, previous, next)).toBeNull();
    expect(odometerProblem(48000, previous, next)).toBe(
      'odometer_km must be at least 48100 km, the reading on 2026-11-01',
    );
    expect(odometerProblem(48800, previous, next)).toBe(
      'odometer_km must be at most 48700 km, the reading on 2026-11-05',
    );
    expect(odometerProblem(0, null, null)).toBeNull();
  });

  it('averages km/l over fills that have a previous reading', () => {
    expect(
      averageKmPerLitre([
        { km: null, litres: 50 },
        { km: 420, litres: 60 },
        { km: 380, litres: 55 },
      ]),
    ).toBe(6.96);
    expect(averageKmPerLitre([{ km: null, litres: 40 }])).toBeNull();
  });
});

describe('trip playback', () => {
  it('maps the Telematics track to the school shape', () => {
    const remote: RemotePlayback = {
      path: [{ lat: 13.08, lng: 80.17 }],
      points: [{ at: '2026-11-04T07:00:00.000+05:30', lat: 13.08, lng: 80.17, speed: 20, heading: 90 }],
      total_points: 1,
      sampled: false,
      distance_km: 0,
      duration_seconds: 0,
      max_speed: 20,
      avg_speed: null,
      stop_arrivals: [
        {
          ref: '12',
          name: 'Mogappair East',
          sequence: 1,
          status: 'departed',
          planned_time: '07:00',
          arrived_at: '2026-11-04T07:01:00.000+05:30',
          departed_at: '2026-11-04T07:02:00.000+05:30',
          lat: 13.08,
          lng: 80.17,
        },
      ],
      safety_events: [
        {
          id: 31,
          kind: 'overspeed',
          severity: 'medium',
          message: 'Overspeed',
          value: 62,
          limit: 50,
          lat: 13.08,
          lng: 80.18,
          speed_kmh: 62,
          occurred_at: '2026-11-04T07:05:00.000+05:30',
        },
      ],
    };
    const view = playbackView(remote);
    expect(view.stop_arrivals[0]).toMatchObject({ stop_id: 12, name: 'Mogappair East', status: 'departed' });
    expect(view.safety_events[0]).toEqual({
      id: 31,
      kind: 'overspeed',
      severity: 'medium',
      message: 'Overspeed',
      value: 62,
      limit: 50,
      at: '2026-11-04T07:05:00.000+05:30',
      lat: 13.08,
      lng: 80.18,
      speed_kmh: 62,
    });
    expect(view.points).toEqual(remote.points);
  });
});
