import { env } from '../utils/env.js';
import { appendLine, writeJson } from '../utils/file.js';
import { getDailyStats } from './billing.js';

export function logRequest(record) {
  appendLine(env.requestLogPath, JSON.stringify(record));
  writeJson(env.dailyStatsPath, getDailyStats());
}
