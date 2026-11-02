import { Repository } from 'typeorm';
import { AppException } from '@app/common';
import { AuthConfig, OtpConfig } from '../../config/configuration';
import { hmac } from '../../shared/crypto';
import { SmsService } from '../sms/sms.service';
import { OtpRequest } from './entities/otp-request.entity';
import { OtpService } from './otp.service';

const auth = { accessSecret: 'x'.repeat(40), accessTtlSeconds: 3600, refreshTtlDays: 30 } as AuthConfig;
const baseConfig: OtpConfig = {
  mode: 'test',
  testCode: '123456',
  ttlSeconds: 600,
  maxAttempts: 3,
  resendSeconds: 30,
  maxPerWindow: 5,
  windowMinutes: 15,
};

function setup(config: Partial<OtpConfig> = {}, latest: Partial<OtpRequest> | null = null, recent = 0) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(latest),
    count: jest.fn().mockResolvedValue(recent),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
    delete: jest.fn().mockResolvedValue({}),
  };
  const sms = { sendOtp: jest.fn().mockResolvedValue({ status: 'sent', provider: 'ping4sms' }) };
  const service = new OtpService(
    repo as unknown as Repository<OtpRequest>,
    { ...baseConfig, ...config },
    auth,
    sms as unknown as SmsService,
  );
  return { service, repo, sms };
}

const codeFor = (mobile: string, code: string) => hmac(auth.accessSecret, `otp:${mobile}:${code}`);

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(AppException);
  await promise.catch((error: AppException) => expect((error.getResponse() as { code: string }).code).toBe(code));
}

describe('OtpService.issue', () => {
  it('stores a hashed test code and does not send SMS in test mode', async () => {
    const { service, repo, sms } = setup();
    const result = await service.issue('9876543210', '1.1.1.1');
    expect(result).toEqual({ mobile_masked: '98******10', expires_in: 600, resend_in: 30, otp_length: 6 });
    expect(repo.save.mock.calls[0][0].code_hash).toBe(codeFor('9876543210', '123456'));
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });

  it('blocks a resend inside the cooldown', async () => {
    const { service } = setup({}, { created_at: new Date(Date.now() - 5_000) });
    await expectCode(service.issue('9876543210', null), 'OTP_RESEND_TOO_SOON');
  });

  it('blocks after too many requests in the window', async () => {
    const { service } = setup({}, { created_at: new Date(Date.now() - 60_000) }, 5);
    await expectCode(service.issue('9876543210', null), 'OTP_RATE_LIMITED');
  });

  it('sends a random code by SMS and removes it when sending fails', async () => {
    const { service, repo, sms } = setup({ mode: 'sms' });
    sms.sendOtp.mockResolvedValueOnce({ status: 'failed', provider: 'ping4sms' });
    await expectCode(service.issue('9876543210', null, 'HASH', 'Priya'), 'SMS_FAILED');
    const sent = sms.sendOtp.mock.calls[0][0];
    expect(sent).toMatchObject({ mobile: '9876543210', expiryMinutes: 10, name: 'Priya', appSignature: 'HASH' });
    expect(sent.otp).toMatch(/^\d{6}$/);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });
});

describe('OtpService.verify', () => {
  const pending = (overrides: Partial<OtpRequest> = {}): Partial<OtpRequest> => ({
    id: 9,
    code_hash: codeFor('9876543210', '123456'),
    expires_at: new Date(Date.now() + 60_000),
    attempts: 0,
    ...overrides,
  });

  it('consumes a correct code', async () => {
    const { service, repo } = setup({}, pending());
    await service.verify('9876543210', '123456');
    expect(repo.update).toHaveBeenCalledWith(9, { consumed_at: expect.any(Date) });
  });

  it('counts a wrong code and reports attempts left', async () => {
    const { service, repo } = setup({}, pending());
    const promise = service.verify('9876543210', '000000');
    await expectCode(promise, 'OTP_INVALID');
    await promise.catch((error: AppException) => expect(error.message).toBe('Incorrect OTP. 2 attempts left.'));
    expect(repo.update).toHaveBeenCalledWith(9, { attempts: 1 });
  });

  it('locks after the last wrong attempt', async () => {
    const { service } = setup({}, pending({ attempts: 2 }));
    await expectCode(service.verify('9876543210', '000000'), 'OTP_ATTEMPTS_EXCEEDED');
  });

  it('rejects an expired or missing code', async () => {
    await expectCode(
      setup({}, pending({ expires_at: new Date(Date.now() - 1) })).service.verify('9876543210', '123456'),
      'OTP_EXPIRED',
    );
    await expectCode(setup({}, null).service.verify('9876543210', '123456'), 'OTP_EXPIRED');
  });
});
