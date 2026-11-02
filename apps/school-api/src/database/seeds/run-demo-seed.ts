import { IsNull } from 'typeorm';
import { School } from '../../modules/schools/entities/school.entity';
import { DEMO_PLATFORM_USERS, DEMO_SCHOOL, DEMO_SCHOOL_USERS } from './demo.data';
import { runSeed, seedCatalog, upsertUser } from './seed-helpers';

if (process.env.NODE_ENV === 'production') {
  console.error('Demo data is for local and test databases only. It is refused when NODE_ENV=production.');
  process.exit(1);
}

runSeed('Demo seed', async (manager) => {
  const roles = await seedCatalog(manager);

  for (const seed of DEMO_PLATFORM_USERS) {
    const result = await upsertUser(manager, roles, null, seed);
    console.log(`Platform  ${seed.mobile}  ${seed.name.padEnd(24)} ${seed.roles.join('+')}: ${result}`);
  }

  const existing = await manager.findOneBy(School, { code: DEMO_SCHOOL.code, deleted_at: IsNull() });
  const school = existing ?? (await manager.save(manager.create(School, DEMO_SCHOOL)));
  console.log(`School    ${school.code}  ${school.name} (#${school.id}): ${existing ? 'kept' : 'created'}`);

  for (const seed of DEMO_SCHOOL_USERS) {
    const result = await upsertUser(manager, roles, school.id, seed);
    console.log(`${school.code}      ${seed.mobile}  ${seed.name.padEnd(24)} ${seed.roles.join('+')}: ${result}`);
  }
});
