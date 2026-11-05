import { MeetingStatus } from './entities/meeting.entity';
import { joinBlockReason, MeetingTiming } from './meetings.logic';

export interface Blocked {
  message: string;
  code: string;
}

export interface AttendanceSpan {
  user_id: number;
  joined_at: Date;
  left_at: Date | null;
}

export interface Attendance {
  minutes: number;
  sessions: number;
  first_joined_at: Date;
  last_left_at: Date;
}

const MINUTE_MS = 60_000;
const OVER: MeetingStatus[] = ['completed', 'missed'];

export function noteBlockReason(meeting: Pick<MeetingTiming, 'status'>): Blocked | null {
  if (meeting.status === 'cancelled') {
    return { message: 'This meeting was cancelled', code: 'MEETING_CANCELLED' };
  }
  return null;
}

export function chatBlockReason(meeting: MeetingTiming, now: Date): Blocked | null {
  const blocked = joinBlockReason(meeting, now);
  if (!blocked) return null;
  if (blocked.code === 'MEETING_ENDED') {
    return { message: 'The meeting has ended, so its chat is read-only', code: 'MEETING_CHAT_CLOSED' };
  }
  return blocked;
}

export function recapBlockReason(meeting: Pick<MeetingTiming, 'status'>): Blocked | null {
  if (OVER.includes(meeting.status)) return null;
  if (meeting.status === 'cancelled') {
    return { message: 'This meeting was cancelled', code: 'MEETING_CANCELLED' };
  }
  return { message: 'The recap is ready once the meeting ends', code: 'MEETING_NOT_OVER' };
}

export function visibleToParty<T extends { author_user_id: number; shared: boolean }>(
  notes: T[],
  viewerId: number,
): T[] {
  return notes.filter((note) => note.author_user_id === viewerId || note.shared);
}

export function attendanceOf(spans: AttendanceSpan[], until: Date | null): Map<number, Attendance> {
  const byUser = new Map<number, { from: number; to: number }[]>();
  for (const span of spans) {
    const end = span.left_at ?? until;
    if (!end) continue;
    const from = span.joined_at.getTime();
    const to = Math.max(from, end.getTime());
    const list = byUser.get(span.user_id) ?? [];
    list.push({ from, to });
    byUser.set(span.user_id, list);
  }
  const result = new Map<number, Attendance>();
  for (const [userId, list] of byUser) {
    list.sort((a, b) => a.from - b.from);
    const merged: { from: number; to: number }[] = [];
    for (const span of list) {
      const last = merged[merged.length - 1];
      if (last && span.from <= last.to) {
        last.to = Math.max(last.to, span.to);
      } else {
        merged.push({ ...span });
      }
    }
    const total = merged.reduce((sum, span) => sum + (span.to - span.from), 0);
    const last = merged[merged.length - 1];
    result.set(userId, {
      minutes: Math.round(total / MINUTE_MS),
      sessions: merged.length,
      first_joined_at: new Date(merged[0].from),
      last_left_at: new Date(last.to),
    });
  }
  return result;
}
