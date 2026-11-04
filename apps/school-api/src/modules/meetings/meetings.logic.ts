import { FieldError } from '@app/common';
import { MeetingStatus } from './entities/meeting.entity';

export const JOIN_EARLY_MINUTES = 10;
export const JOIN_GRACE_MINUTES = 30;
export const REMINDER_MINUTES = 10;
export const MAX_DAYS_AHEAD = 60;
export const PAST_TOLERANCE_MINUTES = 1;
export const OPEN_STATUSES: MeetingStatus[] = ['scheduled', 'live'];

const MINUTE_MS = 60_000;

export interface JoinWindow {
  opens_at: Date;
  closes_at: Date;
}

export function endsAt(scheduledAt: Date, durationMinutes: number): Date {
  return new Date(scheduledAt.getTime() + durationMinutes * MINUTE_MS);
}

export function joinWindow(scheduledAt: Date, durationMinutes: number): JoinWindow {
  return {
    opens_at: new Date(scheduledAt.getTime() - JOIN_EARLY_MINUTES * MINUTE_MS),
    closes_at: new Date(endsAt(scheduledAt, durationMinutes).getTime() + JOIN_GRACE_MINUTES * MINUTE_MS),
  };
}

export function canJoin(
  meeting: { status: MeetingStatus; scheduled_at: Date; duration_minutes: number },
  now: Date,
): boolean {
  if (!OPEN_STATUSES.includes(meeting.status)) return false;
  const window = joinWindow(meeting.scheduled_at, meeting.duration_minutes);
  return now >= window.opens_at && now <= window.closes_at;
}

export function joinBlockReason(
  meeting: { status: MeetingStatus; scheduled_at: Date; duration_minutes: number },
  now: Date,
): { message: string; code: string } | null {
  if (meeting.status === 'cancelled') return { message: 'This meeting was cancelled', code: 'MEETING_CANCELLED' };
  if (meeting.status === 'completed' || meeting.status === 'missed') {
    return { message: 'This meeting has already ended', code: 'MEETING_ENDED' };
  }
  const window = joinWindow(meeting.scheduled_at, meeting.duration_minutes);
  if (now < window.opens_at) {
    return {
      message: `The meeting opens ${JOIN_EARLY_MINUTES} minutes before it starts`,
      code: 'MEETING_NOT_OPEN',
    };
  }
  if (now > window.closes_at) return { message: 'This meeting has already ended', code: 'MEETING_ENDED' };
  return null;
}

export function overlaps(aStart: Date, aMinutes: number, bStart: Date, bMinutes: number): boolean {
  return aStart < endsAt(bStart, bMinutes) && bStart < endsAt(aStart, aMinutes);
}

export function scheduleError(scheduledAt: Date, now: Date): FieldError | null {
  if (Number.isNaN(scheduledAt.getTime())) {
    return { field: 'scheduled_at', message: 'scheduled_at must be a date and time' };
  }
  if (scheduledAt.getTime() < now.getTime() - PAST_TOLERANCE_MINUTES * MINUTE_MS) {
    return { field: 'scheduled_at', message: 'The meeting time has already passed' };
  }
  if (scheduledAt.getTime() > now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * MINUTE_MS) {
    return { field: 'scheduled_at', message: `A meeting can be booked up to ${MAX_DAYS_AHEAD} days ahead` };
  }
  return null;
}

export function channelName(schoolId: number, token: string): string {
  return `tzs_${schoolId}_${token}`.slice(0, 63);
}

export function minutesBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MINUTE_MS));
}

export function expiredStatus(meeting: { status: MeetingStatus }): MeetingStatus {
  return meeting.status === 'live' ? 'completed' : 'missed';
}

export function formatMeetingTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
