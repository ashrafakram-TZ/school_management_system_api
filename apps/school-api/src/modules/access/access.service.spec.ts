import { Repository } from 'typeorm';
import { PERMISSION_CATALOG } from './access.catalog';
import { AccessService } from './access.service';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from '../users/entities/user.entity';

const role = (code: string, app: Role['app'], sort: number, permissions: string[] = []): Role =>
  ({ code, app, sort_order: sort, permissions: permissions.map((code) => ({ code }) as Permission) }) as Role;

const userWith = (...roles: Role[]): User =>
  ({ id: 1, user_roles: roles.map((item) => ({ role: item })) }) as unknown as User;

describe('AccessService.describe', () => {
  const service = new AccessService({} as Repository<User>, {} as Repository<Role>, {} as Repository<Permission>);

  it('merges permissions from every role without duplicates', () => {
    const access = service.describe(
      userWith(
        role('AO', 'admin', 3, ['users.view', 'users.manage']),
        role('PRINCIPAL', 'admin', 2, ['users.view', 'fleet.view']),
      ),
    );
    expect(access.permissions).toEqual(['fleet.view', 'users.manage', 'users.view']);
    expect(access.roles.map((item) => item.code)).toEqual(['PRINCIPAL', 'AO']);
  });

  it('gives the super admin every permission', () => {
    const access = service.describe(userWith(role('SUPER_ADMIN', 'admin', 0)));
    expect(access.permissions).toEqual(PERMISSION_CATALOG.map((permission) => permission.code));
  });

  it('lists apps in a fixed order so a teacher who is also a parent sees both', () => {
    const access = service.describe(userWith(role('PARENT', 'parent', 7), role('TEACHER', 'staff', 6)));
    expect(access.apps).toEqual(['staff', 'parent']);
  });
});
