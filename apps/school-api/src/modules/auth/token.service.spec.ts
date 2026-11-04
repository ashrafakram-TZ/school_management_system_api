import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppException } from '@app/common';
import { AuthConfig } from '../../config/configuration';
import { FieldCipher } from '../security/field-cipher';
import { User } from '../users/entities/user.entity';
import { CentralAuthClient, CentralSessionEnded } from './central-auth.client';
import { UserSession } from './entities/user-session.entity';
import { TokenService } from './token.service';

const config = { accessSecret: 'y'.repeat(40), accessTtlSeconds: 900, refreshTtlDays: 30 } as AuthConfig;
const user = { id: 4, school_id: 1, status: 'active' } as User;

function setup(central: Partial<CentralAuthClient> = {}) {
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
  const cipher = new FieldCipher(Buffer.alloc(32, 7).toString('base64'));
  const service = new TokenService(
    repo as unknown as Repository<UserSession>,
    config,
    jwt,
    central as CentralAuthClient,
    cipher,
  );
  return { service, sessions, cipher };
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

describe('TokenService with the Auth Service', () => {
  const tokens = { accessToken: 'central-access-1', refreshToken: 'central-refresh-1' };

  it('keeps the Auth Service tokens encrypted on the session', async () => {
    const { service, sessions, cipher } = setup();
    const pair = await service.issue(user, {}, tokens);
    const stored = sessions.get(pair.session_id)!;
    expect(stored.central_refresh_enc).not.toContain('central-refresh-1');
    expect(cipher.decrypt(stored.central_refresh_enc!)).toBe('central-refresh-1');
  });

  it('refreshes the Auth Service tokens together with ours', async () => {
    const refresh = jest.fn(async () => ({ accessToken: 'central-access-2', refreshToken: 'central-refresh-2' }));
    const { service, sessions, cipher } = setup({ refresh });
    const first = await service.issue(user, {}, tokens);
    await service.rotate(first.refresh_token, async () => user);
    expect(refresh).toHaveBeenCalledWith('central-refresh-1');
    expect(cipher.decrypt(sessions.get(first.session_id)!.central_refresh_enc!)).toBe('central-refresh-2');
  });

  it('ends our session when the Auth Service says the sign-in has ended', async () => {
    const refresh = jest.fn(async () => {
      throw new CentralSessionEnded();
    });
    const { service, sessions } = setup({ refresh });
    const first = await service.issue(user, {}, tokens);
    expect(await code(service.rotate(first.refresh_token, async () => user))).toBe('SESSION_REVOKED');
    expect(sessions.get(first.session_id)!.revoked_at).toBeInstanceOf(Date);
  });

  it('keeps the session when the Auth Service is unreachable, so the app can retry', async () => {
    const refresh = jest.fn(async () => {
      throw AppException.unavailable('down', 'AUTH_SERVICE_UNAVAILABLE');
    });
    const { service, sessions } = setup({ refresh });
    const first = await service.issue(user, {}, tokens);
    expect(await code(service.rotate(first.refresh_token, async () => user))).toBe('AUTH_SERVICE_UNAVAILABLE');
    expect(sessions.get(first.session_id)!.revoked_at).toBeUndefined();
  });

  it('logs out at the Auth Service, refreshing first when its access token has expired', async () => {
    const logout = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const refresh = jest.fn(async () => ({ accessToken: 'central-access-2', refreshToken: 'central-refresh-2' }));
    const { service } = setup({ logout, refresh });
    const first = await service.issue(user, {}, tokens);
    await service.endCentral(first.session_id);
    expect(logout).toHaveBeenNthCalledWith(1, 'central-access-1');
    expect(logout).toHaveBeenNthCalledWith(2, 'central-access-2');
  });

  it('does not call the Auth Service for local sessions', async () => {
    const refresh = jest.fn();
    const logout = jest.fn();
    const { service } = setup({ refresh, logout });
    const first = await service.issue(user, {});
    await service.rotate(first.refresh_token, async () => user);
    await service.endCentral(first.session_id);
    expect(refresh).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});
