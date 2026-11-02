import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OtpRequest } from '../auth/entities/otp-request.entity';
import { UserSession } from '../auth/entities/user-session.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger('Cleanup');

  constructor(
    @InjectRepository(OtpRequest) private readonly otps: Repository<OtpRequest>,
    @InjectRepository(UserSession) private readonly sessions: Repository<UserSession>,
  ) {}

  @Cron('0 3 * * *', { name: 'cleanup', timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata' })
  async run(): Promise<void> {
    const now = Date.now();
    const otps = await this.otps.delete({ created_at: LessThan(new Date(now - DAY_MS)) });
    const expired = await this.sessions.delete({ expires_at: LessThan(new Date(now - 7 * DAY_MS)) });
    const revoked = await this.sessions.delete({ revoked_at: LessThan(new Date(now - 7 * DAY_MS)) });
    this.logger.log(
      `Removed ${otps.affected ?? 0} old OTPs and ${(expired.affected ?? 0) + (revoked.affected ?? 0)} ended sessions`,
    );
  }
}
