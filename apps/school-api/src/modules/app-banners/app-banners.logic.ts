import { BannerAudience } from './entities/app-banner.entity';

export const BANNER_STATES = ['live', 'scheduled', 'ended', 'paused'] as const;
export type BannerState = (typeof BANNER_STATES)[number];

export function bannerState(
  banner: { is_active: boolean; starts_on: string; ends_on: string },
  today: string,
): BannerState {
  if (!banner.is_active) return 'paused';
  if (today < banner.starts_on) return 'scheduled';
  if (today > banner.ends_on) return 'ended';
  return 'live';
}

export function audiencesFor(viewer: 'staff' | 'parents'): BannerAudience[] {
  return ['all', viewer];
}

export function datesError(startsOn: string, endsOn: string): string | null {
  return endsOn < startsOn ? 'The last day must be on or after the first day' : null;
}
