import 'reflect-metadata';
import { validate } from './env.validation';

const failure = (config: Record<string, unknown>) => {
  try {
    validate(config);
    return '';
  } catch (error) {
    return (error as Error).message;
  }
};

describe('OTP_TEST', () => {
  it('is refused in production', () => {
    expect(failure({ NODE_ENV: 'production', OTP_MODE: 'sms', OTP_TEST: 'true' })).toBe(
      'Invalid env OTP_TEST: the fixed test OTP is not allowed in production',
    );
  });

  it('may be false in production', () => {
    expect(failure({ NODE_ENV: 'production', OTP_MODE: 'sms', OTP_TEST: 'false' })).not.toMatch(/OTP_TEST/);
  });

  it('accepts only true or false', () => {
    expect(failure({ NODE_ENV: 'development', OTP_TEST: 'yes' })).toMatch(/OTP_TEST must be true or false|Invalid env/);
  });
});
