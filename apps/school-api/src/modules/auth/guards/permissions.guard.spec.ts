import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException, AuthUser, IS_PUBLIC, REQUIRED_PERMISSIONS, REQUIRED_ROLES } from '@app/common';
import { PermissionsGuard } from './permissions.guard';

function context(user: Partial<AuthUser> | undefined): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guard(meta: Record<string, unknown>) {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

describe('PermissionsGuard', () => {
  const teacher = { roles: ['TEACHER'], permissions: [] };
  const ao = { roles: ['AO'], permissions: ['users.view', 'users.manage'] };

  it('allows routes without requirements', () => {
    expect(guard({}).canActivate(context(teacher))).toBe(true);
  });

  it('allows public routes without a user', () => {
    expect(guard({ [IS_PUBLIC]: true, [REQUIRED_PERMISSIONS]: ['users.view'] }).canActivate(context(undefined))).toBe(
      true,
    );
  });

  it('requires every listed permission', () => {
    expect(guard({ [REQUIRED_PERMISSIONS]: ['users.view', 'users.manage'] }).canActivate(context(ao))).toBe(true);
    expect(() => guard({ [REQUIRED_PERMISSIONS]: ['fleet.view'] }).canActivate(context(ao))).toThrow(AppException);
  });

  it('accepts any one of the listed roles', () => {
    expect(guard({ [REQUIRED_ROLES]: ['PARENT', 'TEACHER'] }).canActivate(context(teacher))).toBe(true);
    expect(() => guard({ [REQUIRED_ROLES]: ['DRIVER'] }).canActivate(context(teacher))).toThrow(AppException);
  });
});
