import { runSeed, seedCatalog } from './seed-helpers';

runSeed('Seed', async (manager) => {
  await seedCatalog(manager);
  console.log('Next: npm run seed:super-admin -- --mobile <10 digits> --name "<full name>"');
  console.log('Local demo data: npm run seed:demo');
});
