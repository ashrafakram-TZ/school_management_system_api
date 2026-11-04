import { AppException } from '@app/common';
import { AgoraTokenService } from './agora-token.service';
import {
  canJoin,
  channelName,
  endsAt,
  expiredStatus,
  formatMeetingTime,
  joinBlockReason,
  joinWindow,
  minutesBetween,
  overlaps,
  scheduleError,
} from './meetings.logic';

const at = (iso: string) => new Date(iso);
const meeting = (overrides: Partial<{ status: 'scheduled' | 'live' | 'completed' | 'missed' | 'cancelled' }> = {}) => ({
  status: 'scheduled' as const,
  scheduled_at: at('2026-11-11T16:30:00+05:30'),
  duration_minutes: 15,
  ...overrides,
});

describe('joinWindow', () => {
  it('opens 10 minutes early and closes 30 minutes after the end', () => {
    const window = joinWindow(at('2026-11-11T16:30:00+05:30'), 15);
    expect(window.opens_at.toISOString()).toBe('2026-11-11T10:50:00.000Z');
    expect(window.closes_at.toISOString()).toBe('2026-11-11T11:45:00.000Z');
  });

  it('ends after the duration', () => {
    expect(endsAt(at('2026-11-11T16:30:00+05:30'), 20).toISOString()).toBe('2026-11-11T11:20:00.000Z');
  });
});

describe('canJoin and joinBlockReason', () => {
  it('lets people in during the window', () => {
    expect(canJoin(meeting(), at('2026-11-11T16:25:00+05:30'))).toBe(true);
    expect(joinBlockReason(meeting(), at('2026-11-11T16:25:00+05:30'))).toBeNull();
  });

  it('keeps a live meeting open until the grace time ends', () => {
    expect(canJoin(meeting({ status: 'live' }), at('2026-11-11T17:10:00+05:30'))).toBe(true);
  });

  it('says the meeting is not open yet before the window', () => {
    expect(canJoin(meeting(), at('2026-11-11T16:10:00+05:30'))).toBe(false);
    expect(joinBlockReason(meeting(), at('2026-11-11T16:10:00+05:30'))?.code).toBe('MEETING_NOT_OPEN');
  });

  it('says the meeting has ended after the window', () => {
    expect(joinBlockReason(meeting(), at('2026-11-11T17:16:00+05:30'))?.code).toBe('MEETING_ENDED');
  });

  it('blocks cancelled and finished meetings at any time', () => {
    const during = at('2026-11-11T16:30:00+05:30');
    expect(joinBlockReason(meeting({ status: 'cancelled' }), during)?.code).toBe('MEETING_CANCELLED');
    expect(joinBlockReason(meeting({ status: 'completed' }), during)?.code).toBe('MEETING_ENDED');
    expect(joinBlockReason(meeting({ status: 'missed' }), during)?.code).toBe('MEETING_ENDED');
    expect(canJoin(meeting({ status: 'cancelled' }), during)).toBe(false);
  });
});

describe('overlaps', () => {
  const start = at('2026-11-11T16:30:00+05:30');

  it('finds meetings that share any minute', () => {
    expect(overlaps(start, 15, at('2026-11-11T16:40:00+05:30'), 15)).toBe(true);
    expect(overlaps(at('2026-11-11T16:20:00+05:30'), 15, start, 15)).toBe(true);
  });

  it('allows back-to-back meetings', () => {
    expect(overlaps(start, 15, at('2026-11-11T16:45:00+05:30'), 15)).toBe(false);
    expect(overlaps(at('2026-11-11T16:15:00+05:30'), 15, start, 15)).toBe(false);
  });
});

describe('scheduleError', () => {
  const now = at('2026-11-04T10:00:00+05:30');

  it('accepts a time later today', () => {
    expect(scheduleError(at('2026-11-04T16:00:00+05:30'), now)).toBeNull();
  });

  it('accepts now, allowing a minute of clock drift', () => {
    expect(scheduleError(at('2026-11-04T09:59:30+05:30'), now)).toBeNull();
  });

  it('refuses a time that has passed', () => {
    expect(scheduleError(at('2026-11-04T09:30:00+05:30'), now)).toEqual({
      field: 'scheduled_at',
      message: 'The meeting time has already passed',
    });
  });

  it('refuses more than 60 days ahead', () => {
    expect(scheduleError(at('2027-01-05T10:00:00+05:30'), now)?.field).toBe('scheduled_at');
  });

  it('refuses an invalid date', () => {
    expect(scheduleError(new Date('nope'), now)?.message).toBe('scheduled_at must be a date and time');
  });
});

describe('helpers', () => {
  it('builds an Agora-safe channel name under 64 characters', () => {
    const name = channelName(1, 'a1b2c3d4e5f60718');
    expect(name).toBe('tzs_1_a1b2c3d4e5f60718');
    expect(channelName(1, 'x'.repeat(80)).length).toBeLessThan(64);
  });

  it('counts whole minutes between two times', () => {
    expect(minutesBetween(at('2026-11-11T16:30:00+05:30'), at('2026-11-11T16:42:20+05:30'))).toBe(12);
    expect(minutesBetween(null, at('2026-11-11T16:42:20+05:30'))).toBeNull();
  });

  it('closes a live meeting as completed and an unjoined one as missed', () => {
    expect(expiredStatus({ status: 'live' })).toBe('completed');
    expect(expiredStatus({ status: 'scheduled' })).toBe('missed');
  });

  it('formats the time in the school time zone', () => {
    expect(formatMeetingTime(at('2026-11-11T11:00:00Z'), 'Asia/Kolkata').toLowerCase()).toBe('11 nov, 4:30 pm');
  });
});

describe('AgoraTokenService', () => {
  const config = (appId: string, cert: string) => ({
    agoraAppId: appId,
    agoraAppCertificate: cert,
    tokenTtlSeconds: 3600,
  });
  const hex = 'a'.repeat(32);
  const now = at('2026-11-11T16:25:00+05:30');

  it('refuses with VIDEO_NOT_CONFIGURED when the keys are missing', () => {
    const service = new AgoraTokenService(config('', ''));
    expect(service.enabled).toBe(false);
    try {
      service.issue('tzs_1_abc', 9, at('2026-11-11T17:15:00+05:30'), now);
      fail('expected an error');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(503);
      expect(((error as AppException).getResponse() as { code: string }).code).toBe('VIDEO_NOT_CONFIGURED');
    }
  });

  it('issues a version 007 RTC token that lasts until the meeting closes', () => {
    const service = new AgoraTokenService(config(hex, 'b'.repeat(32)));
    const grant = service.issue('tzs_1_abc', 9, at('2026-11-11T17:15:00+05:30'), now);
    expect(grant.app_id).toBe(hex);
    expect(grant.token.startsWith('007')).toBe(true);
    expect(grant.expires_at.toISOString()).toBe('2026-11-11T11:45:00.000Z');
  });

  it('never issues a token longer than AGORA_TOKEN_TTL_SECONDS', () => {
    const service = new AgoraTokenService(config(hex, 'b'.repeat(32)));
    const grant = service.issue('tzs_1_abc', 9, at('2026-11-12T16:25:00+05:30'), now);
    expect(grant.expires_at.getTime() - now.getTime()).toBe(3600 * 1000);
  });
});
