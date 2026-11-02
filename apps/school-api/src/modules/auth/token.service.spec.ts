import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppException } from '@app/common';
import { AuthConfig } from '../../config/configuration';
import { User } from '../users/entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { TokenService } from './token.service';

const config = { accessSecret: 'y'.repeat(40), accessTtlSeconds: 900, refreshTtlDays: 30 } as AuthConfig;
const user = { id: 4, school_id: 1, status: 'active' } as User;

function setup() {
  const sessions = new Map<number, Partial<UserSession>>();
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      const saved = { ...value, id: sessions.size + 1 };
      sessions.set(saved.id, saved);
      return saved;
    }),
    update: jest.fn(async (criteria: number | { id: number }, patch: Partial<UserSession>) => {
      const id = typeof criteria === 'number' ? criteria : criteria.id;
      const current = sessions.get(id);
      if (current && !(typeof criteria === 'object' && 'revoked_at' in criteria && current.revoked_at)) {
        sessions.set(id, { ...current, ...patch });
      }
    }),
    findOneBy: jest.fn(async ({ id }: { id: number }) => sessions.get(id) ?? null),
  };
  const jwt = new JwtService({ secret: config.accessSecret, signOptions: { expiresIn: config.accessTtlSeconds } });
  const service = new TokenService(repo as unknown as Repository<UserSession>, config, jwt);
  return { service, sessions };
}

const code = async (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: AppException) => (error.getResponse() as { code: string }).code,
  );

describe('TokenService', () => {
  it('issues a verifiable access token and a session-bound refresh token', async () => {
    const { service } = setup();
    const pair = await service.issue(user, { app: 'parent', platform: 'android' });
    expect(pair.refresh_token.startsWith(`${pair.session_id}.`)).toBe(true);
    expect(pair.expires_in).toBe(900);
    await expect(service.verifyAccess(pair.access_token)).resolves.toMatchObject({
      sub: 4,
      sid: pair.session_id,
      sch: 1,
    });
  });

  it('rotates the refresh token and revokes the session when an old one is reused', async () => {
    const { service, sessions } = setup();
    const first = await service.issue(user, {});
    const second = await service.rotate(first.refresh_token, async () => user);
    expect(second.refresh_token).not.toBe(first.refresh_token);

    expect(await code(service.rotate(first.refresh_token, async () => user))).toBe('SESSION_REVOKED');
    expect(sessions.get(first.session_id)?.revoked_at).toBeInstanceOf(Date);
    expect(await code(service.rotate(second.refresh_token, async () => user))).toBe('SESSION_REVOKED');
  });

  it('rejects malformed refresh tokens', async () => {
    const { service } = setup();
    expect(await code(service.rotate('nonsense', async () => user))).toBe('SESSION_INVALID');
  });

  it('ends the session when the user is no longer active', async () => {
    const { service } = setup();
    const pair = await service.issue(user, {});
    expect(await code(service.rotate(pair.refresh_token, async () => ({ ...user, status: 'inactive' }) as User))).toBe(
      'ACCOUNT_INACTIVE',
    );
  });

  it('reports an invalid access token', async () => {
    const { service } = setup();
    expect(await code(service.verifyAccess('abc'))).toBe('TOKEN_INVALID');
  });
});
