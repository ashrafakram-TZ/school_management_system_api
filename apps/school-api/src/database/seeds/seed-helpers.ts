import 'reflect-metadata';
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm';
import dataSource from '../data-source';
import { PERMISSION_CATALOG, ROLE_CATALOG, RoleCode, rolePermissions } from '../../modules/access/access.catalog';
import { Permission } from '../../modules/access/entities/permission.entity';
import { Role } from '../../modules/access/entities/role.entity';
import { NotificationTemplate } from '../../modules/notifications/entities/notification-template.entity';
import { TEMPLATE_CATALOG } from '../../modules/notifications/notification-templates.catalog';
import { UserRole } from '../../modules/users/entities/user-role.entity';
import { Language, User } from '../../modules/users/entities/user.entity';
import { MOBILE_PATTERN } from '../../shared/mobile';

export interface SeedUser {
  name: string;
  mobile: string;
  roles: RoleCode[];
  language?: Language;
}

export type RoleMap = Map<string, Role>;

export async function seedCatalog(manager: EntityManager): Promise<RoleMap> {
  for (const definition of PERMISSION_CATALOG) {
    await manager.upsert(Permission, { code: definition.code, name: definition.name, group_name: definition.group }, [
      'code',
    ]);
  }
  const permissions = new Map((await manager.find(Permission)).map((permission) => [permission.code, permission]));

  for (const [index, definition] of ROLE_CATALOG.entries()) {
    await manager.upsert(
      Role,
      {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        app: definition.app,
        is_system: true,
        sort_order: index,
      },
      ['code'],
    );
    const role = await manager.findOneOrFail(Role, {
      where: { code: definition.code },
      relations: { permissions: true },
    });
    role.permissions = rolePermissions(definition)
      .map((code) => permissions.get(code))
      .filter((permission): permission is Permission => Boolean(permission));
    await manager.save(role);
  }

  let templates = 0;
  for (const definition of TEMPLATE_CATALOG) {
    for (const [language, text] of Object.entries(definition.text) as [Language, (typeof definition.text)['en']][]) {
      const existing = await manager.findOneBy(NotificationTemplate, { code: definition.code, language });
      await manager.save(
        manager.merge(NotificationTemplate, existing ?? manager.create(NotificationTemplate), {
          code: definition.code,
          language,
          category: definition.category,
          title: text.title,
          body: text.body,
          sms_body: text.sms_body,
          push: definition.push,
          sms: definition.sms,
          critical: definition.critical,
          is_active: true,
        }),
      );
      templates += 1;
    }
  }

  const roles = new Map((await manager.find(Role)).map((role) => [role.code, role]));
  console.log(`Catalog: ${permissions.size} permissions, ${roles.size} roles, ${templates} templates`);
  return roles;
}

export async function upsertUser(
  manager: EntityManager,
  roles: RoleMap,
  schoolId: number | null,
  seed: SeedUser,
): Promise<'created' | 'updated'> {
  if (!MOBILE_PATTERN.test(seed.mobile)) throw new Error(`${seed.mobile} is not a valid 10-digit Indian mobile number`);
  const roleIds = seed.roles.map((code) => {
    const role = roles.get(code);
    if (!role) throw new Error(`Role ${code} does not exist`);
    return role.id;
  });

  const existing = await manager.findOneBy(User, { mobile: seed.mobile, deleted_at: IsNull() });
  const user = await manager.save(
    manager.merge(User, existing ?? manager.create(User), {
      school_id: schoolId,
      name: seed.name,
      mobile: seed.mobile,
      status: 'active',
      language: seed.language ?? existing?.language ?? 'en',
    }),
  );
  await manager.delete(UserRole, { user_id: user.id, role_id: Not(In(roleIds)) });
  for (const roleId of roleIds) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserRole)
      .values({ user_id: user.id, role_id: roleId })
      .orIgnore()
      .execute();
  }
  return existing ? 'updated' : 'created';
}

export function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function runSeed(name: string, work: (manager: EntityManager) => Promise<void>): void {
  const run = async (source: DataSource) => {
    await source.initialize();
    try {
      await source.transaction(work);
    } finally {
      await source.destroy();
    }
  };
  run(dataSource)
    .then(() => console.log(`${name} complete`))
    .catch((error: Error) => {
      console.error(`${name} failed: ${error.message}`);
      process.exit(1);
    });
}
