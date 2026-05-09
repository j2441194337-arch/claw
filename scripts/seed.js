import { loadDb, saveDb } from '../src/services/db.js';

const db = loadDb();
if (!db.users.length) {
  db.users.push({
    id: 'u_seed_demo',
    name: 'seed-demo',
    apiKey: 'proxy_seed_demo_key',
    balance: 50,
    plan: 'basic',
    monthlyQuota: 500,
    usedThisMonth: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  });
  saveDb(db);
}
console.log('Seed complete');
