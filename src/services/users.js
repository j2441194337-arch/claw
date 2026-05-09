import { loadDb } from './db.js';

export function getUserByApiKey(apiKey) {
  const db = loadDb();
  return db.users.find((user) => user.apiKey === apiKey && user.isActive);
}

export function requirePositiveBalance(user) {
  return Number(user.balance || 0) > 0;
}
