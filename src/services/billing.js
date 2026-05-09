import { config, env } from '../utils/env.js';
import { loadDb, saveDb } from './db.js';

export function estimateCharge(endpointType, payload = {}) {
  const base = config?.pricing?.[endpointType]?.base || 0.02;
  const markupRate = config?.pricing?.markupRate || env.defaultMarkupRate;
  const tokenFactor = Math.max(1, Math.ceil(((payload.max_tokens || payload.max_completion_tokens || 512) / 1000)));
  return Number((base * markupRate * tokenFactor).toFixed(4));
}

export function debitUser(userId, charge, usageRecord) {
  const db = loadDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error('User not found');
  if (Number(user.balance || 0) < charge) throw new Error('Insufficient balance');
  user.balance = Number((Number(user.balance) - charge).toFixed(4));
  user.usedThisMonth = Number((Number(user.usedThisMonth || 0) + charge).toFixed(4));
  db.usage.push(usageRecord);
  saveDb(db);
  return user;
}

export function getDailyStats() {
  const db = loadDb();
  const stats = {};
  for (const item of db.usage) {
    const day = item.timestamp.slice(0, 10);
    if (!stats[day]) {
      stats[day] = { requests: 0, revenue: 0 };
    }
    stats[day].requests += 1;
    stats[day].revenue = Number((stats[day].revenue + Number(item.charge || 0)).toFixed(4));
  }
  return stats;
}
