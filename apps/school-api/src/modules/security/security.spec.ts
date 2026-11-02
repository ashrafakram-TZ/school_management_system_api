import { randomBytes } from 'crypto';
import { FieldCipher, lastDigits, masked } from './field-cipher';
import { QrTokens } from './qr-tokens';

describe('FieldCipher', () => {
  const cipher = new FieldCipher(randomBytes(32).toString('base64'));

  it('encrypts to a different value each time and decrypts back', () => {
    const first = cipher.encrypt('032101000012345');
    const second = cipher.encrypt('032101000012345');
    expect(first).not.toEqual(second);
    expect(first).not.toContain('032101000012345');
    expect(cipher.decrypt(first)).toBe('032101000012345');
    expect(cipher.decrypt(second)).toBe('032101000012345');
  });

  it('refuses a tampered value', () => {
    const sealed = cipher.encrypt('ABCPV1234K');
    const raw = Buffer.from(sealed.slice(3), 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => cipher.decrypt(`v1:${raw.toString('base64')}`)).toThrow();
  });

  it('refuses a value sealed with another key', () => {
    const other = new FieldCipher(randomBytes(32).toString('base64'));
    expect(() => cipher.decrypt(other.encrypt('6123456789'))).toThrow();
  });

  it('needs a 32-byte key', () => {
    expect(() => new FieldCipher(randomBytes(16).toString('base64'))).toThrow();
  });

  it('shows only the last four characters', () => {
    expect(lastDigits('6123 4567 89')).toBe('6789');
    expect(masked('6789')).toBe('XXXX6789');
    expect(masked(null)).toBeNull();
  });
});

describe('QrTokens', () => {
  const tokens = new QrTokens('a-test-secret-that-is-long-enough-1234');

  it('reads back a token it signed', () => {
    const token = tokens.student(12, 1);
    expect(token).toMatch(/^TZS1\.12\.1\.[A-Za-z0-9_-]{22}$/);
    expect(tokens.readStudent(token)).toEqual({ student_id: 12, version: 1 });
  });

  it('refuses changed ids, versions, signatures and other secrets', () => {
    const token = tokens.student(12, 1);
    expect(tokens.readStudent(token.replace('.12.', '.13.'))).toBeNull();
    expect(tokens.readStudent(token.replace('.1.', '.2.'))).toBeNull();
    expect(tokens.readStudent(`${token.slice(0, -1)}x`)).toBeNull();
    expect(new QrTokens('another-secret-that-is-long-enough-9999').readStudent(token)).toBeNull();
  });

  it('refuses text that is not a school card', () => {
    expect(tokens.readStudent('https://example.com')).toBeNull();
    expect(tokens.readStudent('TZS1.0.1.abc')).toBeNull();
    expect(tokens.readStudent('')).toBeNull();
  });
});
