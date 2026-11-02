import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { UserDevicesService } from '../users/user-devices.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginResponseDto, OtpSentDto, RequestOtpDto, TokenPairDto, VerifyOtpDto } from './dto/auth.dto';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly users: UsersService,
    private readonly devices: UserDevicesService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  async requestOtp(dto: RequestOtpDto, meta: RequestMeta): Promise<OtpSentDto> {
    const user = await this.activeUser(dto.mobile);
    return this.otp.issue(dto.mobile, meta.ip, dto.app_signature, user.name);
  }

  async verifyOtp(dto: VerifyOtpDto, meta: RequestMeta): Promise<LoginResponseDto> {
    const user = await this.activeUser(dto.mobile);
    await this.otp.verify(dto.mobile, dto.otp);

    const client = dto.client ?? {};
    const { session_id: sessionId, ...pair } = await this.tokens.issue(user, {
      app: client.app,
      platform: client.platform,
      device_name: client.device_name,
      ip: meta.ip,
      user_agent: meta.userAgent,
    });
    await this.userRepo.update(user.id, { last_login_at: new Date() });
    if (client.fcm_token && client.platform) {
      await this.devices.register(user.id, sessionId, {
        fcm_token: client.fcm_token,
        platform: client.platform,
        app: client.app,
        device_name: client.device_name,
        app_version: client.app_version,
      });
    }
    return { ...pair, user: await this.users.profile(user.id) };
  }

  refresh(refreshToken: string): Promise<TokenPairDto> {
    return this.tokens.rotate(refreshToken, (userId) => this.userRepo.findOneBy({ id: userId }));
  }

  async logout(user: AuthUser): Promise<void> {
    await this.tokens.revoke(user.session_id);
    await this.devices.removeForSession(user.session_id);
  }

  private async activeUser(mobile: string): Promise<User> {
    const user = await this.users.findActiveByMobile(mobile);
    if (!user) {
      throw AppException.notFound(
        'This mobile number is not registered. Contact the school office.',
        'MOBILE_NOT_REGISTERED',
      );
    }
    if (user.status !== 'active') {
      throw AppException.forbidden('Your account is not active. Contact the school office.', 'ACCOUNT_INACTIVE');
    }
    return user;
  }
}
