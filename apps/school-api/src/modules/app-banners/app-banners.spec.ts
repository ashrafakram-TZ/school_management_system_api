import { schoolBanners } from '../mobile/banner.logic';
import { audiencesFor, bannerState, datesError } from './app-banners.logic';

describe('app banners', () => {
  const banner = { is_active: true, starts_on: '2026-11-10', ends_on: '2026-11-21' };

  it('works out the state from the dates', () => {
    expect(bannerState(banner, '2026-11-09')).toBe('scheduled');
    expect(bannerState(banner, '2026-11-10')).toBe('live');
    expect(bannerState(banner, '2026-11-21')).toBe('live');
    expect(bannerState(banner, '2026-11-22')).toBe('ended');
    expect(bannerState({ ...banner, is_active: false }, '2026-11-15')).toBe('paused');
  });

  it('shows everyone banners to both apps', () => {
    expect(audiencesFor('staff')).toEqual(['all', 'staff']);
    expect(audiencesFor('parents')).toEqual(['all', 'parents']);
  });

  it('rejects an end before the start', () => {
    expect(datesError('2026-11-21', '2026-11-10')).toBe('The last day must be on or after the first day');
    expect(datesError('2026-11-10', '2026-11-10')).toBeNull();
  });

  it('turns banners into app items with the image and the tap action', () => {
    const [withLink, plain] = schoolBanners([
      {
        title: 'Sports Day',
        message: null,
        link_url: 'https://school.in/sports',
        image: { url: 'u1', thumbnail_url: 't1' },
      },
      { title: 'Holiday', message: 'School closed', link_url: null, image: null },
    ]);
    expect(withLink).toMatchObject({
      code: 'SCHOOL_BANNER',
      message: '',
      image_url: 'u1',
      thumbnail_url: 't1',
      action: { screen: 'link', params: { url: 'https://school.in/sports' } },
    });
    expect(plain).toMatchObject({ image_url: null, action: { screen: 'home' } });
  });
});
