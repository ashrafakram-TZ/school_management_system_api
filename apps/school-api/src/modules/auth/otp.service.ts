import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AppException } from '@app/common';
import { authConfig, AuthConfig, otpConfig, OtpConfig } from '../../config/configuration';
import { hmac, safeEqual } from '../../shared/crypto';
import { maskMobile } from '../../shared/mobile';
import { SmsService } from '../sms/sms.service';
import { OtpSentDto } from './dto/auth.dto';
import { OtpRequest } from './entities/otp-request.entity';

const OTP_LENGTH = 6;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpRequest) private readonly otps: Repository<OtpRequest>,
    @Inject(otpConfig.KEY) private readonly config: OtpConfig,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
    private readonly sms: SmsService,
  ) {}

  async issue(mobile: string, ip: string | null, appSignature?: string, name?: string): Promise<OtpSentDto> {
    const now = Date.now();
    const latest = await this.otps.findOne({ where: { mobile }, order: { created_at: 'DESC' } });
    if (latest) {
      const wait = Math.ceil((latest.created_at.getTime() + this.config.resendSeconds * 1000 - now) / 1000);
      if (wait > 0)
        throw AppException.tooManyRequests(`Wait ${wait} seconds before requesting a new OTP`, 'OTP_RESEND_TOO_SOON');
    }

    const windowStart = new Date(now - this.config.windowMinutes * 60 * 1000);
    const recent = await this.otps.count({ where: { mobile, created_at: MoreThan(windowStart) } });
    if (recent >= this.config.maxPerWindow) {
      throw AppException.tooManyRequests(
        `Too many OTP requests. Try again in ${this.config.windowMinutes} minutes.`,
        'OTP_RATE_LIMITED',
      );
    }

    const code =
      this.config.mode === 'test' ? this.config.testCode : String(randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH));
    await this.otps.update({ mobile, consumed_at: IsNull() }, { consumed_at: new Date(now) });
    const otp = await this.otps.save(
      this.otps.create({
        mobile,
        code_hash: this.hash(mobile, code),
        expires_at: new Date(now + this.config.ttlSeconds * 1000),
        ip,
      }),
    );

    if (this.config.mode === 'sms') {
      const result = await this.sms.sendOtp({
        mobile,
        otp: code,
        expiryMinutes: Math.round(this.config.ttlSeconds / 60),
        name,
        appSignature,
      });
      if (result.status !== 'sent') {
        await this.otps.delete(otp.id);
        throw AppException.unavailable('Could not send the OTP SMS. Try again in a minute.', 'SMS_FAILED');
      }
    }

    return {
      mobile_masked: maskMobile(mobile),
      expires_in: this.config.ttlSeconds,
      resend_in: this.config.resendSeconds,
      otp_length: OTP_LENGTH,
    };
  }

  async verify(mobile: string, code: string): Promise<void> {
    const otp = await this.otps.findOne({ where: { mobile, consumed_at: IsNull() }, order: { created_at: 'DESC' } });
    if (!otp || otp.expires_at.getTime() <= Date.now()) {
      throw AppException.unauthorized('This OTP has expired. Request a new one.', 'OTP_EXPIRED');
    }
    if (otp.attempts >= this.config.maxAttempts) {
      throw AppException.tooManyRequests('Too many wrong attempts. Request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
    }
    if (!safeEqual(otp.code_hash, this.hash(mobile, code))) {
      const attempts = otp.attempts + 1;
      await this.otps.update(otp.id, { attempts });
      const left = this.config.maxAttempts - attempts;
      if (left <= 0)
        throw AppException.tooManyRequests('Too many wrong attempts. Request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
      throw AppException.unauthorized(
        `Incorrect OTP. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`,
        'OTP_INVALID',
      );
    }
    await this.otps.update(otp.id, { consumed_at: new Date() });
  }

  private hash(mobile: string, code: string): string {
    return hmac(this.auth.accessSecret, `otp:${mobile}:${code}`);
  }
}
