import { renderTemplate, templateKeys, toStringData } from '../modules/notifications/template.renderer';
import { FileSigner } from '../modules/files/file-signer';
import { hmac, safeEqual } from './crypto';
import { maskMobile, MOBILE_PATTERN, normalizeMobile } from './mobile';

describe('mobile', () => {
  it.each([
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765-43210', '9876543210'],
    [9876543210, '9876543210'],
  ])('normalises %p', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });

  it('accepts only Indian mobile numbers', () => {
    expect(MOBILE_PATTERN.test('9876543210')).toBe(true);
    expect(MOBILE_PATTERN.test('5876543210')).toBe(false);
    expect(MOBILE_PATTERN.test('987654321')).toBe(false);
  });

  it('masks the middle digits', () => {
    expect(maskMobile('9876543210')).toBe('98******10');
  });
});

describe('crypto', () => {
  it('compares hashes safely', () => {
    expect(safeEqual(hmac('k', 'a'), hmac('k', 'a'))).toBe(true);
    expect(safeEqual(hmac('k', 'a'), hmac('k', 'b'))).toBe(false);
    expect(safeEqual('short', 'longer')).toBe(false);
  });
});

describe('template renderer', () => {
  it('fills placeholders and blanks missing ones', () => {
    expect(
      renderTemplate('{{bus}} reaches {{ stop }} in {{minutes}} min{{x}}', { bus: 'TN01', stop: 'Gate 2', minutes: 5 }),
    ).toBe('TN01 reaches Gate 2 in 5 min');
  });

  it('lists placeholder keys once', () => {
    expect(templateKeys('{{a}} {{b}} {{a}}')).toEqual(['a', 'b']);
  });

  it('turns data into strings for push payloads', () => {
    expect(toStringData({ a: 1, b: null, c: 'x' })).toEqual({ a: '1', c: 'x' });
  });
});

describe('FileSigner', () => {
  const signer = new FileSigner('s'.repeat(32), 60);
  const now = Date.UTC(2026, 10, 2);

  it('verifies its own signature', () => {
    expect(signer.verify(7, signer.sign(7, 'original', now), now)).toBe(true);
  });

  it('rejects another file, another variant or a changed signature', () => {
    const signed = signer.sign(7, 'original', now);
    expect(signer.verify(8, signed, now)).toBe(false);
    expect(signer.verify(7, { ...signed, variant: 'thumb' }, now)).toBe(false);
    expect(signer.verify(7, { ...signed, signature: signed.signature.replace(/.$/, '0') }, now)).toBe(
      signed.signature.endsWith('0'),
    );
  });

  it('rejects an expired link', () => {
    const signed = signer.sign(7, 'original', now);
    expect(signer.verify(7, signed, now + 61_000)).toBe(false);
  });
});
