import { weekday } from '../../shared/school-days';

export interface SlotRow {
  day_of_week: number;
  period_no: number;
  start_time: string;
  section: string;
  subject: string;
}

export interface AffectedPeriod {
  date: string;
  period_no: number;
  start_time: string;
  section: string;
  subject: string;
}

export function affectedPeriods(dates: string[], slots: SlotRow[]): AffectedPeriod[] {
  return dates.flatMap((date) =>
    slots
      .filter((slot) => slot.day_of_week === weekday(date))
      .sort((a, b) => a.period_no - b.period_no)
      .map((slot) => ({
        date,
        period_no: slot.period_no,
        start_time: slot.start_time,
        section: slot.section,
        subject: slot.subject,
      })),
  );
}

export function balanceAfter(remaining: number | null, days: number): number | null {
  return remaining === null ? null : Math.round((remaining - days) * 10) / 10;
}

export function impactSummary(periods: AffectedPeriod[], morningSections: string[], dates: string[]): string {
  const parts: string[] = [];
  if (periods.length) parts.push(`${periods.length} period${periods.length === 1 ? '' : 's'}`);
  if (morningSections.length && dates.length) {
    parts.push(`${morningSections.join(', ')} morning attendance`);
  }
  if (!parts.length) return 'No classes on these days.';
  return `You have ${parts.join(', including ')} on these days.`;
}

export function sectionsOf(periods: AffectedPeriod[]): string[] {
  return [...new Set(periods.map((period) => period.section))];
}
