import { ROLES } from '../../modules/access/access.catalog';
import { normalizeMobile } from '../../shared/mobile';
import { argument, runSeed, seedCatalog, upsertUser } from './seed-helpers';

const mobile = String(normalizeMobile(argument('mobile') ?? ''));
const name = (argument('name') ?? '').trim();

if (!mobile || name.length < 2) {
  console.error('Usage: npm run seed:super-admin -- --mobile 9876543210 --name "Full Name"');
  process.exit(1);
}

runSeed('Super admin', async (manager) => {
  const roles = await seedCatalog(manager);
  const result = await upsertUser(manager, roles, null, { name, mobile, roles: [ROLES.SUPER_ADMIN] });
  console.log(`Super admin ${name} (${mobile}): ${result}. Not tied to any school; sees every school.`);
});
