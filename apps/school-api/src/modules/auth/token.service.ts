import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '@app/common';
import { authConfig, AuthConfig } from '../../config/configuration';
import { hmac, randomToken, safeEqual } from '../../shared/crypto';
import { User } from '../users/entities/user.entity';
import { TokenPairDto } from './dto/auth.dto';
import { UserSession } from './entities/user-session.entity';

export interface AccessPayload {
  sub: number;
  sid: number;
  sch: number | null;
}

export interface SessionInfo {
  app?: UserSession['app'];
  platform?: UserSession['platform'];
  device_name?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(UserSession) private readonly sessions: Repository<UserSession>,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly jwt: JwtService,
  ) {}

  async issue(user: User, info: SessionInfo): Promise<TokenPairDto & { session_id: number }> {
    const secret = randomToken();
    const session = await this.sessions.save(
      this.sessions.create({
        user_id: user.id,
        refresh_token_hash: 'pending',
        app: info.app ?? null,
        platform: info.platform ?? null,
        device_name: info.device_name ?? null,
        ip: info.ip ?? null,
        user_agent: info.user_agent?.slice(0, 255) ?? null,
        expires_at: this.refreshExpiry(),
        last_used_at: new Date(),
      }),
    );
    await this.sessions.update(session.id, { refresh_token_hash: this.hash(session.id, secret) });
    return { ...(await this.pair(user, session.id, secret, session.expires_at)), session_id: session.id };
  }

  async rotate(refreshToken: string, userLoader: (userId: number) => Promise<User | null>): Promise<TokenPairDto> {
    const [idPart, secret] = refreshToken.split('.', 2);
    const sessionId = Number(idPart);
    if (!Number.isInteger(sessionId) || sessionId <= 0 || !secret) {
      throw AppException.unauthorized('Your session is not valid. Sign in again.', 'SESSION_INVALID');
    }
    const session = await this.sessions.findOneBy({ id: sessionId });
    if (!session || session.revoked_at || session.expires_at.getTime() <= Date.now()) {
      throw AppException.unauthorized('Your session has ended. Sign in again.', 'SESSION_REVOKED');
    }
    if (!safeEqual(session.refresh_token_hash, this.hash(session.id, secret))) {
      await this.revoke(session.id);
      throw AppException.unauthorized('Your session has ended. Sign in again.', 'SESSION_REVOKED');
    }
    const user = await userLoader(session.user_id);
    if (!user || user.status !== 'active') {
      await this.revoke(session.id);
      throw AppException.unauthorized('Your account is not active. Contact the school office.', 'ACCOUNT_INACTIVE');
    }

    const next = randomToken();
    const expiresAt = this.refreshExpiry();
    await this.sessions.update(session.id, {
      refresh_token_hash: this.hash(session.id, next),
      expires_at: expiresAt,
      last_used_at: new Date(),
    });
    return this.pair(user, session.id, next, expiresAt);
  }

  async revoke(sessionId: number): Promise<void> {
    await this.sessions.update({ id: sessionId, revoked_at: IsNull() }, { revoked_at: new Date() });
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    try {
      return await this.jwt.verifyAsync<AccessPayload>(token);
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        throw AppException.unauthorized(
          'Your session has expired. Refresh the token or sign in again.',
          'TOKEN_EXPIRED',
        );
      }
      throw AppException.unauthorized('Invalid access token', 'TOKEN_INVALID');
    }
  }

  async activeSession(sessionId: number, userId: number): Promise<UserSession> {
    const session = await this.sessions.findOneBy({ id: sessionId, user_id: userId });
    if (!session || session.revoked_at || session.expires_at.getTime() <= Date.now()) {
      throw AppException.unauthorized('Your session has ended. Sign in again.', 'SESSION_REVOKED');
    }
    return session;
  }

  private async pair(user: User, sessionId: number, secret: string, refreshExpiresAt: Date): Promise<TokenPairDto> {
    const payload: AccessPayload = { sub: user.id, sid: sessionId, sch: user.school_id };
    return {
      access_token: await this.jwt.signAsync(payload),
      refresh_token: `${sessionId}.${secret}`,
      token_type: 'Bearer',
      expires_in: this.config.accessTtlSeconds,
      refresh_expires_at: refreshExpiresAt,
    };
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.config.refreshTtlDays * DAY_MS);
  }

  private hash(sessionId: number, secret: string): string {
    return hmac(this.config.accessSecret, `refresh:${sessionId}:${secret}`);
  }
}
